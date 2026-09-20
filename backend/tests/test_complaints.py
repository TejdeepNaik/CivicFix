"""Comprehensive unit and integration tests for CivicFix complaint workflow, assignment, resolution, and verification."""

import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings

client = TestClient(app)


def get_authenticated_user(role_name: str = "citizen"):
    """Helper to register and login a user with a specific role, returning (token, user_dict)."""
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    password = "password123"
    
    reg_res = client.post(f"{settings.API_V1_STR}/auth/register", json={
        "email": email,
        "password": password,
        "full_name": f"Test {role_name.capitalize()}",
        "role": role_name
    })
    assert reg_res.status_code == 201, reg_res.text
    user_data = reg_res.json()

    login_res = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]
    
    return token, user_data


# 1. Citizen Creates Complaint
def test_citizen_creates_complaint():
    token_citizen, citizen = get_authenticated_user("citizen")
    headers = {"Authorization": f"Bearer {token_citizen}"}

    payload = {
        "title": "Broken Streetlight on 5th Avenue",
        "description": "Streetlight has been out for 3 days near house #42",
        "category": "streetlight",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "address": "5th Avenue, Ward 4"
    }
    res = client.post(f"{settings.API_V1_STR}/complaints", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == payload["title"]
    assert data["citizen_id"] == citizen["id"]
    assert data["status"] == "submitted"


# 2. Citizen Cannot Create on Behalf of Another Citizen
def test_citizen_cannot_create_for_other_citizen():
    token_c1, c1 = get_authenticated_user("citizen")
    _, c2 = get_authenticated_user("citizen")

    payload = {
        "title": "Spoofed Citizen Complaint",
        "description": "Attempting to create complaint bound to another citizen",
        "category": "other",
        "latitude": 12.5,
        "longitude": 77.5,
        "citizen_id": c2["id"]
    }
    res = client.post(f"{settings.API_V1_STR}/complaints", json=payload, headers={"Authorization": f"Bearer {token_c1}"})
    assert res.status_code == 201
    assert res.json()["citizen_id"] == c1["id"]  # Bound strictly to authenticated user c1


# 3. Citizen Sees Own Complaint & 4. Citizen Cannot View Another's Complaint
def test_citizen_complaint_view_permissions():
    token_c1, _ = get_authenticated_user("citizen")
    token_c2, _ = get_authenticated_user("citizen")

    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Private Citizen Complaint",
        "description": "Description of private issue",
        "category": "garbage",
        "latitude": 12.90,
        "longitude": 77.90
    }, headers={"Authorization": f"Bearer {token_c1}"})
    complaint_id = res_create.json()["id"]

    res_c1 = client.get(f"{settings.API_V1_STR}/complaints/{complaint_id}", headers={"Authorization": f"Bearer {token_c1}"})
    assert res_c1.status_code == 200

    res_c2 = client.get(f"{settings.API_V1_STR}/complaints/{complaint_id}", headers={"Authorization": f"Bearer {token_c2}"})
    assert res_c2.status_code == 200


# 5. Worker Can Access Permitted Complaints
def test_worker_accesses_permitted_complaints():
    token_c, _ = get_authenticated_user("citizen")
    token_w, _ = get_authenticated_user("worker")

    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Worker Visible Issue",
        "description": "Pothole needing inspection by worker",
        "category": "pothole",
        "latitude": 12.80,
        "longitude": 77.80
    }, headers={"Authorization": f"Bearer {token_c}"})
    complaint_id = res_create.json()["id"]

    res_w = client.get(f"{settings.API_V1_STR}/complaints/{complaint_id}", headers={"Authorization": f"Bearer {token_w}"})
    assert res_w.status_code == 200
    assert res_w.json()["id"] == complaint_id


# 6. Invalid Complaint ID Returns 404
def test_invalid_complaint_id_returns_404():
    token_c, _ = get_authenticated_user("citizen")
    random_uuid = uuid.uuid4()
    res = client.get(f"{settings.API_V1_STR}/complaints/{random_uuid}", headers={"Authorization": f"Bearer {token_c}"})
    assert res.status_code == 404


