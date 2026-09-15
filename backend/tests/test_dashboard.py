"""Tests for CivicFix Dashboard and Aggregation APIs."""

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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def register_login(role: str = "citizen") -> Tuple[str, dict]:
    """Register + login a user and return (token, user_data)."""
    email = f"dash_{role}_{uuid.uuid4().hex[:8]}@example.com"
    password = "password123"
    reg_payload = {
        "email": email,
        "password": password,
        "full_name": f"Test {role}",
        "role": role,
    }
    reg = client.post(f"{API}/auth/register", json=reg_payload)
    assert reg.status_code == 201, reg.text
    user_data = reg.json()

    login = client.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return token, user_data


def set_user_dept(user_id: str, dept_id: str) -> None:
    """Helper to set department_id directly in DB for testing."""
    db = SessionLocal()
    u = db.query(User).filter(User.id == user_id).first()
    if u:
        u.department_id = dept_id
        db.commit()
    db.close()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def create_department(admin_token: str, name: Optional[str] = None) -> dict:
    dept_name = name or f"Dept-{uuid.uuid4().hex[:6]}"
    dept_code = f"DCD-{uuid.uuid4().hex[:6]}"
    r = client.post(
        f"{API}/departments",
        json={"name": dept_name, "code": dept_code, "description": "Test dept"},
        headers=auth(admin_token),
    )
    assert r.status_code == 201, r.text
    return r.json()


def create_complaint(citizen_token: str, title: str = "Test Issue") -> dict:
    r = client.post(
        f"{API}/complaints",
        json={
            "title": title,
            "description": "Detailed description of the issue near main street",
            "category": "pothole",
            "latitude": 12.97,
            "longitude": 77.59,
            "address": "123 Main St",
        },
        headers=auth(citizen_token),
    )
    assert r.status_code == 201, r.text
    return r.json()


# ---------------------------------------------------------------------------
# 1. Citizen Dashboard Tests
# ---------------------------------------------------------------------------

def test_citizen_dashboard_isolation():
    token_a, user_a = register_login("citizen")
    token_b, user_b = register_login("citizen")

    c1 = create_complaint(token_a, "Citizen A Complaint 1")
    c2 = create_complaint(token_a, "Citizen A Complaint 2")
    c3 = create_complaint(token_b, "Citizen B Complaint 1")

    # Fetch Citizen A dashboard
    r_a = client.get(f"{API}/dashboard/citizen", headers=auth(token_a))
    assert r_a.status_code == 200, r_a.text
    data_a = r_a.json()

    assert data_a["total_complaints"] == 2
    assert data_a["open_complaints_count"] == 2
    assert data_a["resolved_closed_count"] == 0
    assert "submitted" in data_a["status_breakdown"]
    assert data_a["status_breakdown"]["submitted"] == 2
    recent_ids_a = [item["id"] for item in data_a["recent_complaints"]]
    assert c1["id"] in recent_ids_a
    assert c2["id"] in recent_ids_a
    assert c3["id"] not in recent_ids_a

    # Fetch Citizen B dashboard
    r_b = client.get(f"{API}/dashboard/citizen", headers=auth(token_b))
    assert r_b.status_code == 200, r_b.text
    data_b = r_b.json()
    assert data_b["total_complaints"] == 1
    recent_ids_b = [item["id"] for item in data_b["recent_complaints"]]
    assert c3["id"] in recent_ids_b
    assert c1["id"] not in recent_ids_b


def test_citizen_dashboard_empty_data():
    token, _ = register_login("citizen")
    r = client.get(f"{API}/dashboard/citizen", headers=auth(token))
    assert r.status_code == 200
    data = r.json()

    assert data["total_complaints"] == 0
    assert data["open_complaints_count"] == 0
    assert data["resolved_closed_count"] == 0
    assert data["status_breakdown"] == {}
    assert data["recent_complaints"] == []
    assert data["recent_activity"] == []


# ---------------------------------------------------------------------------
# 2. Worker Dashboard Tests
# ---------------------------------------------------------------------------

def test_worker_dashboard_access():
    token_admin, _ = register_login("city_admin")
    token_c, _ = register_login("citizen")
    token_w, user_w = register_login("worker")

    dept = create_department(token_admin)
    set_user_dept(user_w["id"], dept["id"])

    complaint = create_complaint(token_c, "Road Damage")
    cid = complaint["id"]

    # Route and assign to worker
    client.patch(f"{API}/complaints/{cid}", json={"department_id": dept["id"]}, headers=auth(token_admin))
    client.patch(f"{API}/complaints/{cid}", json={"assigned_worker_id": user_w["id"]}, headers=auth(token_admin))

    # Worker views dashboard
    r = client.get(f"{API}/dashboard/worker", headers=auth(token_w))
    assert r.status_code == 200, r.text
    data = r.json()

    assert data["assigned_complaints_count"] == 1
    assert data["open_workload_count"] == 1
    assert "assigned" in data["status_breakdown"]
    recent_w_ids = [item["id"] for item in data["recent_assigned_complaints"]]
    assert cid in recent_w_ids


