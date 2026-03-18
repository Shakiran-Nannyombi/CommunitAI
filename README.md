# CommunitAI

AI-powered Chief of Staff for community leaders. Records or uploads meeting audio, transcribes it, extracts action items, analyzes sentiment, and generates a shareable summary — all automatically.

## Architecture

```
frontend/   Next.js 14 (App Router, TypeScript, Tailwind)
backend/    FastAPI + SQLAlchemy + Alembic + DigitalOcean Spaces
agent/      Gradient AI ADK pipeline (Whisper → Extract → Analyze → Summarize)
```

## Local Development

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.12+

### 1. Clone and configure environment

```bash
cp backend/.env.example backend/.env
cp agent/.env.example agent/.env
cp frontend/.env.example frontend/.env.local
```

Edit each `.env` file with your credentials (see [Environment Variables](#environment-variables)).

### 2. Start all services

```bash
docker compose up --build
```

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000  |
| Backend  | http://localhost:8000  |
| Agent    | http://localhost:8080  |
| Postgres | localhost:5432         |

### 3. Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

## Running Tests

### Agent (Python / Hypothesis)

```bash
cd agent
python3 -m pytest tests/ -q
```

### Backend (Python / Hypothesis)

```bash
cd backend
python3 -m pytest tests/ -q
```

### Frontend (Jest / fast-check)

```bash
cd frontend
npm install
npm test -- --no-coverage
```

## Environment Variables

### Backend (`backend/.env`)

| Variable             | Description                              |
|----------------------|------------------------------------------|
| `DATABASE_URL`       | PostgreSQL connection string             |
| `DO_SPACES_KEY`      | DigitalOcean Spaces access key           |
| `DO_SPACES_SECRET`   | DigitalOcean Spaces secret key           |
| `DO_SPACES_REGION`   | Spaces region (e.g. `nyc3`)              |
| `DO_SPACES_BUCKET`   | Spaces bucket name                       |
| `AGENT_ENDPOINT_URL` | ADK agent base URL                       |
| `AGENT_API_KEY`      | ADK agent API key                        |
| `GRADIENT_API_KEY`   | Gradient AI API key (for inference)      |
| `OPENAI_API_KEY`     | OpenAI API key (for Whisper)             |

### Agent (`agent/.env`)

Same as backend, plus:

| Variable        | Description                                      |
|-----------------|--------------------------------------------------|
| `GRADIENT_KB_ID`| (Optional) Gradient AI Knowledge Base ID         |

### Frontend (`frontend/.env.local`)

| Variable              | Description              |
|-----------------------|--------------------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL     |
