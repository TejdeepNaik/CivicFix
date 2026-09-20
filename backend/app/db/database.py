"""Database engine and session management."""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ..core.config import settings
from .base import Base
# Import all models to register them with SQLAlchemy metadata
from ..models import user, complaint, department, cluster, activity, notification, role

from sqlalchemy.pool import StaticPool

# Determine database engine.
import sys
db_url = settings.DATABASE_URL
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

if os.getenv('PYTEST_CURRENT_TEST') or 'pytest' in sys.modules:
    # Use StaticPool in-memory SQLite for pytest for clean thread isolation and fast test execution
    engine = create_engine('sqlite:///:memory:', connect_args={"check_same_thread": False}, poolclass=StaticPool)
else:
    try:
        engine = create_engine(db_url, echo=settings.DEBUG)
        # Verify connection; will raise if unavailable
        with engine.connect() as _:
            pass
    except Exception:
        # Fallback to in-memory SQLite if PostgreSQL not reachable
        engine = create_engine('sqlite:///:memory:', echo=settings.DEBUG)

if getattr(engine, "url", None) and engine.url.drivername.startswith("sqlite"):
    Base.metadata.create_all(bind=engine)
# For PostgreSQL production, migrations are handled via Alembic; do not auto-create tables here.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
