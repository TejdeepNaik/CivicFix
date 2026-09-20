"""Comprehensive test suite for AI Services, pgvector Duplicate Detector, and Analyze Endpoint."""

import uuid
import pytest
from unittest.mock import patch, MagicMock
import httpx
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.db.database import SessionLocal
from backend.app.services.ai.mock import MockAIService
from backend.app.services.ai.openai_provider import OpenAIAIService
from backend.app.services.ai.factory import get_ai_service
from backend.app.services.ai.duplicate_detector import (
    find_duplicate_complaints,
    calculate_haversine_distance_meters,
    cosine_similarity
)
from backend.app.models.complaint import (
    Complaint,
    ComplaintStatusEnum,
    ComplaintPriorityEnum,
    ComplaintCategoryEnum
)
from backend.app.models.user import User
from backend.app.models.role import RoleEnum
from backend.app.core.security import create_access_token, get_password_hash

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(db_session):
    email = f"ai_test_user_{uuid.uuid4().hex[:8]}@example.com"
    user = User(
        email=email,
        hashed_password=get_password_hash("password123"),
        full_name="AI Test User",
        role=RoleEnum.CITIZEN,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def second_user(db_session):
    email = f"ai_user2_{uuid.uuid4().hex[:8]}@example.com"
    user = User(
        email=email,
        hashed_password=get_password_hash("password123"),
        full_name="Second AI User",
        role=RoleEnum.CITIZEN,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# Edge Case 1: Exactly 384-dimensional embedding check
def test_exact_384_dimensional_embedding():
    mock_service = MockAIService()
    emb = mock_service.generate_embedding("Pothole on Main Street")
    assert len(emb) == 384
    assert isinstance(emb, list)
    assert all(isinstance(x, float) for x in emb)


# Edge Case 2: OpenAI malformed JSON response handling
@patch("httpx.Client.post")
def test_openai_malformed_json_handling(mock_post):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "This is invalid JSON format text"}}]
    }
    mock_post.return_value = mock_resp

    provider = OpenAIAIService(api_key="sk-test-key-1234567890")
    result = provider.suggest_category_and_priority("Road issue", "Pothole description")
    # Must fallback gracefully to MockAIService without crashing
    assert "suggested_category" in result
    assert "suggested_priority" in result


# Edge Case 3 & 4: OpenAI invalid category and priority enum values
@patch("httpx.Client.post")
def test_openai_invalid_category_and_priority_enums(mock_post):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": '{"category": "alien_invasion", "priority": "super_catastrophic", "confidence": 0.9}'}}]
    }
    mock_post.return_value = mock_resp

    provider = OpenAIAIService(api_key="sk-test-key-1234567890")
    result = provider.suggest_category_and_priority("Alien Sighting", "Unidentified flying object")
    # Must safely map invalid category to OTHER and invalid priority to MEDIUM
    assert result["suggested_category"] == ComplaintCategoryEnum.OTHER
    assert result["suggested_priority"] == ComplaintPriorityEnum.MEDIUM


# Edge Case 5: OpenAI HTTP timeout handling
@patch("httpx.Client.post")
def test_openai_timeout_handling(mock_post):
    mock_post.side_effect = httpx.TimeoutException("Connection timed out")

    provider = OpenAIAIService(api_key="sk-test-key-1234567890")
    emb = provider.generate_embedding("Pothole issue")
    assert len(emb) == 384

    result = provider.suggest_category_and_priority("Pothole", "Deep hole in road")
    assert "suggested_category" in result

    summary = provider.generate_summary("Pothole", "Deep hole in road")
    assert "Pothole" in summary


# Edge Case 6: OpenAI 500 API failure handling
@patch("httpx.Client.post")
def test_openai_500_server_error_handling(mock_post):
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_post.return_value = mock_resp

    provider = OpenAIAIService(api_key="sk-test-key-1234567890")
    emb = provider.generate_embedding("Streetlight issue")
    assert len(emb) == 384

    result = provider.suggest_category_and_priority("Light dark", "Broken lamp")
    assert "suggested_category" in result


# Edge Case 7: Missing API key handling
def test_missing_api_key_fallback():
    provider_no_key = OpenAIAIService(api_key="")
    emb = provider_no_key.generate_embedding("Test issue")
    assert len(emb) == 384

    provider_placeholder = OpenAIAIService(api_key="change-this-ai-api-key")
    result = provider_placeholder.suggest_category_and_priority("Garbage trash", "Uncollected waste")
    assert result["suggested_category"] == ComplaintCategoryEnum.GARBAGE


