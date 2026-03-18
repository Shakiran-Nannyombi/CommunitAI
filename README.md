<div align="center">

<!-- Animated wave header -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0,000000,60,166534,100,4ADE80&height=200&section=header&text=CommunitAI&fontSize=72&fontColor=4ADE80&fontAlignY=38&animation=fadeIn&desc=Record.%20Transcribe.%20Act.&descAlignY=58&descSize=20&descColor=86efac" width="100%"/>

<img src="assets/logo.svg" alt="CommunitAI Platform" width="25%" style="border-radius: 12px;"/>

<!-- Typing animation -->
[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=22&pause=1000&color=4ADE80&background=00000000&center=true&vCenter=true&multiline=false&width=700&height=50&lines=Upload+a+recording...;Get+action+items+automatically;Understand+community+sentiment;Share+Slack-ready+summaries;Powered+by+Gradient+AI+%26+Whisper)](https://git.io/typing-svg)

<br/>

<!-- Badges -->
![Python](https://img.shields.io/badge/Python_3.12-16a34a?style=for-the-badge&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_14-15803d?style=for-the-badge&logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-166534?style=for-the-badge&logo=fastapi&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-14532d?style=for-the-badge&logo=tailwind-css&logoColor=white)
![DigitalOcean](https://img.shields.io/badge/DigitalOcean-16a34a?style=for-the-badge&logo=digitalocean&logoColor=white)
![Hypothesis](https://img.shields.io/badge/Property_Tests-15803d?style=for-the-badge&logo=pytest&logoColor=white)

<br/>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/grass.png" width="100%"/>

</div>

<br/>

# What is CommunitAI?

CommunitAI is a production-ready AI platform that automates the administrative burden of community management. Built on DigitalOcean Gradient AI, it turns messy meeting recordings into structured action items, sentiment reports, and shareable summaries — automatically.

> Community leads spend more time on spreadsheets than on people. CommunitAI fixes that.

<br/>

---

## Features

| Feature | Description |
|---|---|
| **Smart Transcription** | Upload or record audio for instant high-accuracy transcription via Whisper |
| **Action Item Extraction** | Automatically identifies who owns what and assigns deadlines |
| **Sentiment Analysis** | Detects burnout, conflict, or positive momentum in meeting transcripts |
| **Auto Summaries** | Generates TL;DR reports ready to post to Discord or Slack |
| **Retry & Resume** | Failed steps resume from where they left off — no full re-runs |
| **Knowledge Base** | Optionally attach a Gradient AI KB for community-specific context |
---

## Architecture

```
frontend/   Next.js 14  — App Router · TypeScript · Tailwind CSS
backend/    FastAPI     — SQLAlchemy · Alembic · DigitalOcean Spaces
agent/      Gradient AI — ADK pipeline: Whisper → Extract → Analyze → Summarize
```

---

## Local Development

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.12+

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
cp agent/.env.example    agent/.env
cp frontend/.env.example frontend/.env.local
```

Edit each `.env` with your credentials — see [Environment Variables](#environment-variables).

### 2. Start all services

```bash
docker compose up --build
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:8000 |
| Agent    | http://localhost:8080 |
| Postgres | localhost:5432 |

### 3. Run migrations

```bash
docker compose exec backend alembic upgrade head
```

---

## Running Tests

```bash
# Agent — Python / Hypothesis
python3 -m pytest agent/tests/ -q

# Backend — Python / Hypothesis
python3 -m pytest backend/tests/ -q

# Frontend — Jest / fast-check
cd frontend && npm install && npm test -- --no-coverage
```

---

## Environment Variables

### Backend & Agent

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DO_SPACES_KEY` | DigitalOcean Spaces access key |
| `DO_SPACES_SECRET` | DigitalOcean Spaces secret |
| `DO_SPACES_REGION` | Spaces region (e.g. `nyc3`) |
| `DO_SPACES_BUCKET` | Spaces bucket name |
| `GRADIENT_API_KEY` | Gradient AI API key |
| `OPENAI_API_KEY` | OpenAI key (Whisper) |
| `AGENT_ENDPOINT_URL` | ADK agent base URL |
| `AGENT_API_KEY` | ADK agent API key |
| `GRADIENT_KB_ID` | *(Optional)* Gradient AI Knowledge Base ID |

### Frontend

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

---

## Deployment

See [`docs/deployment.md`](docs/deployment.md) for DigitalOcean App Platform, Managed PostgreSQL, Spaces, and ADK agent deployment instructions.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

<div align="center">
<br/>

<!-- Animated footer wave -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0,4ADE80,60,166534,100,000000&height=120&section=footer&text=Built+for+communities.+Powered+by+AI.&fontSize=16&fontColor=4ADE80&fontAlignY=65&animation=fadeIn" width="100%"/>

</div>
</div>
