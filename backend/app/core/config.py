"""Application configuration using Pydantic Settings."""

from typing import List, Union
import os
import json

# Support both pydantic v1 (local venv, Python 3.9) and pydantic_settings v2
try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    PYDANTIC_V2 = True
except ImportError:
    from pydantic import BaseSettings  # type: ignore[no-redef]
    SettingsConfigDict = None  # type: ignore[assignment]
    PYDANTIC_V2 = False


def _parse_cors(v: Union[str, List[str]]) -> List[str]:
    """Parse BACKEND_CORS_ORIGINS from a JSON array string or comma-separated string."""
    origins: List[str] = []
    if isinstance(v, list):
        origins = [str(o).rstrip('/') for o in v]
    elif isinstance(v, str):
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                origins = [str(o).rstrip('/') for o in parsed]
            else:
                origins = [str(o).rstrip('/') for o in v.split(",") if o.strip()]
        except (json.JSONDecodeError, TypeError):
            origins = [str(o).rstrip('/') for o in v.split(",") if o.strip()]

    default_dev_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
    for dev_origin in default_dev_origins:
        if dev_origin not in origins:
            origins.append(dev_origin)

    return origins



if PYDANTIC_V2:
    from pydantic import field_validator

    class Settings(BaseSettings):
        PROJECT_NAME: str = "CivicFix"
        VERSION: str = "0.1.0"
        API_V1_STR: str = "/api/v1"
        DEBUG: bool = False

        DATABASE_URL: str = "sqlite:///./test.db"

        JWT_SECRET_KEY: str = "change-this-secret-key-in-production"
        JWT_ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

        REDIS_URL: str = "redis://localhost:6379/0"

        BACKEND_CORS_ORIGINS: Union[List[str], str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
        ]

        @field_validator("BACKEND_CORS_ORIGINS", mode="before")
        def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
            return _parse_cors(v)

        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore",
        )

else:
    from pydantic import validator  # type: ignore[no-redef]

    class Settings(BaseSettings):  # type: ignore[no-redef]
        PROJECT_NAME: str = "CivicFix"
        VERSION: str = "0.1.0"
        API_V1_STR: str = "/api/v1"
        DEBUG: bool = False

        DATABASE_URL: str = "sqlite:///./test.db"

        JWT_SECRET_KEY: str = "change-this-secret-key-in-production"
        JWT_ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

        REDIS_URL: str = "redis://localhost:6379/0"

        BACKEND_CORS_ORIGINS: List[str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
        ]

        @validator("BACKEND_CORS_ORIGINS", pre=True)
        def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
            return _parse_cors(v)

        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"


settings = Settings()