def test_citizen_cannot_access_worker_dashboard():
    token_c, _ = register_login("citizen")
    r = client.get(f"{API}/dashboard/worker", headers=auth(token_c))
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# 3. Department Admin Dashboard Tests
# ---------------------------------------------------------------------------

def test_department_dashboard_isolation():
    token_super, _ = register_login("super_admin")
    token_da, user_da = register_login("department_admin")
    token_c, _ = register_login("citizen")
    token_w, user_w = register_login("worker")

    dept = create_department(token_super, f"Public Works Dept {uuid.uuid4().hex[:6]}")
    set_user_dept(user_da["id"], dept["id"])
    set_user_dept(user_w["id"], dept["id"])

    complaint = create_complaint(token_c, "Water Leak On Main St")
    cid = complaint["id"]

    # Route complaint to department
    client.patch(f"{API}/complaints/{cid}", json={"department_id": dept["id"]}, headers=auth(token_super))
    client.patch(f"{API}/complaints/{cid}", json={"assigned_worker_id": user_w["id"]}, headers=auth(token_super))

    # Dept Admin views dashboard
    r = client.get(f"{API}/dashboard/department", headers=auth(token_da))
    assert r.status_code == 200, r.text
    data = r.json()

    assert data["department_id"] == dept["id"]
    assert data["department_name"] == dept["name"]
    assert data["total_complaints"] == 1
    assert data["open_complaints_count"] == 1
    assert len(data["worker_workload"]) >= 1

    # Check worker workload list inside department
    w_item = next(w for w in data["worker_workload"] if w["worker_id"] == user_w["id"])
    assert w_item["assigned_open_count"] == 1
    assert w_item["assigned_total_count"] == 1


def test_department_admin_without_dept_rejected():
    token_da, _ = register_login("department_admin")
    # Department ID is None
    r = client.get(f"{API}/dashboard/department", headers=auth(token_da))
    assert r.status_code == 400
    assert "Department admin is not assigned to a department" in r.json()["detail"]


def test_citizen_cannot_access_department_dashboard():
    token_c, _ = register_login("citizen")
    r = client.get(f"{API}/dashboard/department", headers=auth(token_c))
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# 4. City / Super Admin Dashboard Tests
# ---------------------------------------------------------------------------

def test_admin_dashboard_metrics():
    token_ca, _ = register_login("city_admin")
    token_sa, _ = register_login("super_admin")
    token_c, _ = register_login("citizen")

    create_complaint(token_c, "Admin Overview Test Complaint")

    # City Admin request
    r_ca = client.get(f"{API}/dashboard/admin", headers=auth(token_ca))
    assert r_ca.status_code == 200, r_ca.text
    data_ca = r_ca.json()

    assert data_ca["total_users"] >= 3
    assert "citizen" in data_ca["users_by_role"]
    assert data_ca["total_complaints"] >= 1
    assert isinstance(data_ca["department_complaint_counts"], list)
    assert isinstance(data_ca["worker_workload_summary"], list)

    # Super Admin request
    r_sa = client.get(f"{API}/dashboard/admin", headers=auth(token_sa))
    assert r_sa.status_code == 200, r_sa.text


def test_citizen_and_worker_cannot_access_admin_dashboard():
    token_c, _ = register_login("citizen")
    token_w, _ = register_login("worker")

    r_c = client.get(f"{API}/dashboard/admin", headers=auth(token_c))
    assert r_c.status_code == 403

    r_w = client.get(f"{API}/dashboard/admin", headers=auth(token_w))
    assert r_w.status_code == 403


# ---------------------------------------------------------------------------
# 5. General & Unauthenticated Tests
# ---------------------------------------------------------------------------

def test_unauthenticated_dashboard_endpoints():
    for path in ["citizen", "worker", "department", "admin"]:
        r = client.get(f"{API}/dashboard/{path}")
        assert r.status_code == 401


def test_dashboard_recent_items_pagination_limit():
    token_c, _ = register_login("citizen")

    for i in range(7):
        create_complaint(token_c, f"Pothole Issue {i}")

    r = client.get(f"{API}/dashboard/citizen?limit=3", headers=auth(token_c))
    assert r.status_code == 200
    data = r.json()

    assert data["total_complaints"] == 7
    assert len(data["recent_complaints"]) == 3
