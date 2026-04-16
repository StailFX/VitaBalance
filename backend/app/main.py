import time
import asyncio
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app import models as _models  # noqa: F401
from app.config import settings
from app.database import Base, engine
from app.routers import auth, profile, vitamins, recipes, favorites, notifications

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vitabalance")

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="VitaBalance API",
    description="Веб-сервис персонализированного подбора рациона питания",
    version="1.0.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(
        "%s %s -> %s (%.2fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["profile"])
app.include_router(vitamins.router, prefix="/api/v1/vitamins", tags=["vitamins"])
app.include_router(recipes.router, prefix="/api/v1/recipes", tags=["recipes"])
app.include_router(favorites.router, prefix="/api/v1/favorites", tags=["favorites"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])

# Backward compatibility: keep old /api/ routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"], include_in_schema=False)
app.include_router(profile.router, prefix="/api/profile", tags=["profile"], include_in_schema=False)
app.include_router(vitamins.router, prefix="/api/vitamins", tags=["vitamins"], include_in_schema=False)
app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"], include_in_schema=False)
app.include_router(favorites.router, prefix="/api/favorites", tags=["favorites"], include_in_schema=False)
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"], include_in_schema=False)


@app.on_event("startup")
async def startup_check_db():
    """Verify database is reachable on startup with retry."""
    for attempt in range(1, 16):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database connection OK")
            logger.info("Database schema ensured")
            return
        except Exception as e:
            logger.warning("DB connection attempt %d/15 failed: %s", attempt, e)
            if attempt < 15:
                await asyncio.sleep(2)
    logger.error("Could not connect to database after 15 attempts")


@app.get("/")
async def root():
    return {"message": "VitaBalance API is running"}


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
