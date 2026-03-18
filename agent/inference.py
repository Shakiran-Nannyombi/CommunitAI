import httpx

from agent.config import settings


async def call_inference(system_prompt: str, user_content: str) -> str:
    """Call Gradient AI Serverless Inference with the given prompts."""
    url = settings.GRADIENT_INFERENCE_URL or "https://inference.do-ai.run/v1/chat/completions"
    model = settings.GRADIENT_INFERENCE_MODEL or "llama3.3-70b-instruct"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            headers={"Authorization": f"Bearer {settings.GRADIENT_API_KEY}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
