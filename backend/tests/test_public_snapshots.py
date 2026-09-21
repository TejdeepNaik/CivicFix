"""Unit and integration tests for public complaint snapshots API endpoint."""

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


def test_get_public_snapshots_unauthenticated():
    """Verify endpoint is accessible without authentication."""
    res = client.get(f"{settings.API_V1_STR}/complaints/public/snapshots")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_get_public_snapshots_ordering_and_limit():
    """Verify max 10 complaints are returned, sorted newest first by created_at."""
    token, _ = get_authenticated_user("citizen")
    headers = {"Authorization": f"Bearer {token}"}

    for i in range(12):
        payload = {
            "title": f"Snapshot Issue #{i+1}",
            "description": f"Detailed description for issue #{i+1} testing snapshots",
            "category": "pothole",
            "latitude": 12.9716 + (i * 0.001),
            "longitude": 77.5946 + (i * 0.001),
            "address": f"{i+1} Main Street"
        }
        res = client.post(f"{settings.API_V1_STR}/complaints", json=payload, headers=headers)
        assert res.status_code == 201

    # Fetch public snapshots (unauthenticated)
    res_snapshots = client.get(f"{settings.API_V1_STR}/complaints/public/snapshots")
    assert res_snapshots.status_code == 200
    items = res_snapshots.json()

    # Must return maximum 10 items
    assert len(items) == 10

    # Must be sorted newest first (created_at descending)
    for idx in range(len(items) - 1):
        dt_curr = items[idx]["created_at"]
        dt_next = items[idx + 1]["created_at"]
        assert dt_curr >= dt_next, f"Snapshots not sorted newest first: {dt_curr} < {dt_next}"





def test_public_snapshots_schema_privacy():
    """Verify returned objects expose only public-safe fields."""
    token, citizen = get_authenticated_user("citizen")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Privacy Audit Pothole",
        "description": "Inspecting public snapshot fields for sensitive data leakage",
        "category": "pothole",
        "latitude": 12.9000,
        "longitude": 77.5000,
        "address": "100 Confidential Way"
    }
    res = client.post(f"{settings.API_V1_STR}/complaints", json=payload, headers=headers)
    assert res.status_code == 201

    res_snapshots = client.get(f"{settings.API_V1_STR}/complaints/public/snapshots")
    assert res_snapshots.status_code == 200
    first_item = res_snapshots.json()[0]

    # Required public-safe fields present
    assert "id" in first_item
    assert "title" in first_item
    assert "description" in first_item
    assert "category" in first_item
    assert "status" in first_item
    assert "priority" in first_item
    assert "latitude" in first_item
    assert "longitude" in first_item
    assert "created_at" in first_item

    # Sensitive personal fields MUST NOT exist in public snapshot payload
    forbidden_keys = ["citizen_id", "email", "phone", "password", "hashed_password", "token", "access_token"]
    for key in forbidden_keys:
        assert key not in first_item, f"Forbidden sensitive key '{key}' found in public snapshot response!"


def test_public_complaint_detail_unauthenticated():
    """Verify complaint detail endpoint works without authentication."""
    token, _ = get_authenticated_user("citizen")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Public Viewable Complaint",
        "description": "Testing unauthenticated complaint detail fetching",
        "category": "garbage",
        "latitude": 12.9500,
        "longitude": 77.5500,
        "address": "Park Road"
    }
    create_res = client.post(f"{settings.API_V1_STR}/complaints", json=payload, headers=headers)
    assert create_res.status_code == 201
    c_id = create_res.json()["id"]

    # Unauthenticated detail GET
    detail_res = client.get(f"{settings.API_V1_STR}/complaints/{c_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == c_id
