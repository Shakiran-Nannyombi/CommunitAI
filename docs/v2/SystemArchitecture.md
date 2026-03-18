# Design Document — CommunitAI v2

## Overview

CommunitAI v2 extends the existing Bloomberg Terminal-style AI dashboard with six major capabilities:

1. **In-browser screen + audio recorder** — replaces file upload as the primary meeting capture method
2. **Inline editing** — transcript and action item corrections without leaving the meeting detail page
3. **Slack integration** — one-click posting of meeting summaries to a configured Slack channel
4. **Gmail integration** — `mailto:` link generation for email sharing (pure frontend)
5. **Planner Agent** — per-workspace AI chat assistant with meeting context
6. **Impact Tracker** — per-workspace analytics dashboard derived from existing data

All new features integrate into the existing stack: Next.js 15 + Tailwind v4 frontend, FastAPI + PostgreSQL backend (port 8000), and the Gradient AI agent service (port 8001). No new external services are introduced beyond the Slack webhook (user-supplied URL).

---

## Architecture

```mermaid
---
config:
  theme: forest
---
graph TD
    subgraph Browser
        REC[Recorder Component<br/>MediaRecorder API]
        WS_PAGE[Workspace Page<br/>/workspaces/id]
        MTG_PAGE[Meeting Detail Page<br/>/meetings/id]
    end

    subgraph "Backend (port 8000)"
        MTG_R[meetings router]
        AI_R[action_items router]
        WS_R[workspaces router]
        PLAN_R[planner router]
        IMPACT_R[impact router]
        SLACK_R[integrations router]
    end

    subgraph "Agent Service (port 8001)"
        PIPELINE[transcribe → extract → analyze → summarize]
    end

    subgraph "External"
        GRADIENT[Gradient AI<br/>llama3.3-70b-instruct]
        SLACK_WH[Slack Webhook URL]
        GMAIL[mailto: handler]
        R2[Cloudflare R2]
    end

    REC -->|POST /meetings/id/upload| MTG_R
    MTG_PAGE -->|PATCH /meetings/id/transcript| MTG_R
    MTG_PAGE -->|PATCH /action-items/id| AI_R
    MTG_PAGE -->|POST /meetings/id/action-items| AI_R
    MTG_PAGE -->|DELETE /action-items/id| AI_R
    MTG_PAGE -->|POST /meetings/id/share/slack| SLACK_R
    MTG_PAGE -->|mailto: link| GMAIL
    WS_PAGE -->|POST /workspaces/id/planner/chat| PLAN_R
    WS_PAGE -->|GET /workspaces/id/impact| IMPACT_R
    WS_PAGE -->|PATCH /workspaces/id| WS_R

    MTG_R -->|trigger| PIPELINE
    PIPELINE --> GRADIENT
    MTG_R --> R2
    PLAN_R --> GRADIENT
    SLACK_R --> SLACK_WH
```

### Key Design Decisions

- **Recorder sends to existing upload endpoint** — the `POST /meetings/{id}/upload` endpoint already accepts any blob; the recorder simply sends a `video/webm` blob through the same `uploadAudio` API call. No new backend route needed for recording.
- **Planner Agent lives in the backend** — conversation history is persisted in a new `planner_messages` table so sessions survive page reloads. The backend builds the system prompt with workspace context on every request.
- **Impact Tracker is read-only** — all metrics are computed from existing tables at query time. No new data collection, no caching layer needed at this scale.
- **Gmail is pure frontend** — constructing a `mailto:` link requires no backend involvement and avoids OAuth complexity.
- **Slack webhook is stored per workspace** — the backend calls the webhook server-side to avoid exposing the URL in the browser.
