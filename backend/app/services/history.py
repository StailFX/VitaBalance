from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_data import UserVitaminEntry
from app.schemas.analysis import AnalysisSnapshot, ComparisonItem, HistoryVitaminEntry
from app.services.cache import cached_vitamins
from app.services.utils import classify_vitamin_status, get_norms_for_gender, get_user_gender


def _snapshot_key(entry_date: datetime) -> str:
    return entry_date.isoformat()


def _group_snapshots(
    entries: List[UserVitaminEntry],
    vitamins: Dict[int, object],
    gender: Optional[str],
) -> Tuple[List[str], Dict[str, Dict[int, HistoryVitaminEntry]]]:
    grouped: Dict[str, Dict[int, HistoryVitaminEntry]] = defaultdict(dict)
    grouped_sources: Dict[str, Dict[int, str]] = defaultdict(dict)
    snapshot_order: List[str] = []

    for entry in entries:
        snapshot_key = _snapshot_key(entry.entry_date)
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

    return snapshot_order, grouped


def _resolve_snapshot_key(requested: str, snapshot_order: List[str]) -> Optional[str]:
    normalized = requested.strip()
    if not normalized:
        return None
    if normalized in snapshot_order:
        return normalized

    normalized_no_z = normalized.removesuffix("Z")
    for snapshot_key in snapshot_order:
        if snapshot_key == normalized_no_z:
            return snapshot_key
        if snapshot_key.split(".")[0] == normalized_no_z.split(".")[0]:
            return snapshot_key

    requested_day = normalized.split("T", 1)[0]
    for snapshot_key in snapshot_order:
        if snapshot_key.startswith(f"{requested_day}T"):
            return snapshot_key

    return None


async def _load_snapshot_map(
    user_id: int,
    db: AsyncSession,
) -> Tuple[List[str], Dict[str, Dict[int, HistoryVitaminEntry]], Dict[int, object], Optional[str]]:
    gender = await get_user_gender(user_id, db)
    vitamins = {vitamin.id: vitamin for vitamin in await cached_vitamins(db)}

    result = await db.execute(
        select(UserVitaminEntry)
        .where(UserVitaminEntry.user_id == user_id)
        .order_by(UserVitaminEntry.entry_date.desc(), UserVitaminEntry.id.desc())
    )
    entries = result.scalars().all()
    if not entries:
        return [], {}, vitamins, gender

    snapshot_order, grouped = _group_snapshots(entries, vitamins, gender)
    return snapshot_order, grouped, vitamins, gender


async def get_vitamin_history(
    user_id: int,
    db: AsyncSession,
    limit: int = 30,
    offset: int = 0,
) -> List[AnalysisSnapshot]:
    """Get paginated vitamin entry history grouped by exact submission timestamp."""
    snapshot_order, grouped, _, _ = await _load_snapshot_map(user_id, db)
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
    snapshot1: str,
    snapshot2: str,
    db: AsyncSession,
) -> List[ComparisonItem]:
    """Compare vitamin levels between two exact history snapshots."""
    snapshot_order, grouped, vitamins, gender = await _load_snapshot_map(user_id, db)

    snapshot_key1 = _resolve_snapshot_key(snapshot1, snapshot_order)
    snapshot_key2 = _resolve_snapshot_key(snapshot2, snapshot_order)
    entries1 = grouped.get(snapshot_key1, {}) if snapshot_key1 else {}
    entries2 = grouped.get(snapshot_key2, {}) if snapshot_key2 else {}

    all_vitamin_ids = set(entries1.keys()) | set(entries2.keys())
    comparison: List[ComparisonItem] = []

    for vitamin_id in sorted(all_vitamin_ids):
        vitamin = vitamins.get(vitamin_id)
        if not vitamin:
            continue

        entry1 = entries1.get(vitamin_id)
        entry2 = entries2.get(vitamin_id)
        value1 = entry1.value if entry1 else None
        value2 = entry2.value if entry2 else None
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
