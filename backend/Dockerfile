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
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy application source and alembic migrations from repo root build context
COPY backend/ ./backend/
COPY alembic/ ./alembic/
COPY alembic/alembic.ini ./alembic.ini

# Create non-root user and set permissions
RUN addgroup --system civicfix && adduser --system --ingroup civicfix civicfix
RUN mkdir -p /app/uploads/evidence && chown -R civicfix:civicfix /app
USER civicfix

# Expose default backend port
EXPOSE 8000

# Production startup: run entrypoint.sh (waits for DB, applies Alembic migrations, starts Uvicorn on dynamic $PORT)
CMD ["/bin/sh", "/app/backend/entrypoint.sh"]
