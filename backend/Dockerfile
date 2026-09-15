# syntax=docker/dockerfile:1
FROM python:3.11-slim AS base

# Set working directory
WORKDIR /app

# Install system dependencies needed by psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (layer cache)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source
COPY backend/ ./backend/
COPY alembic/ ./alembic/
COPY alembic/alembic.ini ./alembic.ini

# Create a non-root user for security
RUN addgroup --system civicfix && adduser --system --ingroup civicfix civicfix
USER civicfix

# Expose backend port
EXPOSE 8000

# Production startup: run Uvicorn with the FastAPI app
# Migrations must be applied separately (entrypoint.sh or initContainer)
CMD ["/bin/sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]
