"""Auto-generate notifications based on vitamin analysis results."""
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.schemas.analysis import VitaminAnalysisItem


async def check_and_notify(
    user_id: int,
    analysis: List[VitaminAnalysisItem],
    db: AsyncSession,
) -> int:
    """Check analysis results and create notifications for critical issues.
    Returns the number of notifications created."""
    created = 0

    critical_deficiencies = [
        item for item in analysis
        if item.status == "deficiency" and item.severity >= 30
    ]

    if critical_deficiencies:
        names = ", ".join(item.vitamin_name for item in critical_deficiencies[:3])
        suffix = f" и ещё {len(critical_deficiencies) - 3}" if len(critical_deficiencies) > 3 else ""
        db.add(Notification(
            user_id=user_id,
            title="Обнаружен серьёзный дефицит",
            message=f"Критический дефицит: {names}{suffix}. Рекомендуем обратиться к врачу и скорректировать рацион.",
            type="deficiency",
        ))
        created += 1

    excess_vitamins = [
        item for item in analysis
        if item.status == "excess" and item.severity >= 20
    ]

    if excess_vitamins:
        names = ", ".join(item.vitamin_name for item in excess_vitamins[:3])
        db.add(Notification(
            user_id=user_id,
            title="Обнаружен избыток витаминов",
            message=f"Повышенный уровень: {names}. Рекомендуем проконсультироваться с врачом.",
            type="deficiency",
        ))
        created += 1

    normal_count = sum(1 for item in analysis if item.status == "normal")
    total_with_data = sum(1 for item in analysis if item.status != "no_data")

    if total_with_data > 0 and normal_count == total_with_data:
        db.add(Notification(
            user_id=user_id,
            title="Все витамины в норме!",
            message="Поздравляем! Все ваши витамины находятся в пределах нормы. Продолжайте правильно питаться.",
            type="achievement",
        ))
        created += 1

    if created > 0:
        await db.commit()

    return created
