# Deployment Guide

## DigitalOcean Spaces

### 1. Create a bucket

1. Go to **Spaces Object Storage** in the DigitalOcean control panel.
2. Create a new Space — note the region (e.g. `nyc3`) and bucket name.
3. Under **Settings → CORS**, add a rule:
   - Origin: your frontend domain (e.g. `https://your-app.ondigitalocean.app`)
   - Allowed methods: `GET`, `PUT`, `POST`, `DELETE`
   - Allowed headers: `*`

### 2. Create API keys

Go to **API → Spaces Keys** and generate an access key + secret. These map to `DO_SPACES_KEY` and `DO_SPACES_SECRET`.

---

## Managed PostgreSQL

1. Go to **Databases** → Create a PostgreSQL 16 cluster.
2. Once provisioned, copy the **connection string** (URI format) into `DATABASE_URL`.
3. After first deploy, run migrations:
   ```bash
   alembic upgrade head
   ```

---

## DigitalOcean App Platform

### Backend (FastAPI)

1. Create a new App → connect your GitHub repo.
2. Set **Source Directory** to `backend/`.
3. Set **Run Command**:
   ```
   uvicorn main:app --host 0.0.0.0 --port 8080
   ```
4. Add all environment variables from `backend/.env.example`.
5. Attach the Managed PostgreSQL database — App Platform will inject `DATABASE_URL` automatically.

### Frontend (Next.js)

1. Add a second component to the same App → **Source Directory**: `frontend/`.
2. Set **Build Command**: `npm run build`
3. Set **Run Command**: `npm start`
4. Add `NEXT_PUBLIC_API_URL` pointing to the backend component's internal URL (e.g. `https://backend.internal`).

### Agent (Gradient AI ADK)

1. Deploy the agent to the **Gradient AI platform** following their ADK deployment docs.
2. Set `AGENT_ENDPOINT_URL` in the backend env to the deployed agent's endpoint.
3. Set `AGENT_API_KEY` to the key issued by Gradient AI.
4. Optionally set `GRADIENT_KB_ID` to attach a Knowledge Base to the agent.

---

## Environment Variable Reference

See the root [README.md](../README.md#environment-variables) for the full variable list.
