#!/bin/sh
# Backend Docker entrypoint: run Alembic migrations then start Uvicorn.
# Exit immediately on any error.
set -e

echo "[entrypoint] Waiting for PostgreSQL to be ready..."
# Poll the DB connection using python until it responds (max 30s)
python - <<'EOF'
import sys, time, os
import psycopg2

dsn = os.environ["DATABASE_URL"]
for attempt in range(30):
    try:
        conn = psycopg2.connect(dsn)
        conn.close()
        print(f"[entrypoint] PostgreSQL ready after {attempt+1} attempt(s).")
        sys.exit(0)
    except Exception as e:
        print(f"[entrypoint] Attempt {attempt+1}/30: {e}")
        time.sleep(1)

print("[entrypoint] ERROR: PostgreSQL did not become ready in 30s.")
sys.exit(1)
EOF

echo "[entrypoint] Applying Alembic migrations..."
alembic upgrade head

echo "[entrypoint] Starting Uvicorn..."
PORT="${PORT:-8000}"
exec uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT}" --workers 2
