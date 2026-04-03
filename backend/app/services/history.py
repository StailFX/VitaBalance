from typing import List, Dict, Optional
from collections import defaultdict
from datetime import date, datetime

from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vitamin import Vitamin
from app.models.user_data import UserVitaminEntry
from app.schemas.analysis import (
    AnalysisSnapshot,
    HistoryVitaminEntry,
    ComparisonItem,
)
from app.services.utils import classify_vitamin_status, get_norms_for_gender, get_user_gender


async def get_vitamin_history(
    user_id: int,
    db: AsyncSession,
    limit: int = 30,
    offset: int = 0,
) -> List[AnalysisSnapshot]:
    """Get paginated vitamin entry history grouped by date."""
    gender = await get_user_gender(user_id, db)

    vit_result = await db.execute(select(Vitamin))
    vitamins = {v.id: v for v in vit_result.scalars().all()}

    # Get distinct dates first for proper date-based pagination
    date_subq = (
        select(
            sa_func.date_trunc("day", UserVitaminEntry.entry_date).label("entry_day")
        )
        .where(UserVitaminEntry.user_id == user_id)
        .group_by(sa_func.date_trunc("day", UserVitaminEntry.entry_date))
        .order_by(sa_func.date_trunc("day", UserVitaminEntry.entry_date).desc())
        .offset(offset)
        .limit(limit)
        .subquery()
    )

    result = await db.execute(
        select(UserVitaminEntry)
        .where(
            UserVitaminEntry.user_id == user_id,
            sa_func.date_trunc("day", UserVitaminEntry.entry_date).in_(
                select(date_subq.c.entry_day)
            ),
        )
        .order_by(UserVitaminEntry.entry_date.desc())
    )
    entries = result.scalars().all()

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

    return [
        AnalysisSnapshot(date=date_key, entries=entries_list)
        for date_key, entries_list in sorted(grouped.items(), reverse=True)
    ]


async def compare_vitamin_analysis(
    user_id: int,
    d1: date,
    d2: date,
    db: AsyncSession,
) -> List[ComparisonItem]:
    """Compare vitamin levels between two dates."""
    gender = await get_user_gender(user_id, db)

    vit_result = await db.execute(select(Vitamin))
    vitamins = {v.id: v for v in vit_result.scalars().all()}

    async def get_closest_entries(target_date: date) -> Dict[int, float]:
        """Find vitamin entries closest to the target date."""
        target_dt = datetime(target_date.year, target_date.month, target_date.day)
        result = await db.execute(
            select(UserVitaminEntry)
            .where(UserVitaminEntry.user_id == user_id)
            .order_by(sa_func.abs(sa_func.extract("epoch", UserVitaminEntry.entry_date - target_dt)))
            .limit(50)
        )
        entries = result.scalars().all()
        if not entries:
            return {}
        nearest_date: Optional[str] = None
        grouped: Dict[int, float] = {}
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

        def get_status(value: Optional[float], nmin: float = norm_min, nmax: float = norm_max) -> str:
            if value is None:
                return "no_data"
            return classify_vitamin_status(value, nmin, nmax)

        change_percent = None
        if val1 is not None and val2 is not None and val1 != 0:
            change_percent = round(((val2 - val1) / val1) * 100, 2)

        comparison.append(ComparisonItem(
            vitamin_name=vit.name,
            date1_value=val1,
            date2_value=val2,
            change_percent=change_percent,
            status1=get_status(val1),
            status2=get_status(val2),
        ))

    return comparison
