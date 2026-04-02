import time
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, profile, vitamins, recipes, favorites

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vitabalance")

app = FastAPI(
    title="VitaBalance API",
    description="Веб-сервис персонализированного подбора рациона питания",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
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

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(vitamins.router, prefix="/api/vitamins", tags=["vitamins"])
app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["favorites"])


@app.get("/")
async def root():
    return {"message": "VitaBalance API is running"}


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
