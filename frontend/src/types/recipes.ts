export interface RecipeShort {
  id: number
  title: string
  description: string
  image_url: string | null
  cook_time_minutes: number
  relevance_score?: number | null
}

export interface IngredientOut {
  product_name: string
  amount: number
  unit: string
}

export interface RecipeVitaminContent {
  vitamin_name: string
  amount: number
  unit: string
}

export interface RecipeDetail {
  id: number
  title: string
  description: string
  image_url: string | null
  cook_time_minutes: number
  instructions: string
  ingredients: IngredientOut[]
  vitamin_content: RecipeVitaminContent[]
}

export interface MealPlanItem {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  recipe_id: number
  recipe_title: string
  cook_time_minutes: number
}

export interface FavoriteOut {
  recipe_id: number
  recipe: RecipeShort | null
}
