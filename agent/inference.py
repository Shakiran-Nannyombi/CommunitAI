"""
Gradient AI Serverless Inference helper.
Uses the official gradient-ai SDK with MODEL_ACCESS_KEY.
Model: llama3.3-70b-instruct
"""

import os

from gradient import Gradient

from agent.config import settings


def _get_client() -> Gradient:
    return Gradient(model_access_key=settings.GRADIENT_MODEL_ACCESS_KEY)


async def call_inference(system_prompt: str, user_content: str) -> str:
    """
    Call Gradient AI chat completions synchronously (SDK is sync).
    Returns the assistant message content as a string.
    """
    client = _get_client()
    response = client.chat.completions.create(
        model=settings.GRADIENT_INFERENCE_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        max_tokens=2048,
    )
    return response.choices[0].message.content
