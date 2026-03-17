"""
Gradient AI Serverless Inference helper.
Uses the OpenAI-compatible /v1/chat/completions endpoint directly via httpx.
Model: llama3.3-70b-instruct
"""

import httpx

from agent.config import settings


async def call_inference(system_prompt: str, user_content: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            settings.GRADIENT_INFERENCE_URL,
            headers={"Authorization": f"Bearer {settings.GRADIENT_API_KEY}"},
            json={
                "model": settings.GRADIENT_INFERENCE_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
