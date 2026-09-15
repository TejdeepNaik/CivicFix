# CivicFix – Production Railway Deployment Guide

This document provides step-by-step instructions for deploying CivicFix to [Railway](https://railway.app/).

---

## 🏗️ Architecture Overview

The production deployment consists of 4 Railway services within a single Railway Project:

```
┌─────────────────┐       ┌─────────────────┐
│ Next.js Frontend│ ────> │ FastAPI Backend │
│ (Standalone)    │       │ (Uvicorn + App) │
└─────────────────┘       └────────┬────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
         ┌───────────────────┐         ┌───────────────────┐
         │ PostgreSQL 16 DB  │         │  Redis 7 Cache    │
         │ (+ pgvector Ext)  │         │                   │
         └───────────────────┘         └───────────────────┘
```

---

## 🚀 Step-by-Step Deployment Instructions

### Step 1: Create a Railway Project
1. Log in to your [Railway Dashboard](https://railway.app/dashboard).
2. Click **+ New Project** and select **Empty Project**.
3. Name your project `CivicFix-Production`.

---

### Step 2: Add Database Services

#### 1. PostgreSQL Database
1. Inside your Railway project, click **+ New** → **Database** → **Add PostgreSQL**.
2. Railway will deploy a managed PostgreSQL container.
3. Once deployed, open the PostgreSQL service variables tab to view:
   * `DATABASE_URL` (Internal private URL, e.g. `postgresql://postgres:password@postgres.railway.internal:5432/railway`)
   * `DATABASE_PUBLIC_URL` (Public external URL)

> **Note**: Alembic automatically enables `pgvector` extension during migrations via revision `1202bc698384_add_hnsw_vector_index.py`.

#### 2. Redis Cache
1. Click **+ New** → **Database** → **Add Redis**.
2. Railway will deploy a managed Redis container.
3. Copy `REDIS_URL` (e.g. `redis://default:password@redis.railway.internal:6379`).

---

### Step 3: Deploy FastAPI Backend Service

1. Click **+ New** → **GitHub Repo** (or **Deploy from CLI**).
2. Select the `CivicFix` repository.
3. Under service **Settings**:
   * **Service Name**: `backend`
   * **Build / Builder**: `Dockerfile`
   * **Dockerfile Path**: `backend/Dockerfile`
   * **Custom Start Command**: `/bin/sh /app/backend/entrypoint.sh`
   * **Healthcheck Path**: `/health`
4. Under **Variables**, add the following environment variables:

| Variable Name | Source / Value | Description |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Connects directly to Railway PostgreSQL |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Connects directly to Railway Redis |
| `JWT_SECRET_KEY` | *(Generate 64-char hex)* | E.g. `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifespan |
| `PROJECT_NAME` | `CivicFix` | App display name |
| `DEBUG` | `false` | Disable debug mode in production |
| `BACKEND_CORS_ORIGINS` | `https://<YOUR-FRONTEND-URL>.up.railway.app` | Updated after deploying Frontend |
| `OPENAI_API_KEY` | *(Optional)* | Only if using OpenAI provider; leave empty for Mock AI |

5. Under **Networking**, click **Generate Domain** (e.g. `https://civicfix-backend-production.up.railway.app`).

---

### Step 4: Deploy Next.js Frontend Service

1. Click **+ New** → **Service** → Select same `CivicFix` repository.
2. Under service **Settings**:
   * **Service Name**: `frontend`
   * **Build / Builder**: `Dockerfile`
   * **Dockerfile Path**: `frontend/Dockerfile`
   * **Build Arguments**:
     * `NEXT_PUBLIC_API_URL` = `https://<YOUR-BACKEND-URL>.up.railway.app/api/v1`
3. Under **Variables**, add:

| Variable Name | Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<YOUR-BACKEND-URL>.up.railway.app/api/v1` | Public API endpoint for browser JS |
| `NODE_ENV` | `production` | Production mode |

4. Under **Networking**, click **Generate Domain** (e.g. `https://civicfix-frontend-production.up.railway.app`).

---

### Step 5: Update Backend CORS Settings

1. Copy your generated Frontend Domain (`https://civicfix-frontend-production.up.railway.app`).
2. Return to the `backend` service **Variables** tab.
3. Update `BACKEND_CORS_ORIGINS` to `https://civicfix-frontend-production.up.railway.app`.
4. Railway will automatically redeploy the backend service.

---

## 🧪 Verification & Health Checks

### 1. Backend Migration & Health Check
Verify backend `/health` endpoint:
```bash
curl https://civicfix-backend-production.up.railway.app/health
```
Expected response (`HTTP 200 OK`):
```json
{
  "status": "ok",
  "database": "connected",
  "project": "CivicFix",
  "version": "0.1.0"
}
```

### 2. Frontend Smoke Test Flow
1. Open `https://civicfix-frontend-production.up.railway.app` in a browser.
2. **Register**: Create a new Citizen account.
3. **Report Issue**: Submit a new complaint with Leaflet map coordinates.
4. **View Detail & Activity**: Verify complaint details, map marker, and audit trail load seamlessly.
5. **Dashboard**: Verify real-time metrics load without CORS or network errors.

---

## 🔒 Security Best Practices

* **Secrets Management**: Never commit `.env` or hardcode JWT secrets.
* **CORS Protection**: Do not set `BACKEND_CORS_ORIGINS=*` in production. Always specify exact frontend domain(s).
* **Database Access**: Internal Railway services connect over the private network via `DATABASE_URL`.