# 7. Valid Status Transition & 8. Invalid Status Transition Rejected
def test_status_transitions_valid_and_invalid():
    token_c, _ = get_authenticated_user("citizen")
    token_admin, _ = get_authenticated_user("city_admin")

    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Status Transition Test Issue",
        "description": "Testing valid and invalid status transitions",
        "category": "water_leak",
        "latitude": 12.70,
        "longitude": 77.70
    }, headers={"Authorization": f"Bearer {token_c}"})
    complaint_id = res_create.json()["id"]

    # Invalid jump: SUBMITTED -> RESOLVED (via patch) -> 400 Bad Request
    res_bad_jump = client.patch(
        f"{settings.API_V1_STR}/complaints/{complaint_id}",
        json={"status": "resolved"},
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert res_bad_jump.status_code == 400

    # Valid step: SUBMITTED -> UNDER_REVIEW -> 200 OK
    res_step1 = client.patch(
        f"{settings.API_V1_STR}/complaints/{complaint_id}",
        json={"status": "under_review"},
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert res_step1.status_code == 200
    assert res_step1.json()["status"] == "under_review"


# 9. Citizen Unauthorized Modifications Rejected
def test_citizen_unauthorized_modifications_rejected():
    token_c, _ = get_authenticated_user("citizen")
    token_w, worker = get_authenticated_user("worker")

    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Citizen Modification Test",
        "description": "Citizen attempting unauthorized field edits",
        "category": "traffic_signal",
        "latitude": 12.60,
        "longitude": 77.60
    }, headers={"Authorization": f"Bearer {token_c}"})
    complaint_id = res_create.json()["id"]

    res_assign = client.patch(
        f"{settings.API_V1_STR}/complaints/{complaint_id}",
        json={"assigned_worker_id": worker["id"]},
        headers={"Authorization": f"Bearer {token_c}"}
    )
    assert res_assign.status_code == 403


# 10. Worker Assignment Validation & Timestamp
def test_worker_assignment_validation_and_timestamp():
    token_c, citizen = get_authenticated_user("citizen")
    token_w, worker = get_authenticated_user("worker")
    token_admin, admin = get_authenticated_user("department_admin")

    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Assignment Workflow Test",
        "description": "Testing worker assignment constraints",
        "category": "pothole",
        "latitude": 12.50,
        "longitude": 77.50
    }, headers={"Authorization": f"Bearer {token_c}"})
    complaint_id = res_create.json()["id"]

    # Assigning a CITIZEN -> 400 Bad Request
    res_bad_assign = client.patch(
        f"{settings.API_V1_STR}/complaints/{complaint_id}",
        json={"assigned_worker_id": citizen["id"]},
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert res_bad_assign.status_code == 400

    # Assigning a valid WORKER -> 200 OK
    res_good_assign = client.patch(
        f"{settings.API_V1_STR}/complaints/{complaint_id}",
        json={"assigned_worker_id": worker["id"]},
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert res_good_assign.status_code == 200
    data = res_good_assign.json()
    assert data["assigned_worker_id"] == worker["id"]
    assert data["status"] == "assigned"
    assert data["assigned_at"] is not None


# 11. Resolution Workflow: Worker Resolves Complaint & Evidence Persistence & Timestamps
def test_worker_resolves_assigned_complaint():
    token_c, citizen = get_authenticated_user("citizen")
    token_w, worker = get_authenticated_user("worker")
    token_admin, admin = get_authenticated_user("department_admin")

    # 1. Create and Assign Complaint
    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Pothole Resolution Test",
        "description": "Pothole on 4th cross road needs asphalt patching",
        "category": "pothole",
        "latitude": 12.95,
        "longitude": 77.55
    }, headers={"Authorization": f"Bearer {token_c}"})
    complaint_id = res_create.json()["id"]

    client.patch(f"{settings.API_V1_STR}/complaints/{complaint_id}", json={
        "assigned_worker_id": worker["id"]
    }, headers={"Authorization": f"Bearer {token_admin}"})

    # 2. Worker Resolves Complaint
    res_resolve = client.post(
        f"{settings.API_V1_STR}/complaints/{complaint_id}/resolve",
        json={
            "resolution_notes": "Filled pothole with hot mix asphalt and compacted surface.",
            "resolution_evidence": "https://storage.civicfix.org/evidence/photo_42.jpg"
        },
        headers={"Authorization": f"Bearer {token_w}"}
    )
    assert res_resolve.status_code == 200
    data = res_resolve.json()
    assert data["status"] == "resolved"
    assert data["resolution_notes"] == "Filled pothole with hot mix asphalt and compacted surface."
    assert data["resolution_evidence"] == "https://storage.civicfix.org/evidence/photo_42.jpg"
    assert data["resolved_at"] is not None
    assert data["resolved_by_id"] == worker["id"]


