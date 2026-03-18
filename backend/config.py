from pathlib import Path

from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    DO_SPACES_KEY: str = ""
    DO_SPACES_SECRET: str = ""
    DO_SPACES_REGION: str = ""
    DO_SPACES_BUCKET: str = ""
    DO_SPACES_ENDPOINT: str = ""
    AGENT_ENDPOINT_URL: str = ""
    AGENT_API_KEY: str = ""
    GRADIENT_API_KEY: str = ""
    GRADIENT_MODEL_ACCESS_KEY: str = ""
    OPENAI_API_KEY: str = ""
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DEMO_EMAIL: str = "demo@communitai.app"
    DEMO_PASSWORD: str = "demo1234"

    class Config:
        # On Heroku, env vars are injected directly — .env file is optional
        env_file = str(_ENV_FILE) if _ENV_FILE.exists() else None
        extra = "ignore"


settings = Settings()