# Edge Case 8: NULL candidate embedding handling
def test_null_candidate_embedding_autopopulate(db_session, test_user):
    target = Complaint(
        citizen_id=test_user.id,
        title="Null Candidate Target Issue",
        description="Target complaint for null candidate test",
        category=ComplaintCategoryEnum.WATER_LEAK,
        priority=ComplaintPriorityEnum.HIGH,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=17.1000,
        longitude=76.1000
    )
    db_session.add(target)

    candidate_null = Complaint(
        citizen_id=test_user.id,
        title="Null Candidate Leaking Water",
        description="Candidate complaint with null embedding",
        category=ComplaintCategoryEnum.WATER_LEAK,
        priority=ComplaintPriorityEnum.HIGH,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=17.1005,
        longitude=76.1005,
        embedding=None  # Explicitly NULL
    )
    db_session.add(candidate_null)
    db_session.commit()

    res = find_duplicate_complaints(db_session, target, similarity_threshold=0.50)
    db_session.refresh(candidate_null)
    assert candidate_null.embedding is not None
    assert len(candidate_null.embedding) == 384


# Edge Case 9: Zero candidate complaints handling
def test_zero_candidate_complaints(db_session, test_user):
    lat, lon = -89.9000, -179.9000
    db_session.query(Complaint).filter(Complaint.latitude == lat, Complaint.longitude == lon).delete()
    db_session.commit()

    target = Complaint(
        citizen_id=test_user.id,
        title="Isolated Complaint Remote South Pole Unique",
        description="No other complaints exist nearby anywhere in the south pole",
        category=ComplaintCategoryEnum.OTHER,
        priority=ComplaintPriorityEnum.LOW,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=lat,
        longitude=lon
    )
    db_session.add(target)
    db_session.commit()

    res = find_duplicate_complaints(db_session, target)
    assert res["is_duplicate_likely"] is False
    assert res["potential_duplicates"] == []


# Edge Case 10: Duplicate at threshold boundary check
def test_duplicate_at_threshold_boundary(db_session, test_user):
    lat_target, lon_target = 81.1000, 171.1000
    db_session.query(Complaint).filter(Complaint.latitude >= 81.0, Complaint.longitude >= 171.0).delete()
    db_session.commit()

    shared_text = "Boundary Threshold Target Unique Drainage Issue"
    target = Complaint(
        citizen_id=test_user.id,
        title=shared_text,
        description=shared_text,
        category=ComplaintCategoryEnum.DRAINAGE,
        priority=ComplaintPriorityEnum.MEDIUM,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=lat_target,
        longitude=lon_target
    )
    db_session.add(target)
    db_session.commit()

    cand = Complaint(
        citizen_id=test_user.id,
        title=shared_text,
        description=shared_text,
        category=ComplaintCategoryEnum.DRAINAGE,
        priority=ComplaintPriorityEnum.MEDIUM,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=lat_target + 0.0002,
        longitude=lon_target + 0.0002
    )
    db_session.add(cand)
    db_session.commit()

    # Query with low threshold 0.10 -> Candidate must be returned
    res = find_duplicate_complaints(db_session, target, similarity_threshold=0.10)
    assert res["is_duplicate_likely"] is True
    assert any(item["complaint_id"] == str(cand.id) for item in res["potential_duplicates"])


# Edge Case 11: Candidate outside geographic radius exclusion
def test_geographic_radius_exclusion(db_session, test_user):
    target = Complaint(
        citizen_id=test_user.id,
        title="Bangalore City Center Pothole",
        description="Pothole in city center",
        category=ComplaintCategoryEnum.POTHOLE,
        priority=ComplaintPriorityEnum.HIGH,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=12.9716,
        longitude=77.5946
    )
    db_session.add(target)

    far_cand = Complaint(
        citizen_id=test_user.id,
        title="Mysore City Pothole identical text",
        description="Pothole in city center",  # Identical description
        category=ComplaintCategoryEnum.POTHOLE,
        priority=ComplaintPriorityEnum.HIGH,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=12.2958,  # ~140 km away in Mysore
        longitude=76.6394
    )
    db_session.add(far_cand)
    db_session.commit()

    res = find_duplicate_complaints(db_session, target, max_distance_km=5.0)
    returned_ids = [d["complaint_id"] for d in res["potential_duplicates"]]
    assert str(far_cand.id) not in returned_ids


