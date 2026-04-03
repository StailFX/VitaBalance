from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.user_data import Favorite
from app.models.recipe import Recipe
from app.schemas.recipe import FavoriteOut, RecipeShort
from app.auth_utils import get_current_user

router = APIRouter()


@router.get("/", response_model=List[FavoriteOut])
async def list_favorites(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort: Optional[str] = Query(default="newest", description="Sort: newest, title, cook_time"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Favorite, Recipe)
        .join(Recipe, Favorite.recipe_id == Recipe.id)
        .where(Favorite.user_id == current_user.id)
    )

    if sort == "title":
        query = query.order_by(Recipe.title)
    elif sort == "cook_time":
        query = query.order_by(Recipe.cook_time_minutes)
    else:  # newest
        query = query.order_by(Favorite.created_at.desc())

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    out = []
    for fav, recipe in rows:
        recipe_short = None
        if recipe:
            recipe_short = RecipeShort(
                id=recipe.id,
                title=recipe.title,
                description=recipe.description,
                image_url=recipe.image_url,
                cook_time_minutes=recipe.cook_time_minutes,
            )
        out.append(FavoriteOut(recipe_id=fav.recipe_id, recipe=recipe_short))
    return out


@router.post("/{recipe_id}")
async def add_favorite(
    recipe_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    recipe = await db.scalar(select(Recipe).where(Recipe.id == recipe_id))
    if not recipe:
        raise HTTPException(status_code=404, detail="Рецепт не найден")

    existing = await db.scalar(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.recipe_id == recipe_id,
        )
    )
    if existing:
        return {"message": "Уже в избранном"}

    db.add(Favorite(user_id=current_user.id, recipe_id=recipe_id))

    return {"message": "Добавлено в избранное"}


@router.delete("/{recipe_id}")
async def remove_favorite(
    recipe_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.recipe_id == recipe_id,
        )
    )

    return {"message": "Удалено из избранного"}
