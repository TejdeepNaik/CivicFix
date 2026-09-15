"""Authentication request and response Pydantic schemas."""

from typing import Optional
from pydantic import BaseModel, EmailStr
from ..models.role import RoleEnum


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[RoleEnum] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