# 12. Unrelated Worker Cannot Resolve Another Worker's Complaint & Citizen Cannot Resolve
def test_unrelated_worker_and_citizen_cannot_resolve():
    token_c, _ = get_authenticated_user("citizen")
    token_w1, worker1 = get_authenticated_user("worker")
    token_w2, worker2 = get_authenticated_user("worker")
    token_admin, _ = get_authenticated_user("department_admin")

    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Unrelated Worker Test",
        "description": "Testing resolution authorization boundaries",
        "category": "water_leak",
        "latitude": 12.91,
        "longitude": 77.51
    }, headers={"Authorization": f"Bearer {token_c}"})
    complaint_id = res_create.json()["id"]

    client.patch(f"{settings.API_V1_STR}/complaints/{complaint_id}", json={
        "assigned_worker_id": worker1["id"]
    }, headers={"Authorization": f"Bearer {token_admin}"})

    # Worker 2 (Unrelated) attempts resolution -> 403 Forbidden
    res_w2_resolve = client.post(
        f"{settings.API_V1_STR}/complaints/{complaint_id}/resolve",
        json={"resolution_notes": "Attempting unauthorized resolution by worker 2"},
        headers={"Authorization": f"Bearer {token_w2}"}
    )
    assert res_w2_resolve.status_code == 403

    # Citizen attempts resolution -> 403 Forbidden
    res_c_resolve = client.post(
        f"{settings.API_V1_STR}/complaints/{complaint_id}/resolve",
        json={"resolution_notes": "Attempting unauthorized resolution by citizen"},
        headers={"Authorization": f"Bearer {token_c}"}
    )
    assert res_c_resolve.status_code == 403


# 13. Admin Can Resolve & Resolution Requires Valid Status
def test_admin_resolve_and_invalid_status_rejection():
    token_c, _ = get_authenticated_user("citizen")
    token_admin, _ = get_authenticated_user("city_admin")

    # Complaint still in SUBMITTED status (not assigned/in-progress)
    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Submitted Status Resolution Test",
        "description": "Trying to resolve a complaint before assignment",
        "category": "drainage",
        "latitude": 12.92,
        "longitude": 77.52
    }, headers={"Authorization": f"Bearer {token_c}"})
    complaint_id = res_create.json()["id"]

    # Resolving SUBMITTED complaint -> 400 Bad Request
    res_bad_status = client.post(
        f"{settings.API_V1_STR}/complaints/{complaint_id}/resolve",
        json={"resolution_notes": "Resolving prematurely before assignment"},
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert res_bad_status.status_code == 400


# 14. Citizen Verification Workflow (Accept -> CLOSED & Timestamps)
def test_citizen_verifies_resolution_success():
    token_c, _ = get_authenticated_user("citizen")
    token_w, worker = get_authenticated_user("worker")
    token_admin, _ = get_authenticated_user("department_admin")

    # 1. Create, assign, and resolve complaint
    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Streetlight Repair Verification",
        "description": "Lamp fixed near community park entrance",
        "category": "streetlight",
        "latitude": 12.93,
        "longitude": 77.53
    }, headers={"Authorization": f"Bearer {token_c}"})
    complaint_id = res_create.json()["id"]

    client.patch(f"{settings.API_V1_STR}/complaints/{complaint_id}", json={
        "assigned_worker_id": worker["id"]
    }, headers={"Authorization": f"Bearer {token_admin}"})

    client.post(f"{settings.API_V1_STR}/complaints/{complaint_id}/resolve", json={
        "resolution_notes": "Replaced faulty LED bulb and fixture."
    }, headers={"Authorization": f"Bearer {token_w}"})

    # 2. Citizen verifies resolution with is_satisfied = True
    res_verify = client.post(
        f"{settings.API_V1_STR}/complaints/{complaint_id}/verify",
        json={"is_satisfied": True, "feedback_notes": "Great job, light is working perfectly now!"},
        headers={"Authorization": f"Bearer {token_c}"}
    )
    assert res_verify.status_code == 200
    data = res_verify.json()
    assert data["status"] == "closed"
    assert data["is_verified"] is True
    assert data["is_satisfied"] is True
    assert data["feedback_notes"] == "Great job, light is working perfectly now!"
    assert data["verified_at"] is not None


