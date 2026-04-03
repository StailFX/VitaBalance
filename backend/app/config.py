from typing import List, Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://vitamin_user:vitamin_pass@localhost:5432/vitamin_db"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://vitamin_user:vitamin_pass@localhost:5432/vitamin_db"
    SECRET_KEY: str = ...
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    class Config:
        env_file = ".env"


settings = Settings()
