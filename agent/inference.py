import httpx

from agent.config import settings

INFERENCE_URL = "https://inference.do-ai.run/v1/chat/completions"
MODEL = "meta-llama-3.1-70b-instruct"


async def call_inference(system_prompt: str, user_content: str) -> str:
    """Call Gradient AI Serverless Inference with the given prompts.

    If GRADIENT_KB_ID is configured, appends a note to the system prompt
    instructing the model to use the knowledge base context.
    """
    effective_system_prompt = system_prompt
    if settings.GRADIENT_KB_ID:
        effective_system_prompt = (
            f"{system_prompt}\n\n"
            f"Note: Use the knowledge base (ID: {settings.GRADIENT_KB_ID}) "
            "for additional community management context when relevant."
        )

    async with httpx.AsyncClient() as client:
        response = await client.post(
            INFERENCE_URL,
            headers={"Authorization": f"Bearer {settings.GRADIENT_API_KEY}"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": effective_system_prompt},
                    {"role": "user", "content": user_content},
                ],
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
