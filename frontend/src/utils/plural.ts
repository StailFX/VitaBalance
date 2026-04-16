export function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const value = Math.abs(count)
  const mod100 = value % 100
  const mod10 = value % 10

  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export const productWord = (count: number) => pluralizeRu(count, 'продукт', 'продукта', 'продуктов')
export const recipeWord = (count: number) => pluralizeRu(count, 'рецепт', 'рецепта', 'рецептов')
