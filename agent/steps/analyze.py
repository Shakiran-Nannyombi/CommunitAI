"""
Step 3 — Sentiment Analysis
Calls Gradient AI LLM with the analyze prompt, validates classification,
persists to sentiment_reports table.
"""

import json
import logging
from pathlib import Path

from agent.db import SessionLocal
from agent.inference import call_inference
from agent.utils import with_retry

from sqlalchemy import text

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "analyze.txt"
VALID_CLASSIFICATIONS = {"positive", "neutral", "negative"}


async def analyze(meeting_id: str, transcript: str) -> dict:
    """
    Analyze sentiment of transcript, persist to DB.
    Returns the sentiment report dict.
    """
    system_prompt = PROMPT_PATH.read_text()

    async def _run():
        raw = await call_inference(system_prompt, transcript)
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        report: dict = json.loads(cleaned.strip())
        if report.get("classification") not in VALID_CLASSIFICATIONS:
            raise ValueError(f"Invalid classification: {report.get('classification')}")
        return report

    try:
        report = await with_retry(_run, max_retries=3)
    except Exception as exc:
        logger.error("Sentiment analysis failed for meeting %s: %s", meeting_id, exc)
        report = {"classification": "neutral", "signals": []}

    async with SessionLocal() as session:
        await session.execute(
            text(
                """
                INSERT INTO sentiment_reports (id, meeting_id, classification, signals)
                VALUES (gen_random_uuid(), :meeting_id, :classification, cast(:signals as jsonb))
                """
            ),
            {
                "meeting_id": meeting_id,
                "classification": report["classification"],
                "signals": json.dumps(report.get("signals", [])),
            },
        )
        await session.commit()

    return report