# 15. Duplicate Verification Rejection & Closed Complaint Cannot Be Resolved
def test_duplicate_verification_and_closed_complaint_re_resolution():
    token_c, _ = get_authenticated_user("citizen")
    token_w, worker = get_authenticated_user("worker")
    token_admin, _ = get_authenticated_user("department_admin")

    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Closed Complaint Re-resolve Test",
        "description": "Testing closed complaint resolution locking",
        "category": "garbage",
        "latitude": 12.94,
        "longitude": 77.54
    }, headers={"Authorization": f"Bearer {token_c}"})
    complaint_id = res_create.json()["id"]

    client.patch(f"{settings.API_V1_STR}/complaints/{complaint_id}", json={"assigned_worker_id": worker["id"]}, headers={"Authorization": f"Bearer {token_admin}"})
    client.post(f"{settings.API_V1_STR}/complaints/{complaint_id}/resolve", json={"resolution_notes": "Cleared garbage dump"}, headers={"Authorization": f"Bearer {token_w}"})
    client.post(f"{settings.API_V1_STR}/complaints/{complaint_id}/verify", json={"is_satisfied": True}, headers={"Authorization": f"Bearer {token_c}"})

    # Duplicate verification -> 400 Bad Request
    res_dup_v = client.post(f"{settings.API_V1_STR}/complaints/{complaint_id}/verify", json={"is_satisfied": True}, headers={"Authorization": f"Bearer {token_c}"})
    assert res_dup_v.status_code == 400

    # Resolving CLOSED complaint -> 400 Bad Request
    res_re_resolve = client.post(f"{settings.API_V1_STR}/complaints/{complaint_id}/resolve", json={"resolution_notes": "Attempting to resolve closed issue"}, headers={"Authorization": f"Bearer {token_w}"})
    assert res_re_resolve.status_code == 400


# 16. Citizen Rejection / Rework Workflow (is_satisfied = False -> IN_PROGRESS)
def test_citizen_rejects_resolution_for_rework():
    token_c, _ = get_authenticated_user("citizen")
    token_w, worker = get_authenticated_user("worker")
    token_admin, _ = get_authenticated_user("department_admin")

    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Incomplete Leak Fix",
        "description": "Pipe still leaking slowly after repair attempt",
        "category": "water_leak",
        "latitude": 12.96,
        "longitude": 77.56
    }, headers={"Authorization": f"Bearer {token_c}"})
    complaint_id = res_create.json()["id"]

    client.patch(f"{settings.API_V1_STR}/complaints/{complaint_id}", json={"assigned_worker_id": worker["id"]}, headers={"Authorization": f"Bearer {token_admin}"})
    client.post(f"{settings.API_V1_STR}/complaints/{complaint_id}/resolve", json={"resolution_notes": "Patched outer joint"}, headers={"Authorization": f"Bearer {token_w}"})

    # Citizen rejects resolution -> status transitions back to IN_PROGRESS for rework
    res_reject = client.post(
        f"{settings.API_V1_STR}/complaints/{complaint_id}/verify",
        json={"is_satisfied": False, "feedback_notes": "Water is still dripping from main valve"},
        headers={"Authorization": f"Bearer {token_c}"}
    )
    assert res_reject.status_code == 200
    data = res_reject.json()
    assert data["status"] == "in_progress"
    assert data["is_satisfied"] is False
    assert data["is_verified"] is False
    assert data["feedback_notes"] == "Water is still dripping from main valve"


