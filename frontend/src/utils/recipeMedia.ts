const ABSOLUTE_URL_PATTERN = /^(?:https?:)?\/\//i
const DATA_URL_PATTERN = /^data:/i

export function resolveRecipeImageSrc(imageUrl?: string | null): string | null {
  const value = imageUrl?.trim()
  if (!value) return null

  if (ABSOLUTE_URL_PATTERN.test(value) || DATA_URL_PATTERN.test(value)) {
    return value
  }

  if (value.startsWith('/recipes/')) {
    return value
  }

  if (value.startsWith('recipes/')) {
    return `/${value.replace(/^\/+/, '')}`
  }

  if (value.startsWith('/public/recipes/')) {
    return value.replace('/public', '')
  }

  if (value.startsWith('public/recipes/')) {
    return `/${value.replace(/^\/+/, '').replace(/^public\//, '')}`
  }

  if (value.startsWith('/')) {
    return value
  }

  return `/recipes/${value.replace(/^\.?\/*/, '')}`
}
