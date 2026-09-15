"""Unit and integration tests for CivicFix authentication, JWT, security, and RBAC."""

import uuid
from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.security import create_access_token, verify_password
from backend.app.models.user import User
from backend.app.models.role import RoleEnum
from backend.app.db.database import get_db

client = TestClient(app)


def test_password_security():
    """Verify that password hashing uses bcrypt and is non-reversible."""
    plain_password = "supersecretpassword123"
    from backend.app.core.security import get_password_hash
    hashed = get_password_hash(plain_password)
    
    assert hashed != plain_password
    assert hashed.startswith("$2b$")
    assert verify_password(plain_password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_user_registration_and_login():
    """Test user registration flow, duplicate email rejection, and login JWT issuance."""
    unique_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    password = "securePassword123"
    
    # 1. Successful Registration
    reg_payload = {
        "email": unique_email,
        "password": password,
        "full_name": "Test Citizen",
        "role": "citizen"
    }
    res_reg = client.post(f"{settings.API_V1_STR}/auth/register", json=reg_payload)
    assert res_reg.status_code == 201, res_reg.text
    reg_data = res_reg.json()
    assert reg_data["email"] == unique_email
    assert reg_data["full_name"] == "Test Citizen"
    assert reg_data["role"] == "citizen"
    assert "hashed_password" not in reg_data
    assert "password" not in reg_data

    # 2. Duplicate Registration Rejection
    res_dup = client.post(f"{settings.API_V1_STR}/auth/register", json=reg_payload)
    assert res_dup.status_code == 400
    assert "already registered" in res_dup.json()["detail"]

    # 3. Successful Login
    login_payload = {
        "email": unique_email,
        "password": password
    }
    res_login = client.post(f"{settings.API_V1_STR}/auth/login", json=login_payload)
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"
    token = login_data["access_token"]

    # 4. Invalid Login (Wrong Password)
    res_bad_pw = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": unique_email, "password": "wrongpassword"}
    )
    assert res_bad_pw.status_code == 401

    # 5. Get Current User Profile (/auth/me)
    headers = {"Authorization": f"Bearer {token}"}
    res_me = client.get(f"{settings.API_V1_STR}/auth/me", headers=headers)
    assert res_me.status_code == 200
    me_data = res_me.json()
    assert me_data["email"] == unique_email
    assert "hashed_password" not in me_data
    assert "password" not in me_data


def test_jwt_token_validation_and_expiration():
    """Test token validation failure for invalid signatures and expired tokens."""
    # Invalid token
    bad_headers = {"Authorization": "Bearer invalid_jwt_token_string"}
    res_bad = client.get(f"{settings.API_V1_STR}/auth/me", headers=bad_headers)
    assert res_bad.status_code == 401

    # Expired token
    expired_token = create_access_token(
        subject="00000000-0000-0000-0000-000000000000",
        claims={"email": "expired@example.com", "role": "citizen"},
        expires_delta=timedelta(seconds=-10)
    )
    exp_headers = {"Authorization": f"Bearer {expired_token}"}
    res_exp = client.get(f"{settings.API_V1_STR}/auth/me", headers=exp_headers)
    assert res_exp.status_code == 401


def test_rbac_authorization():
    """Test Role-Based Access Control (RBAC) enforcement on protected routes."""
    # 1. Register a CITIZEN user
    citizen_email = f"citizen_{uuid.uuid4().hex[:8]}@example.com"
    client.post(f"{settings.API_V1_STR}/auth/register", json={
        "email": citizen_email,
        "password": "password123",
        "role": "citizen"
    })
    token_citizen = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": citizen_email,
        "password": "password123"
    }).json()["access_token"]

    # 2. Register a CITY_ADMIN user
    admin_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"
    client.post(f"{settings.API_V1_STR}/auth/register", json={
        "email": admin_email,
        "password": "password123",
        "role": "city_admin"
    })
    token_admin = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": admin_email,
        "password": "password123"
    }).json()["access_token"]

    # 3. CITIZEN attempts to access admin endpoint -> 403 Forbidden
    res_citizen_admin = client.get(
        f"{settings.API_V1_STR}/admin/dashboard",
        headers={"Authorization": f"Bearer {token_citizen}"}
    )
    assert res_citizen_admin.status_code == 403
    assert "Operation not permitted" in res_citizen_admin.json()["detail"]

    # 4. CITY_ADMIN attempts to access admin endpoint -> 200 OK
    res_admin = client.get(
        f"{settings.API_V1_STR}/admin/dashboard",
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["role"] == "city_admin"
