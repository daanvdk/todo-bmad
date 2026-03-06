from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/todo"
    CORS_ORIGINS: list[str] = ["http://localhost"]

    model_config = {"env_file": ".env"}


settings = Settings()
