export interface ProductVitaminContent {
  vitamin_id: number
  vitamin_name: string
  amount_per_100g: number
  unit: string
}

export interface ProductSearchResult {
  id: number
  name: string
  category: string
  vitamin_content: ProductVitaminContent[]
}
