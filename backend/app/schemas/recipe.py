from typing import Optional, List
from pydantic import BaseModel


class IngredientOut(BaseModel):
    product_name: str
    amount: float
    unit: str

    class Config:
        from_attributes = True


class VitaminContentItem(BaseModel):
    vitamin_name: str
    amount: float
    unit: str


class RecipeShort(BaseModel):
    id: int
    title: str
    description: str
    image_url: Optional[str] = None
    cook_time_minutes: int
    relevance_score: Optional[float] = None

    class Config:
        from_attributes = True


class RecipeDetail(BaseModel):
    id: int
    title: str
    description: str
    image_url: Optional[str] = None
    cook_time_minutes: int
    instructions: str
    ingredients: List[IngredientOut]
    vitamin_content: List[VitaminContentItem]

    class Config:
        from_attributes = True


class FavoriteOut(BaseModel):
    recipe_id: int
    recipe: Optional[RecipeShort] = None

    class Config:
        from_attributes = True


class MealPlanItem(BaseModel):
    meal_type: str
    recipe_id: int
    recipe_title: str
    cook_time_minutes: int
