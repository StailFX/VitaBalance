from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserProfile
from app.schemas.user import UserOut, ProfileUpdate
from app.auth_utils import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    if data.gender is not None:
        profile.gender = data.gender
    if data.age is not None:
        profile.age = data.age
    if data.height_cm is not None:
        profile.height_cm = data.height_cm
    if data.weight_kg is not None:
        profile.weight_kg = data.weight_kg

    await db.flush()
    await db.refresh(current_user)
    return current_user
