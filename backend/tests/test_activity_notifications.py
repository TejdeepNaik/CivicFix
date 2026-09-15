"""Tests for complaint activity history and notification system."""

import uuid
from typing import Optional, Tuple
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.db.database import SessionLocal
from backend.app.models.user import User

client = TestClient(app)

API = settings.API_V1_STR


def set_user_dept(user_id: str, dept_id: str) -> None:
    db = SessionLocal()
    u = db.query(User).filter(User.id == user_id).first()
    if u:
        u.department_id = dept_id
        db.commit()
    db.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def register_login(role: str = "citizen", dept_id: Optional[str] = None) -> Tuple[str, dict]:
    """Register + login a user and return (token, user_data)."""
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    password = "password123"
    reg_payload = {
        "email": email,
        "password": password,
        "full_name": f"Test {role}",
        "role": role,
    }
    if dept_id:
        reg_payload["department_id"] = dept_id

    reg = client.post(f"{API}/auth/register", json=reg_payload)
    assert reg.status_code == 201, reg.text
    user_data = reg.json()

    login = client.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return token, user_data


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def create_department(admin_token: str, name: Optional[str] = None) -> dict:
    dept_name = name or f"Dept-{uuid.uuid4().hex[:6]}"
    r = client.post(
        f"{API}/departments",
        json={"name": dept_name, "code": dept_name[:10], "description": "Test dept"},
        headers=auth(admin_token),
    )
    assert r.status_code == 201, r.text
    return r.json()


def create_complaint(citizen_token: str) -> dict:
    r = client.post(
        f"{API}/complaints",
        json={
            "title": "Test Complaint",
            "description": "A broken streetlight near the park",
            "category": "streetlight",
            "latitude": 12.97,
            "longitude": 77.59,
            "address": "Test Street",
        },
        headers=auth(citizen_token),
    )
    assert r.status_code == 201, r.text
    return r.json()


def get_activity(token: str, complaint_id: str) -> dict:
    r = client.get(f"{API}/complaints/{complaint_id}/activity", headers=auth(token))
    return r


def get_notifications(token: str, **params) -> dict:
    r = client.get(f"{API}/notifications", headers=auth(token), params=params)
    return r


# ---------------------------------------------------------------------------
# 1. Activity on complaint creation
# ---------------------------------------------------------------------------

def test_activity_on_complaint_creation():
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    r = get_activity(token_c, cid)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    events = [item["event_type"] for item in data["items"]]
    assert "complaint_created" in events


# ---------------------------------------------------------------------------
# 2. Activity on department routing
# ---------------------------------------------------------------------------

def test_activity_on_department_routing():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    dept = create_department(token_admin)
    r = client.patch(
        f"{API}/complaints/{cid}",
        json={"department_id": dept["id"]},
        headers=auth(token_admin),
    )
    assert r.status_code == 200

    r_act = get_activity(token_c, cid)
    events = [item["event_type"] for item in r_act.json()["items"]]
    assert "department_assigned" in events


# ---------------------------------------------------------------------------
# 3. Activity on worker assignment
# ---------------------------------------------------------------------------

def test_activity_on_worker_assignment():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    dept = create_department(token_admin)

    # Register + login worker with that dept
    email = f"worker_{uuid.uuid4().hex[:8]}@example.com"
    w_reg = client.post(f"{API}/auth/register", json={
        "email": email, "password": "password123",
        "full_name": "Worker1", "role": "worker"
    })
    assert w_reg.status_code == 201, w_reg.text
    worker_id = w_reg.json()["id"]

    # Set worker's dept in DB to match complaint's dept
    set_user_dept(worker_id, dept["id"])

    # Route to dept first
    client.patch(f"{API}/complaints/{cid}", json={"department_id": dept["id"]}, headers=auth(token_admin))

    # Assign worker
    r = client.patch(f"{API}/complaints/{cid}", json={"assigned_worker_id": worker_id}, headers=auth(token_admin))
    assert r.status_code == 200

    r_act = get_activity(token_c, cid)
    events = [item["event_type"] for item in r_act.json()["items"]]
    assert "worker_assigned" in events


# ---------------------------------------------------------------------------
# 4. Activity on status change
# ---------------------------------------------------------------------------

def test_activity_on_status_change():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    r = client.patch(
        f"{API}/complaints/{cid}",
        json={"status": "under_review"},
        headers=auth(token_admin),
    )
    assert r.status_code == 200

    r_act = get_activity(token_c, cid)
    events = [item["event_type"] for item in r_act.json()["items"]]
    assert "status_changed" in events


# ---------------------------------------------------------------------------
# 5. Activity on resolution
# ---------------------------------------------------------------------------

