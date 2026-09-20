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

# Ensure uploads evidence directory exists
upload_dir = os.path.join(os.getcwd(), "uploads", "evidence")
os.makedirs(upload_dir, exist_ok=True)

# Mount static uploads directory for serving complaint evidence photos
app.mount("/static/uploads", StaticFiles(directory="uploads"), name="static_uploads")

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