# Edge Case 12: Category matching boost score bounding (sim_score <= 1.0)
def test_category_matching_boost_score_bounding(db_session, test_user):
    target = Complaint(
        citizen_id=test_user.id,
        title="Traffic Signal Fault",
        description="Red light stuck on junction",
        category=ComplaintCategoryEnum.TRAFFIC_SIGNAL,
        priority=ComplaintPriorityEnum.CRITICAL,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=19.1000,
        longitude=73.1000
    )
    db_session.add(target)

    identical_cand = Complaint(
        citizen_id=test_user.id,
        title="Traffic Signal Fault",
        description="Red light stuck on junction",
        category=ComplaintCategoryEnum.TRAFFIC_SIGNAL,
        priority=ComplaintPriorityEnum.CRITICAL,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=19.1000,
        longitude=73.1000
    )
    db_session.add(identical_cand)
    db_session.commit()

    res = find_duplicate_complaints(db_session, target, similarity_threshold=0.10)
    for dup in res["potential_duplicates"]:
        assert 0.0 <= dup["similarity_score"] <= 1.0


# Edge Case 13: Target complaint self-exclusion
def test_target_complaint_self_exclusion(db_session, test_user):
    target = Complaint(
        citizen_id=test_user.id,
        title="Self Exclusion Test Issue",
        description="Ensure target is never listed in own duplicates",
        category=ComplaintCategoryEnum.NOISE_POLLUTION,
        priority=ComplaintPriorityEnum.LOW,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=20.1000,
        longitude=72.1000
    )
    db_session.add(target)
    db_session.commit()

    res = find_duplicate_complaints(db_session, target, similarity_threshold=0.01)
    returned_ids = [d["complaint_id"] for d in res["potential_duplicates"]]
    assert str(target.id) not in returned_ids


# Edge Case 14: Repeated analysis reusing existing embedding
def test_repeated_analysis_reuses_existing_embedding(db_session, test_user):
    target = Complaint(
        citizen_id=test_user.id,
        title="Caching Embedding Test",
        description="Verify existing embedding is preserved across repeated calls",
        category=ComplaintCategoryEnum.OTHER,
        priority=ComplaintPriorityEnum.MEDIUM,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=21.1000,
        longitude=71.1000
    )
    db_session.add(target)
    db_session.commit()

    # Pre-generate embedding
    ai_service = get_ai_service()
    existing_vec = ai_service.generate_embedding("Caching Embedding Test")
    target.embedding = existing_vec
    db_session.add(target)
    db_session.commit()

    # Execute duplicate detection
    res = find_duplicate_complaints(db_session, target)
    db_session.refresh(target)
    assert list(target.embedding) == list(existing_vec)


# Edge Case 15: Analyze endpoint authentication and success flow
def test_analyze_endpoint_full_flow(db_session, test_user):
    complaint = Complaint(
        citizen_id=test_user.id,
        title="Noise Pollution Near Hospital Zone",
        description="Loud speakers operating late night near hospital ward",
        category=ComplaintCategoryEnum.NOISE_POLLUTION,
        priority=ComplaintPriorityEnum.HIGH,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=22.1000,
        longitude=70.1000
    )
    db_session.add(complaint)
    db_session.commit()

    token = create_access_token(subject=str(test_user.id))
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(f"{settings.API_V1_STR}/complaints/{complaint.id}/analyze", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["complaint_id"] == str(complaint.id)
    assert data["suggested_category"] in [c.value for c in ComplaintCategoryEnum]
    assert data["suggested_priority"] in [p.value for p in ComplaintPriorityEnum]
    assert isinstance(data["summary"], str)
    assert isinstance(data["is_duplicate_likely"], bool)
    assert isinstance(data["potential_duplicates"], list)


def test_analyze_image_endpoint_with_user_context(test_user):
    token = create_access_token(subject=str(test_user.id))
    headers = {"Authorization": f"Bearer {token}"}

    # Dummy 1x1 GIF / JPEG image bytes
    dummy_image = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xafA4\x00\x00\x00\x00IEND\xaeB`\x82"
    files = {"file": ("test.png", dummy_image, "image/png")}
    data = {"user_context": "Deep pothole causing traffic slowdown"}

    res = client.post(
        f"{settings.API_V1_STR}/complaints/analyze-image?latitude=41.8781&longitude=-87.6298",
        files=files,
        data=data,
        headers=headers
    )
    assert res.status_code == 200
    res_data = res.json()
    assert "evidence_url" in res_data
    assert "analysis_available" in res_data

