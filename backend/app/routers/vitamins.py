from typing import List, Optional
from collections import defaultdict
from datetime import date, datetime

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, delete, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserProfile
from app.models.vitamin import Vitamin, SymptomVitaminMap
from app.models.user_data import UserVitaminEntry
from app.models.product import Product, ProductVitamin
from app.schemas.vitamin import VitaminOut, SymptomOut, VitaminEntryCreate, SymptomSubmit
from app.schemas.analysis import (
    VitaminAnalysisItem,
    AnalysisSnapshot,
    HistoryVitaminEntry,
    ProductSearchResult,
    ProductVitaminContent,
)
from app.auth_utils import get_current_user
from app.services.analysis import get_user_analysis, process_symptoms
from app.services.utils import classify_vitamin_status, get_norms_for_gender, get_user_gender

router = APIRouter()


@router.get("/", response_model=List[VitaminOut])
async def list_vitamins(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vitamin).order_by(Vitamin.id))
    return result.scalars().all()


@router.get("/symptoms", response_model=List[SymptomOut])
async def list_symptoms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SymptomVitaminMap).order_by(SymptomVitaminMap.symptom_text)
    )
    return result.scalars().all()


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


@router.get("/analysis/compare")
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

    gender = await get_user_gender(current_user.id, db)

    # Get all vitamins for norm lookup
    vit_result = await db.execute(select(Vitamin))
    vitamins = {v.id: v for v in vit_result.scalars().all()}

    async def get_closest_entries(target_date: date):
        """Find vitamin entries closest to the target date."""
        target_dt = datetime(target_date.year, target_date.month, target_date.day)
        # Find entries for exact date first, then nearest
        result = await db.execute(
            select(UserVitaminEntry)
            .where(UserVitaminEntry.user_id == current_user.id)
            .order_by(sa_func.abs(sa_func.extract("epoch", UserVitaminEntry.entry_date - target_dt)))
            .limit(50)
        )
        entries = result.scalars().all()
        if not entries:
            return {}
        # Group by closest date -- take only entries from the nearest date
        nearest_date = None
        grouped = {}
        for entry in entries:
            entry_date_key = entry.entry_date.strftime("%Y-%m-%d")
            if nearest_date is None:
                nearest_date = entry_date_key
            if entry_date_key != nearest_date:
                break
            grouped[entry.vitamin_id] = entry.value
        return grouped

    entries1 = await get_closest_entries(d1)
    entries2 = await get_closest_entries(d2)

    all_vitamin_ids = set(entries1.keys()) | set(entries2.keys())
    comparison = []
    for vid in sorted(all_vitamin_ids):
        vit = vitamins.get(vid)
        if not vit:
            continue
        val1 = entries1.get(vid)
        val2 = entries2.get(vid)

        norm_min, norm_max = get_norms_for_gender(vit, gender)

        def get_status(value, nmin=norm_min, nmax=norm_max):
            if value is None:
                return "no_data"
            return classify_vitamin_status(value, nmin, nmax)

        change_percent = None
        if val1 is not None and val2 is not None and val1 != 0:
            change_percent = round(((val2 - val1) / val1) * 100, 2)

        comparison.append({
            "vitamin_name": vit.name,
            "date1_value": val1,
            "date2_value": val2,
            "change_percent": change_percent,
            "status1": get_status(val1),
            "status2": get_status(val2),
        })

    return comparison


@router.get("/history", response_model=List[AnalysisSnapshot])
async def get_history(
    limit: int = Query(default=30, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    gender = await get_user_gender(current_user.id, db)

    # Get all vitamins for norm lookup
    vit_result = await db.execute(select(Vitamin))
    vitamins = {v.id: v for v in vit_result.scalars().all()}

    # Get entries for this user ordered by date with pagination
    result = await db.execute(
        select(UserVitaminEntry)
        .where(UserVitaminEntry.user_id == current_user.id)
        .order_by(UserVitaminEntry.entry_date.desc())
        .limit(limit)
        .offset(offset)
    )
    entries = result.scalars().all()

    # Group by date (date part only)
    grouped = defaultdict(list)
    for entry in entries:
        date_key = entry.entry_date.strftime("%Y-%m-%d")
        vit = vitamins.get(entry.vitamin_id)
        if not vit:
            continue
        norm_min, norm_max = get_norms_for_gender(vit, gender)
        status = classify_vitamin_status(entry.value, norm_min, norm_max)

        grouped[date_key].append(HistoryVitaminEntry(
            vitamin_id=vit.id,
            vitamin_name=vit.name,
            value=entry.value,
            unit=vit.unit,
            status=status,
        ))

    # Build sorted list of snapshots (newest first)
    snapshots = [
        AnalysisSnapshot(date=date_key, entries=entries_list)
        for date_key, entries_list in sorted(grouped.items(), reverse=True)
    ]
    return snapshots


@router.get("/products", response_model=List[ProductSearchResult])
async def search_products(
    search: Optional[str] = Query(None, description="Search products by name"),
    vitamin_id: Optional[int] = Query(None, description="Filter by vitamin ID"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).options(selectinload(Product.vitamins))

    if search:
        safe_search = search.replace("%", "\\%").replace("_", "\\_")
        query = query.where(Product.name.ilike(f"%{safe_search}%"))

    if vitamin_id is not None:
        query = query.join(ProductVitamin).where(
            ProductVitamin.vitamin_id == vitamin_id
        )

    result = await db.execute(query.order_by(Product.name).limit(50))
    products = result.scalars().unique().all()

    # Get vitamin names for enrichment
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
