from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.recipe import Recipe, RecipeIngredient
from app.models.product import Product
from app.schemas.recipe import RecipeShort, RecipeDetail, IngredientOut, MealPlanItem
from app.auth_utils import get_current_user
from app.services.recommendation import get_recommended_recipes, get_recipe_vitamin_content

router = APIRouter()


@router.get("/recommended", response_model=List[RecipeShort])
async def recommended_recipes(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    recipes = await get_recommended_recipes(current_user.id, db, limit=limit, offset=offset)
    return recipes


@router.get("/meal-plan", response_model=List[MealPlanItem])
async def get_meal_plan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get top recommended recipes based on vitamin deficiencies
    recipes = await get_recommended_recipes(current_user.id, db, limit=4)

    meal_types = ["breakfast", "lunch", "dinner", "snack"]
    meal_plan = []
    for i, meal_type in enumerate(meal_types):
        if i < len(recipes):
            r = recipes[i]
            meal_plan.append(MealPlanItem(
                meal_type=meal_type,
                recipe_id=r["id"],
                recipe_title=r["title"],
                cook_time_minutes=r["cook_time_minutes"],
            ))

    return meal_plan


@router.get("/search", response_model=List[RecipeShort])
async def search_recipes(
    q: Optional[str] = Query(None, description="Search in title/description"),
    max_time: Optional[int] = Query(None, description="Max cook time in minutes"),
    sort: Optional[str] = Query("newest", description="Sort: title, time, newest"),
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = select(Recipe).options(
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.product)
    )

    if q:
        safe_q = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.where(
            Recipe.title.ilike(f"%{safe_q}%") | Recipe.description.ilike(f"%{safe_q}%")
        )

    if max_time is not None:
        query = query.where(Recipe.cook_time_minutes <= max_time)

    if sort in {"title", "name"}:
        query = query.order_by(Recipe.title)
    elif sort == "time":
        query = query.order_by(Recipe.cook_time_minutes)
    else:  # newest -- by id desc as proxy (no created_at field)
        query = query.order_by(Recipe.id.desc())

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    recipes = result.scalars().unique().all()
    return recipes


@router.get("/{recipe_id}", response_model=RecipeDetail)
async def get_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Recipe)
        .options(
            selectinload(Recipe.ingredients).selectinload(RecipeIngredient.product)
        )
        .where(Recipe.id == recipe_id)
    )
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Рецепт не найден")

    ingredients = []
    for ing in recipe.ingredients:
        product = ing.product
        ingredients.append(IngredientOut(
            product_name=product.name if product else "Неизвестный продукт",
            amount=ing.amount,
            unit=ing.unit,
        ))

    vitamin_content = await get_recipe_vitamin_content(recipe_id, db)

    return RecipeDetail(
        id=recipe.id,
        title=recipe.title,
        description=recipe.description,
        image_url=recipe.image_url,
        cook_time_minutes=recipe.cook_time_minutes,
        instructions=recipe.instructions,
        ingredients=ingredients,
        vitamin_content=vitamin_content,
    )