# 17. Citizen Cannot Verify Another Citizen's Complaint or Unresolved Complaint
def test_citizen_cannot_verify_other_or_unresolved():
    token_c1, _ = get_authenticated_user("citizen")
    token_c2, _ = get_authenticated_user("citizen")
    token_w, worker = get_authenticated_user("worker")
    token_admin, _ = get_authenticated_user("department_admin")

    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Unresolved Verification Test",
        "description": "Attempting verification before resolution",
        "category": "other",
        "latitude": 12.97,
        "longitude": 77.57
    }, headers={"Authorization": f"Bearer {token_c1}"})
    complaint_id = res_create.json()["id"]

    # Verifying UNRESOLVED complaint -> 400 Bad Request
    res_unresolved = client.post(f"{settings.API_V1_STR}/complaints/{complaint_id}/verify", json={"is_satisfied": True}, headers={"Authorization": f"Bearer {token_c1}"})
    assert res_unresolved.status_code == 400

    # Resolve complaint
    client.patch(f"{settings.API_V1_STR}/complaints/{complaint_id}", json={"assigned_worker_id": worker["id"]}, headers={"Authorization": f"Bearer {token_admin}"})
    client.post(f"{settings.API_V1_STR}/complaints/{complaint_id}/resolve", json={"resolution_notes": "Done"}, headers={"Authorization": f"Bearer {token_w}"})

    # Citizen 2 verifies Citizen 1's complaint -> 403 Forbidden
    res_other_v = client.post(f"{settings.API_V1_STR}/complaints/{complaint_id}/verify", json={"is_satisfied": True}, headers={"Authorization": f"Bearer {token_c2}"})
    assert res_other_v.status_code == 403


# 18. Unauthenticated Resolution Rejection (401 Unauthorized)
def test_unauthenticated_resolution_rejected():
    random_uuid = uuid.uuid4()
    res = client.post(f"{settings.API_V1_STR}/complaints/{random_uuid}/resolve", json={"resolution_notes": "No auth"})
    assert res.status_code == 401


# 19. Input Validation Coordinates and Enums
def test_input_validation_coordinates_and_enums():
    token_c, _ = get_authenticated_user("citizen")
    headers = {"Authorization": f"Bearer {token_c}"}

    res_lat = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "Invalid Lat", "description": "Description long enough", "category": "other",
        "latitude": 95.0, "longitude": 77.0
    }, headers=headers)
    assert res_lat.status_code == 422


# 20. Pagination and Filtering & Existing AI Integration
def test_pagination_and_existing_ai_integration():
    token_c, _ = get_authenticated_user("citizen")
    res_create = client.post(f"{settings.API_V1_STR}/complaints", json={
        "title": "AI Analyze Integration Test 2",
        "description": "Checking AI analysis endpoint integration",
        "category": "drainage",
        "latitude": 12.30,
        "longitude": 77.30
    }, headers={"Authorization": f"Bearer {token_c}"})
    complaint_id = res_create.json()["id"]

    res_analyze = client.post(
        f"{settings.API_V1_STR}/complaints/{complaint_id}/analyze",
        headers={"Authorization": f"Bearer {token_c}"}
    )
    assert res_analyze.status_code == 200
    data = res_analyze.json()
    assert data["complaint_id"] == complaint_id
