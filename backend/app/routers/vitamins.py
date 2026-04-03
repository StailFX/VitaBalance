from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.vitamin import Vitamin, SymptomVitaminMap
from app.models.user_data import UserVitaminEntry
from app.models.product import Product, ProductVitamin
from app.schemas.vitamin import VitaminOut, SymptomOut, VitaminEntryCreate, SymptomSubmit
from app.schemas.analysis import (
    VitaminAnalysisItem,
    AnalysisSnapshot,
    ComparisonItem,
    ProductSearchResult,
    ProductVitaminContent,
)
from app.auth_utils import get_current_user
from app.services.analysis import get_user_analysis, process_symptoms
from app.services.history import get_vitamin_history, compare_vitamin_analysis
from app.services.cache import cached_vitamins, cached_symptoms

router = APIRouter()


@router.get("/", response_model=List[VitaminOut])
async def list_vitamins(db: AsyncSession = Depends(get_db)):
    return await cached_vitamins(db)


@router.get("/symptoms", response_model=List[SymptomOut])
async def list_symptoms(db: AsyncSession = Depends(get_db)):
    return await cached_symptoms(db)


@router.post("/entries")
async def create_entries(
    entries: List[VitaminEntryCreate],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(entries) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 entries per request")
    if len(entries) == 0:
        raise HTTPException(status_code=400, detail="At least one entry required")

    try:
        await db.execute(
            delete(UserVitaminEntry).where(
                UserVitaminEntry.user_id == current_user.id,
                UserVitaminEntry.source == "lab",
            )
        )

        for entry in entries:
            db.add(UserVitaminEntry(
                user_id=current_user.id,
                vitamin_id=entry.vitamin_id,
                value=entry.value,
                source=entry.source,
            ))
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка сохранения данных")
    return {"message": f"Сохранено {len(entries)} записей"}


@router.post("/entries/symptoms")
async def create_entries_from_symptoms(
    data: SymptomSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await process_symptoms(current_user.id, data.symptom_ids, db)
    return {"message": "Симптомы обработаны"}


@router.delete("/entries/{entry_id}")
async def delete_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await db.scalar(
        select(UserVitaminEntry).where(UserVitaminEntry.id == entry_id)
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    await db.delete(entry)
    await db.commit()
    return {"message": "Запись удалена"}


@router.get("/analysis", response_model=List[VitaminAnalysisItem])
async def get_analysis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_analysis(current_user.id, db)


@router.get("/analysis/compare", response_model=List[ComparisonItem])
async def compare_analysis(
    date1: str = Query(..., description="First date (YYYY-MM-DD)"),
    date2: str = Query(..., description="Second date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        d1 = date.fromisoformat(date1)
        d2 = date.fromisoformat(date2)
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты, используйте YYYY-MM-DD")

    return await compare_vitamin_analysis(current_user.id, d1, d2, db)


@router.get("/history", response_model=List[AnalysisSnapshot])
async def get_history(
    limit: int = Query(default=30, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_vitamin_history(current_user.id, db, limit, offset)


@router.get("/products", response_model=List[ProductSearchResult])
async def search_products(
    search: Optional[str] = Query(None, description="Search products by name"),
    vitamin_id: Optional[int] = Query(None, description="Filter by vitamin ID"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).options(selectinload(Product.vitamins))

    if search:
        safe_search = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.where(Product.name.ilike(f"%{safe_search}%"))

    if vitamin_id is not None:
        query = query.join(ProductVitamin).where(
            ProductVitamin.vitamin_id == vitamin_id
        )

    result = await db.execute(query.order_by(Product.name).limit(50))
    products = result.scalars().unique().all()

    vit_result = await db.execute(select(Vitamin))
    vitamins = {v.id: v for v in vit_result.scalars().all()}

    items = []
    for product in products:
        vitamin_content = []
        for pv in product.vitamins:
            vit = vitamins.get(pv.vitamin_id)
            if vit:
                vitamin_content.append(ProductVitaminContent(
                    vitamin_id=pv.vitamin_id,
                    vitamin_name=vit.name,
                    amount_per_100g=pv.amount_per_100g,
                    unit=vit.unit,
                ))
        items.append(ProductSearchResult(
            id=product.id,
            name=product.name,
            category=product.category,
            vitamin_content=vitamin_content,
        ))
    return items
