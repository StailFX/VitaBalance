from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import UserProfile

DEFAULT_GENDER = "male"


def classify_vitamin_status(value: float, norm_min: float, norm_max: float) -> str:
    """Classify vitamin level as deficiency/normal/excess."""
    if value < norm_min:
        return "deficiency"
    elif value > norm_max:
        return "excess"
    return "normal"


def get_norms_for_gender(vitamin, gender: str) -> tuple[float, float]:
    """Get (norm_min, norm_max) based on gender."""
    if gender == "female":
        return vitamin.norm_female_min, vitamin.norm_female_max
    return vitamin.norm_male_min, vitamin.norm_male_max


async def get_user_gender(user_id: int, db: AsyncSession) -> str:
    """Get user's gender from profile, defaulting to male."""
    profile = await db.scalar(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    return profile.gender if profile and profile.gender else DEFAULT_GENDER
