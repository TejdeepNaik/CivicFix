"""FastAPI application entry point.

This module initializes the FastAPI app instance, configures CORS middleware,
mounts static uploads directory, and mounts API routers under /api/v1 as well as root health endpoints.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.config import settings
from .api import api_router
from .api.health import router as health_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Resolve UPLOAD_DIR once at startup.
# - Local dev: settings.UPLOAD_DIR defaults to "uploads" (relative, next to cwd).
# - Production (Railway): set UPLOAD_DIR=/app/uploads with a persistent Volume mounted there.
UPLOAD_DIR = os.path.abspath(settings.UPLOAD_DIR)
EVIDENCE_DIR = os.path.join(UPLOAD_DIR, "evidence")

# Ensure the evidence subdirectory exists (idempotent on every startup).
os.makedirs(EVIDENCE_DIR, exist_ok=True)

# Mount static uploads directory for serving complaint evidence photos.
# URL prefix /static/uploads → files on disk at UPLOAD_DIR.
# e.g. /static/uploads/evidence/{uuid}.jpg → UPLOAD_DIR/evidence/{uuid}.jpg
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="static_uploads")

# Configure CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health check endpoint for deployment probes / CI
app.include_router(health_router, prefix="/health", tags=["Health"])

# Mounted API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root() -> dict:
    """Root landing endpoint."""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health"
    }
