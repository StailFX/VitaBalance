from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://vitamin_user:vitamin_pass@localhost:5432/vitamin_db"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://vitamin_user:vitamin_pass@localhost:5432/vitamin_db"
    SECRET_KEY: str = ...
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