def test_activity_on_resolution():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    # Move SUBMITTED -> ASSIGNED -> IN_PROGRESS
    client.patch(f"{API}/complaints/{cid}", json={"status": "assigned"}, headers=auth(token_admin))
    client.patch(f"{API}/complaints/{cid}", json={"status": "in_progress"}, headers=auth(token_admin))

    r = client.post(
        f"{API}/complaints/{cid}/resolve",
        json={"resolution_notes": "Fixed the light"},
        headers=auth(token_admin),
    )
    assert r.status_code == 200

    r_act = get_activity(token_c, cid)
    events = [item["event_type"] for item in r_act.json()["items"]]
    assert "complaint_resolved" in events


# ---------------------------------------------------------------------------
# 6. Activity on verification (satisfied)
# ---------------------------------------------------------------------------

def test_activity_on_verification_satisfied():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    client.patch(f"{API}/complaints/{cid}", json={"status": "assigned"}, headers=auth(token_admin))
    client.patch(f"{API}/complaints/{cid}", json={"status": "in_progress"}, headers=auth(token_admin))
    client.post(f"{API}/complaints/{cid}/resolve", json={"resolution_notes": "Resolution completed"}, headers=auth(token_admin))

    r = client.post(
        f"{API}/complaints/{cid}/verify",
        json={"is_satisfied": True, "feedback_notes": "Looks good"},
        headers=auth(token_c),
    )
    assert r.status_code == 200

    r_act = get_activity(token_c, cid)
    events = [item["event_type"] for item in r_act.json()["items"]]
    assert "resolution_verified" in events
    assert "complaint_closed" in events


# ---------------------------------------------------------------------------
# 7. Activity on reopening (rework)
# ---------------------------------------------------------------------------

def test_activity_on_reopening():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    client.patch(f"{API}/complaints/{cid}", json={"status": "assigned"}, headers=auth(token_admin))
    client.patch(f"{API}/complaints/{cid}", json={"status": "in_progress"}, headers=auth(token_admin))
    client.post(f"{API}/complaints/{cid}/resolve", json={"resolution_notes": "Resolution completed"}, headers=auth(token_admin))

    r = client.post(
        f"{API}/complaints/{cid}/verify",
        json={"is_satisfied": False, "feedback_notes": "Not fixed"},
        headers=auth(token_c),
    )
    assert r.status_code == 200

    r_act = get_activity(token_c, cid)
    events = [item["event_type"] for item in r_act.json()["items"]]
    assert "rework_requested" in events


# ---------------------------------------------------------------------------
# 8. No duplicate activity on unchanged update
# ---------------------------------------------------------------------------

def test_no_duplicate_activity_on_unchanged_update():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    # Change status to under_review
    client.patch(f"{API}/complaints/{cid}", json={"status": "under_review"}, headers=auth(token_admin))
    r_act_before = get_activity(token_c, cid)
    count_before = r_act_before.json()["total"]

    # Update with same status (no-op) → no new status_changed activity
    client.patch(f"{API}/complaints/{cid}", json={"status": "under_review"}, headers=auth(token_admin))
    r_act_after = get_activity(token_c, cid)
    count_after = r_act_after.json()["total"]

    assert count_after == count_before, (
        f"Expected no new activity events but got {count_after - count_before} extra"
    )


# ---------------------------------------------------------------------------
# 9. Citizen can view own complaint activity
# ---------------------------------------------------------------------------

def test_citizen_can_view_own_activity():
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    r = get_activity(token_c, cid)
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# 10. Unauthorized citizen cannot view another's activity
# ---------------------------------------------------------------------------

def test_unauthorized_citizen_cannot_view_activity():
    token_c1, _ = register_login("citizen")
    token_c2, _ = register_login("citizen")
    complaint = create_complaint(token_c1)
    cid = complaint["id"]

    r = get_activity(token_c2, cid)
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# 11. Worker can view complaint activity
# ---------------------------------------------------------------------------

def test_worker_can_view_activity():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    token_w, _ = register_login("worker")

    r = get_activity(token_w, cid)
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# 12. Admin can view complaint activity
# ---------------------------------------------------------------------------

def test_admin_can_view_activity():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    r = get_activity(token_admin, cid)
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# 13. Notification created on complaint creation
# ---------------------------------------------------------------------------

def test_notification_created_on_complaint_submission():
    token_c, _ = register_login("citizen")
    create_complaint(token_c)

    r = get_notifications(token_c)
    assert r.status_code == 200
    data = r.json()
    types = [n["notification_type"] for n in data["items"]]
    assert "complaint_submitted" in types


# ---------------------------------------------------------------------------
# 14. Citizen notifications on workflow events
# ---------------------------------------------------------------------------

def test_citizen_receives_resolved_notification():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    client.patch(f"{API}/complaints/{cid}", json={"status": "assigned"}, headers=auth(token_admin))
    client.patch(f"{API}/complaints/{cid}", json={"status": "in_progress"}, headers=auth(token_admin))
    client.post(f"{API}/complaints/{cid}/resolve", json={"resolution_notes": "Resolution completed"}, headers=auth(token_admin))

    r = get_notifications(token_c)
    types = [n["notification_type"] for n in r.json()["items"]]
    assert "resolution_requires_verification" in types


