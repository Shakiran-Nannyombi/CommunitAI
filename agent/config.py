from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    DO_SPACES_KEY: str = ""
    DO_SPACES_SECRET: str = ""
    DO_SPACES_REGION: str = ""
    DO_SPACES_BUCKET: str = ""
    GRADIENT_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GRADIENT_KB_ID: str = ""
    GRADIENT_INFERENCE_MODEL: str = "llama3.3-70b-instruct"
    GRADIENT_INFERENCE_URL: str = "https://inference.do-ai.run/v1/chat/completions"
    MODEL_ACCESS_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
