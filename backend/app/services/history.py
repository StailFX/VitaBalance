from collections import defaultdict
from datetime import date, datetime
from typing import Dict, List, Optional

from sqlalchemy import func as sa_func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_data import UserVitaminEntry
from app.schemas.analysis import AnalysisSnapshot, ComparisonItem, HistoryVitaminEntry
from app.services.cache import cached_vitamins
from app.services.utils import classify_vitamin_status, get_norms_for_gender, get_user_gender


async def get_vitamin_history(
    user_id: int,
    db: AsyncSession,
    limit: int = 30,
    offset: int = 0,
) -> List[AnalysisSnapshot]:
    """Get paginated vitamin entry history grouped by submission timestamp."""
    gender = await get_user_gender(user_id, db)
    vitamins = {vitamin.id: vitamin for vitamin in await cached_vitamins(db)}

    result = await db.execute(
        select(UserVitaminEntry)
        .where(UserVitaminEntry.user_id == user_id)
        .order_by(UserVitaminEntry.entry_date.desc(), UserVitaminEntry.id.desc())
    )
    entries = result.scalars().all()
    if not entries:
        return []

    grouped: Dict[str, Dict[int, HistoryVitaminEntry]] = defaultdict(dict)
    grouped_sources: Dict[str, Dict[int, str]] = defaultdict(dict)
    snapshot_order: List[str] = []

    for entry in entries:
        snapshot_key = entry.entry_date.replace(microsecond=0).isoformat()
        if snapshot_key not in grouped:
            snapshot_order.append(snapshot_key)

        vitamin = vitamins.get(entry.vitamin_id)
        if not vitamin:
            continue

        norm_min, norm_max = get_norms_for_gender(vitamin, gender)
        status = classify_vitamin_status(entry.value, norm_min, norm_max)

        existing_source = grouped_sources[snapshot_key].get(vitamin.id)
        if existing_source == "lab" and entry.source != "lab":
            continue

        grouped[snapshot_key][vitamin.id] = HistoryVitaminEntry(
            vitamin_id=vitamin.id,
            vitamin_code=vitamin.code,
            vitamin_name=vitamin.name,
            value=entry.value,
            unit=vitamin.unit,
            norm_min=norm_min,
            norm_max=norm_max,
            status=status,
        )
        grouped_sources[snapshot_key][vitamin.id] = entry.source

    selected_snapshots = snapshot_order[offset: offset + limit]

    return [
        AnalysisSnapshot(
            date=snapshot_key,
            entries=sorted(grouped[snapshot_key].values(), key=lambda item: item.vitamin_name),
        )
        for snapshot_key in selected_snapshots
    ]


async def compare_vitamin_analysis(
    user_id: int,
    d1: date,
    d2: date,
    db: AsyncSession,
) -> List[ComparisonItem]:
    """Compare vitamin levels between two dates."""
    gender = await get_user_gender(user_id, db)
    vitamins = {vitamin.id: vitamin for vitamin in await cached_vitamins(db)}

    async def get_closest_entries(target_date: date) -> Dict[int, float]:
        target_dt = datetime(target_date.year, target_date.month, target_date.day)
        result = await db.execute(
            select(UserVitaminEntry)
            .where(UserVitaminEntry.user_id == user_id)
            .order_by(
                sa_func.abs(sa_func.extract("epoch", UserVitaminEntry.entry_date - target_dt)),
                UserVitaminEntry.entry_date.desc(),
                UserVitaminEntry.id.desc(),
            )
            .limit(50)
        )
        entries = result.scalars().all()
        if not entries:
            return {}

        nearest_date: Optional[str] = None
        grouped: Dict[int, float] = {}
        grouped_sources: Dict[int, str] = {}
        for entry in entries:
            entry_date_key = entry.entry_date.strftime("%Y-%m-%d")
            if nearest_date is None:
                nearest_date = entry_date_key
            if entry_date_key != nearest_date:
                break
            existing_source = grouped_sources.get(entry.vitamin_id)
            if existing_source == "lab" and entry.source != "lab":
                continue
            grouped[entry.vitamin_id] = entry.value
            grouped_sources[entry.vitamin_id] = entry.source
        return grouped

    entries1 = await get_closest_entries(d1)
    entries2 = await get_closest_entries(d2)

    all_vitamin_ids = set(entries1.keys()) | set(entries2.keys())
    comparison: List[ComparisonItem] = []
    for vitamin_id in sorted(all_vitamin_ids):
        vitamin = vitamins.get(vitamin_id)
        if not vitamin:
            continue

        value1 = entries1.get(vitamin_id)
        value2 = entries2.get(vitamin_id)
        norm_min, norm_max = get_norms_for_gender(vitamin, gender)

        def get_status(value: Optional[float], nmin: float = norm_min, nmax: float = norm_max) -> str:
            if value is None:
                return "no_data"
            return classify_vitamin_status(value, nmin, nmax)

        change_percent = None
        if value1 is not None and value2 is not None and value1 != 0:
            change_percent = round(((value2 - value1) / value1) * 100, 2)

        comparison.append(
            ComparisonItem(
                vitamin_name=vitamin.name,
                date1_value=value1,
                date2_value=value2,
                change_percent=change_percent,
                status1=get_status(value1),
                status2=get_status(value2),
            )
        )

    return comparison
