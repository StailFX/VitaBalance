from typing import List

from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vitamin import Vitamin, SymptomVitaminMap
from app.models.user_data import UserVitaminEntry
from app.schemas.analysis import VitaminAnalysisItem
from app.services.utils import classify_vitamin_status, get_norms_for_gender, get_user_gender


async def get_user_analysis(user_id: int, db: AsyncSession) -> List[VitaminAnalysisItem]:
    """Analyze user's vitamin levels and return status for each vitamin."""
    gender = await get_user_gender(user_id, db)

    # Get all vitamins
    result = await db.execute(select(Vitamin))
    vitamins = result.scalars().all()

    # Get latest user entries (most recent per vitamin) using a subquery
    latest_subq = (
        select(
            UserVitaminEntry.vitamin_id,
            func.max(UserVitaminEntry.entry_date).label("max_date")
        )
        .where(UserVitaminEntry.user_id == user_id)
        .group_by(UserVitaminEntry.vitamin_id)
        .subquery()
    )

    entries_result = await db.execute(
        select(UserVitaminEntry)
        .join(latest_subq,
            (UserVitaminEntry.vitamin_id == latest_subq.c.vitamin_id) &
            (UserVitaminEntry.entry_date == latest_subq.c.max_date))
        .where(UserVitaminEntry.user_id == user_id)
    )
    entries = entries_result.scalars().all()

    # Build map: vitamin_id -> latest value
    latest_values = {entry.vitamin_id: entry.value for entry in entries}

    analysis = []
    for vit in vitamins:
        value = latest_values.get(vit.id)
        norm_min, norm_max = get_norms_for_gender(vit, gender)

        if value is not None:
            status = classify_vitamin_status(value, norm_min, norm_max)
            if status == "deficiency":
                severity = round(((norm_min - value) / norm_min) * 100, 1)
            elif status == "excess":
                severity = round(((value - norm_max) / norm_max) * 100, 1)
            else:
                severity = 0.0
        else:
            status = "no_data"
            severity = 0.0

        analysis.append(VitaminAnalysisItem(
            vitamin_id=vit.id,
            vitamin_name=vit.name,
            value=value,
            unit=vit.unit,
            norm_min=norm_min,
            norm_max=norm_max,
            status=status,
            severity=severity,
        ))

    return analysis


async def process_symptoms(user_id: int, symptom_ids: List[int], db: AsyncSession):
    """Convert symptom selections into estimated vitamin values (below norm)."""
    # Get symptom mappings
    result = await db.execute(
        select(SymptomVitaminMap).where(SymptomVitaminMap.id.in_(symptom_ids))
    )
    symptoms = result.scalars().all()

    gender = await get_user_gender(user_id, db)

    # Aggregate weights per vitamin
    vitamin_weights = {}
    for s in symptoms:
        if s.vitamin_id not in vitamin_weights:
            vitamin_weights[s.vitamin_id] = 0
        vitamin_weights[s.vitamin_id] += s.weight

    # Get vitamins for norm data
    vit_result = await db.execute(select(Vitamin))
    all_vitamins = {v.id: v for v in vit_result.scalars().all()}

    # Delete old symptom-based entries
    await db.execute(
        delete(UserVitaminEntry).where(
            UserVitaminEntry.user_id == user_id,
            UserVitaminEntry.source == "symptom",
        )
    )

    # Create entries: higher weight = more deficiency (value further below norm)
    for vit_id, total_weight in vitamin_weights.items():
        vit = all_vitamins.get(vit_id)
        if not vit:
            continue
        norm_min, _ = get_norms_for_gender(vit, gender)
        # Estimate value as a fraction below the minimum norm
        # Clamp total_weight between 0 and 2
        clamped = min(total_weight, 2.0)
        reduction = clamped / 2.0  # 0 to 1.0
        estimated_value = round(norm_min * (1 - reduction * 0.5), 2)

        db.add(UserVitaminEntry(
            user_id=user_id,
            vitamin_id=vit_id,
            value=estimated_value,
            source="symptom",
        ))

    await db.commit()
