"""Unit and Integration Tests for Persistent Issue Clusters, Image Similarity, and Priority Escalation."""

import io
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.database import SessionLocal
from backend.app.models.complaint import (
    Complaint,
    ComplaintStatusEnum,
    ComplaintPriorityEnum,
    ComplaintCategoryEnum,
)
from backend.app.models.cluster import IssueCluster
from backend.app.models.user import User
from backend.app.models.role import RoleEnum
from backend.app.core.security import create_access_token, get_password_hash
from backend.app.services.ai.duplicate_detector import (
    calculate_cluster_priority,
    assign_or_create_cluster,
    find_duplicate_complaints,
)
from backend.app.services.ai.mock import MockAIService

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
    email = f"cluster_user_{uuid.uuid4().hex[:8]}@example.com"
    user = User(
        email=email,
        hashed_password=get_password_hash("password123"),
        full_name="Cluster Test User",
        role=RoleEnum.CITIZEN,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def user_token(test_user):
    # create_access_token(subject, claims=None, expires_delta=None)
    return create_access_token(
        subject=str(test_user.id),
        claims={"role": test_user.role.value}
    )


# ── Pure priority escalation logic (no DB required) ──────────────────────────

def test_priority_escalation_low_stays_low():
    p = calculate_cluster_priority(ComplaintPriorityEnum.LOW, 1, density_count=1)
    assert p == ComplaintPriorityEnum.LOW


def test_priority_escalation_low_to_medium():
    p = calculate_cluster_priority(ComplaintPriorityEnum.LOW, 3, density_count=3)
    assert p == ComplaintPriorityEnum.MEDIUM


def test_priority_escalation_to_high():
    p = calculate_cluster_priority(ComplaintPriorityEnum.LOW, 5, density_count=5)
    assert p == ComplaintPriorityEnum.HIGH


def test_priority_escalation_to_critical():
    p = calculate_cluster_priority(ComplaintPriorityEnum.MEDIUM, 10, density_count=10)
    assert p == ComplaintPriorityEnum.CRITICAL


def test_priority_escalation_critical_base_stays_critical():
    p = calculate_cluster_priority(ComplaintPriorityEnum.CRITICAL, 1, density_count=1)
    assert p == ComplaintPriorityEnum.CRITICAL


# ── Image embedding generation ───────────────────────────────────────────────

def test_image_embedding_generation():
    mock_ai = MockAIService()
    text_emb = mock_ai.generate_embedding("Pothole on 5th Avenue")
    img_emb = mock_ai.generate_image_embedding("http://localhost:8000/static/uploads/test.png")

    assert len(text_emb) == 384
    assert len(img_emb) == 384
    assert isinstance(text_emb, list)
    assert isinstance(img_emb, list)


def test_image_embedding_none_for_empty_input():
    mock_ai = MockAIService()
    result = mock_ai.generate_image_embedding("")
    assert result is None


def test_image_embedding_differs_from_text_embedding():
    """Image and text embeddings should produce distinct vectors."""
    mock_ai = MockAIService()
    text_emb = mock_ai.generate_embedding("Pothole on 5th Avenue")
    img_emb = mock_ai.generate_image_embedding("http://localhost:8000/static/uploads/test.png")
    # They must not be identical
    assert text_emb != img_emb


# ── Upload evidence endpoint ──────────────────────────────────────────────────

def test_image_upload_endpoint_valid_file(user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    # Generate a real 1x1 red pixel PNG using Pillow so image preprocessing succeeds
    from PIL import Image as PILImage
    img_buffer = io.BytesIO()
    img = PILImage.new("RGB", (1, 1), color=(255, 0, 0))
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)
    file_content = img_buffer.read()

    files = {"file": ("test_photo.png", io.BytesIO(file_content), "image/png")}

    response = client.post("/api/v1/complaints/upload-evidence", headers=headers, files=files)
    assert response.status_code == 200
    data = response.json()
    assert "evidence_url" in data
    assert data["evidence_url"].startswith("/static/uploads/")


def test_image_upload_endpoint_invalid_mime(user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    files = {"file": ("script.sh", io.BytesIO(b"echo hello"), "text/plain")}

    response = client.post("/api/v1/complaints/upload-evidence", headers=headers, files=files)
    assert response.status_code == 400
    # The endpoint returns "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
    assert response.status_code == 400


def test_image_upload_requires_auth():
    files = {"file": ("photo.png", io.BytesIO(b"\x89PNG"), "image/png")}
    response = client.post("/api/v1/complaints/upload-evidence", files=files)
    assert response.status_code in (401, 403)


# ── Cluster assignment (requires live DB) ────────────────────────────────────

@pytest.mark.skip(reason="Requires live PostgreSQL with pgvector extension")
def test_assign_or_create_cluster_and_analyze_api(db_session, test_user, user_token):
    mock_ai = MockAIService()

    # Create primary complaint
    c1 = Complaint(
        citizen_id=test_user.id,
        title="Pothole near Park Entrance",
        description="Deep pothole causing traffic hazard near West Park entrance.",
        category=ComplaintCategoryEnum.POTHOLE,
        status=ComplaintStatusEnum.SUBMITTED,
        priority=ComplaintPriorityEnum.MEDIUM,
        latitude=37.7749,
        longitude=-122.4194,
        address="100 West Park",
        evidence_url="/static/uploads/pothole1.jpg",
        image_embedding=mock_ai.generate_image_embedding("/static/uploads/pothole1.jpg"),
    )
    db_session.add(c1)
    db_session.commit()
    db_session.refresh(c1)

    # Assign cluster — signature: (db, complaint)
    clst = assign_or_create_cluster(db_session, c1)
    assert clst is not None
    assert c1.cluster_id == clst.id
    assert clst.report_count == 1

    # Call analyze endpoint
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.post(f"/api/v1/complaints/{c1.id}/analyze", headers=headers)
    assert response.status_code == 200
    res_json = response.json()

    assert "cluster_id" in res_json
    assert res_json["cluster_id"] == str(clst.id)
    assert res_json["cluster_report_count"] == 1
    assert "cluster_priority" in res_json
    assert "suggested_category" in res_json
    assert "potential_duplicates" in res_json