# ---------------------------------------------------------------------------
# 15. Worker receives assignment notification
# ---------------------------------------------------------------------------

def test_worker_receives_assignment_notification():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    complaint = create_complaint(token_c)
    cid = complaint["id"]

    dept = create_department(token_admin)

    w_reg = client.post(f"{API}/auth/register", json={
        "email": f"worker_{uuid.uuid4().hex[:8]}@example.com", "password": "password123",
        "full_name": "Worker4", "role": "worker"
    })
    assert w_reg.status_code == 201
    wid = w_reg.json()["id"]
    w_email = w_reg.json()["email"]

    set_user_dept(wid, dept["id"])

    w_login2 = client.post(f"{API}/auth/login", json={"email": w_email, "password": "password123"})
    worker_token = w_login2.json()["access_token"]

    client.patch(f"{API}/complaints/{cid}", json={"department_id": dept["id"]}, headers=auth(token_admin))
    client.patch(f"{API}/complaints/{cid}", json={"assigned_worker_id": wid}, headers=auth(token_admin))

    r = get_notifications(worker_token)
    types = [n["notification_type"] for n in r.json()["items"]]
    assert "complaint_assigned_to_worker" in types


# ---------------------------------------------------------------------------
# 16. Notification listing (authenticated)
# ---------------------------------------------------------------------------

def test_notification_listing():
    token_c, _ = register_login("citizen")
    create_complaint(token_c)  # triggers complaint_submitted notification

    r = get_notifications(token_c)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


# ---------------------------------------------------------------------------
# 17. Unread filtering
# ---------------------------------------------------------------------------

def test_notification_unread_filter():
    token_c, _ = register_login("citizen")
    create_complaint(token_c)

    r_all = get_notifications(token_c)
    r_unread = get_notifications(token_c, unread_only=True)

    assert r_unread.status_code == 200
    # All notifications start unread, so unread count == total count (for fresh user)
    assert r_unread.json()["total"] <= r_all.json()["total"]
    for item in r_unread.json()["items"]:
        assert item["is_read"] is False


# ---------------------------------------------------------------------------
# 18. Pagination
# ---------------------------------------------------------------------------

def test_notification_pagination():
    token_c, _ = register_login("citizen")
    # Create 3 complaints = 3 notifications
    for _ in range(3):
        create_complaint(token_c)

    r_p1 = get_notifications(token_c, page=1, size=2)
    assert r_p1.status_code == 200
    data = r_p1.json()
    assert len(data["items"]) <= 2
    assert data["total"] >= 3


# ---------------------------------------------------------------------------
# 19. Owner can mark notification as read
# ---------------------------------------------------------------------------

def test_owner_can_mark_notification_read():
    token_c, _ = register_login("citizen")
    create_complaint(token_c)

    r_list = get_notifications(token_c)
    notif_id = r_list.json()["items"][0]["id"]

    r_read = client.patch(f"{API}/notifications/{notif_id}/read", headers=auth(token_c))
    assert r_read.status_code == 200
    assert r_read.json()["is_read"] is True
    assert r_read.json()["read_at"] is not None


# ---------------------------------------------------------------------------
# 20. Another user cannot mark notification as read
# ---------------------------------------------------------------------------

def test_other_user_cannot_mark_notification_read():
    token_c1, _ = register_login("citizen")
    token_c2, _ = register_login("citizen")
    create_complaint(token_c1)

    r_list = get_notifications(token_c1)
    notif_id = r_list.json()["items"][0]["id"]

    r = client.patch(f"{API}/notifications/{notif_id}/read", headers=auth(token_c2))
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# 21. Nonexistent notification returns 404
# ---------------------------------------------------------------------------

def test_nonexistent_notification_returns_404():
    token_c, _ = register_login("citizen")
    fake_id = str(uuid.uuid4())

    r = client.patch(f"{API}/notifications/{fake_id}/read", headers=auth(token_c))
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# 22. Mark-read is idempotent
# ---------------------------------------------------------------------------

def test_mark_read_is_idempotent():
    token_c, _ = register_login("citizen")
    create_complaint(token_c)

    r_list = get_notifications(token_c)
    notif_id = r_list.json()["items"][0]["id"]

    # First read
    r1 = client.patch(f"{API}/notifications/{notif_id}/read", headers=auth(token_c))
    assert r1.status_code == 200
    read_at_1 = r1.json()["read_at"]

    # Second read (idempotent)
    r2 = client.patch(f"{API}/notifications/{notif_id}/read", headers=auth(token_c))
    assert r2.status_code == 200
    assert r2.json()["is_read"] is True
    # read_at should not change on second call
    assert r2.json()["read_at"] == read_at_1
