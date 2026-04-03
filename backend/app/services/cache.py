import time
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vitamin import Vitamin, SymptomVitaminMap

# Simple in-memory cache with TTL for static seed data
_cache: dict = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


def _get_cached(key: str) -> Optional[list]:
    entry = _cache.get(key)
    if entry is None:
        return None
    data, ts = entry
    if time.time() - ts > CACHE_TTL_SECONDS:
        del _cache[key]
        return None
    return data


def _set_cached(key: str, data: list) -> None:
    _cache[key] = (data, time.time())


async def cached_vitamins(db: AsyncSession) -> List:
    cached = _get_cached("vitamins")
    if cached is not None:
        return cached

    result = await db.execute(select(Vitamin).order_by(Vitamin.id))
    vitamins = result.scalars().all()
    _set_cached("vitamins", vitamins)
    return vitamins


async def cached_symptoms(db: AsyncSession) -> List:
    cached = _get_cached("symptoms")
    if cached is not None:
        return cached

    result = await db.execute(
        select(SymptomVitaminMap).order_by(SymptomVitaminMap.symptom_text)
    )
    symptoms = result.scalars().all()
    _set_cached("symptoms", symptoms)
    return symptoms
