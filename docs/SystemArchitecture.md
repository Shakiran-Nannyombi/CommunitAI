# Architecture

CommunitAI is an AI-powered Chief of Staff platform for community leaders. It automates the administrative overhead of community management by processing meeting recordings through a pipeline of transcription, action item extraction, sentiment analysis, and summary generation — all orchestrated by a single Gradient AI Agent.

The system is composed of three main layers:

- **Frontend** — Next.js + Tailwind CSS dashboard for recording, uploading, and reviewing meeting outputs
- **Backend** — Python FastAPI service that handles file ingestion, database operations, and agent invocation
- **AI Agent** — CommunitAI_Agent built with the DigitalOcean Gradient AI ADK, orchestrating all LLM and transcription tasks

## Design Goals

- Single agent entry point for all AI processing (ADK `@entrypoint` pattern)
- Sequential, fault-tolerant pipeline with per-step retry and status tracking
- Storage-first approach: audio, transcripts, and reports live in DigitalOcean Spaces; metadata and action items live in PostgreSQL
- Stateless frontend that polls/fetches from FastAPI — no direct AI calls from the browser

### System Architecture Diagram

```mermaid
---
config:
  theme: forest
---
graph TD
    subgraph Browser
        A[Recorder / Uploader]
        B[Next.js Dashboard]
    end

    subgraph "FastAPI Backend"
        C[POST /meetings]
        D["POST /meetings/:id/upload"]
        E[GET /meetings]
        F["GET /meetings/:id"]
        G["PATCH /action-items/:id/complete"]
        H["POST /meetings/:id/retry"]
    end

    subgraph "CommunitAI_Agent ADK"
        I["@entrypoint process_meeting"]
        J[Transcriber]
        K[Extractor]
        L[Sentiment_Analyzer]
        M[Summarizer]
    end

    subgraph "External Services"
        N[OpenAI Whisper API]
        O["Gradient AI Serverless Inference<br/>https://inference.do-ai.run/v1/chat/completions"]
        P["Optional: Gradient Knowledge Base"]
    end

    subgraph "Storage & DB"
        Q["DigitalOcean Spaces<br/>audio / transcripts / summaries / reports"]
        R["PostgreSQL<br/>meetings / transcripts / action_items<br/>sentiment_reports / summaries"]
    end

    A -->|upload audio| D
    B -->|REST| E
    B -->|REST| F
    B -->|REST| G
    B -->|REST| H
    B -->|REST| C

    D -->|store audio| Q
    D -->|create meeting row| R
    D -->|invoke agent| I

    I --> J
    J -->|audio URL| N
    N -->|transcript text| J
    J -->|store transcript| Q
    J -->|update DB| R

    I --> K
    K -->|transcript| O
    O -->|action items JSON| K
    K -->|persist| R

    I --> L
    L -->|transcript| O
    O -->|sentiment JSON| L
    L -->|persist| R

    I --> M
    M -->|transcript| O
    O -->|summary text| M
    M -->|store summary| Q
    M -->|persist| R

    P -.->|knowledge context| I

    F -->|read| R
    F -->|read| Q
```

### Data Flow Summary

1. User records or uploads audio in the browser
2. FastAPI stores the audio file in Spaces and creates a `meetings` row in PostgreSQL
3. FastAPI invokes the CommunitAI_Agent via ADK with the `meeting_id`
4. Agent runs the pipeline sequentially: Transcribe → Extract → Analyze → Summarize
5. Each step stores its output in Spaces and/or PostgreSQL and updates the meeting status
6. The Next.js frontend polls `GET /meetings/{id}` to display results as they become available
