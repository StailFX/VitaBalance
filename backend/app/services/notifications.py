"""Auto-generate notifications based on vitamin analysis results.

Deduplication: only creates a notification if there is no unread notification
of the same type for this user in the last 24 hours, preventing spam on
repeated analysis page loads.
"""
from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.schemas.analysis import VitaminAnalysisItem


async def _has_recent_notification(
    user_id: int, notif_type: str, db: AsyncSession, hours: int = 24
) -> bool:
    """Check if user already has an unread notification of this type within N hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    count = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.type == notif_type,
            Notification.read == False,
            Notification.created_at >= cutoff,
        )
    )
    return (count or 0) > 0


async def check_and_notify(
    user_id: int,
    analysis: List[VitaminAnalysisItem],
    db: AsyncSession,
) -> int:
    """Check analysis results and create notifications for critical issues.
    Returns the number of notifications created.

    Deduplicates: skips creating a notification if user already has an
    unread notification of the same type within the last 24 hours.
    """
    created = 0

    critical_deficiencies = [
        item for item in analysis
        if item.status == "deficiency" and item.severity >= 30
    ]

    if critical_deficiencies:
        if not await _has_recent_notification(user_id, "deficiency", db):
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
        if not await _has_recent_notification(user_id, "excess", db):
            names = ", ".join(item.vitamin_name for item in excess_vitamins[:3])
            db.add(Notification(
                user_id=user_id,
                title="Обнаружен избыток витаминов",
                message=f"Повышенный уровень: {names}. Рекомендуем проконсультироваться с врачом.",
                type="excess",
            ))
            created += 1

    normal_count = sum(1 for item in analysis if item.status == "normal")
    total_with_data = sum(1 for item in analysis if item.status != "no_data")

    if total_with_data > 0 and normal_count == total_with_data:
        if not await _has_recent_notification(user_id, "achievement", db):
            db.add(Notification(
                user_id=user_id,
                title="Все витамины в норме!",
                message="Поздравляем! Все ваши витамины находятся в пределах нормы. Продолжайте правильно питаться.",
                type="achievement",
            ))
            created += 1

    return created
