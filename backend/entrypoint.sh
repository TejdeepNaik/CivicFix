#!/bin/sh
# Backend Docker entrypoint: run Alembic migrations then start Uvicorn.
set -e

echo "[entrypoint] Checking database configuration..."
python - <<'EOF'
import sys, time, os

dsn = os.environ.get("DATABASE_URL", "")
if not dsn or "sqlite" in dsn:
    print("[entrypoint] SQLite or missing DATABASE_URL, skipping PostgreSQL wait.")
    sys.exit(0)

if dsn.startswith("postgres://"):
    dsn = dsn.replace("postgres://", "postgresql://", 1)

for attempt in range(15):
    try:
        import psycopg2
        conn = psycopg2.connect(dsn)
        conn.close()
        print(f"[entrypoint] PostgreSQL ready after {attempt+1} attempt(s).")
        sys.exit(0)
    except Exception as e:
        print(f"[entrypoint] Attempt {attempt+1}/15: {e}")
        time.sleep(1)

print("[entrypoint] WARNING: PostgreSQL connection check timed out, proceeding to start application...")
sys.exit(0)
EOF

echo "[entrypoint] Applying Alembic migrations..."
alembic upgrade head || echo "[entrypoint] Alembic migration skipped or failed, proceeding..."

echo "[entrypoint] Starting Uvicorn..."
PORT="${PORT:-8000}"
exec uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT}" --workers 2
