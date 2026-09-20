"""Global pytest fixtures and test database isolation setup for CivicFix backend tests."""

import os
import sys
import pytest
from sqlalchemy.orm import sessionmaker

from backend.app.db.base import Base
from backend.app.db.database import engine, get_db
from backend.app.main import app


@pytest.fixture(autouse=True)
def reset_database():
    """Ensure clean database state before each test run."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
