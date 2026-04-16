export interface VitaminVisualConfig {
  emoji: string
  gradient: string
  bg: string
}

export interface MealVisualConfig {
  label: string
  icon: string
  gradient: string
  text: string
}

interface RecipeFallbackVisual {
  gradient: string
  text: string
}

export const VITAMIN_VISUALS: Record<string, VitaminVisualConfig> = {
  VIT_A: { emoji: '🥕', gradient: 'from-orange-400 to-amber-500', bg: 'bg-orange-50 dark:bg-orange-500/15' },
  VIT_B1: { emoji: '🌾', gradient: 'from-yellow-500 to-amber-600', bg: 'bg-yellow-50 dark:bg-yellow-500/15' },
  VIT_B2: { emoji: '🥛', gradient: 'from-amber-400 to-orange-400', bg: 'bg-amber-50 dark:bg-amber-500/15' },
  VIT_B3: { emoji: '🔥', gradient: 'from-red-400 to-orange-500', bg: 'bg-red-50 dark:bg-red-500/15' },
  VIT_B5: { emoji: '⚡', gradient: 'from-cyan-400 to-teal-500', bg: 'bg-cyan-50 dark:bg-cyan-500/15' },
  VIT_B6: { emoji: '🧬', gradient: 'from-indigo-400 to-blue-500', bg: 'bg-indigo-50 dark:bg-indigo-500/15' },
  VIT_B9: { emoji: '🥬', gradient: 'from-emerald-400 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-500/15' },
  VIT_B12: { emoji: '🔴', gradient: 'from-pink-400 to-rose-500', bg: 'bg-pink-50 dark:bg-pink-500/15' },
  VIT_C: { emoji: '🍊', gradient: 'from-yellow-400 to-orange-400', bg: 'bg-yellow-50 dark:bg-yellow-500/15' },
  VIT_D: { emoji: '☀️', gradient: 'from-amber-300 to-yellow-400', bg: 'bg-amber-50 dark:bg-amber-500/15' },
  VIT_E: { emoji: '✨', gradient: 'from-green-400 to-emerald-500', bg: 'bg-green-50 dark:bg-green-500/15' },
  VIT_K: { emoji: '🩸', gradient: 'from-lime-400 to-green-500', bg: 'bg-lime-50 dark:bg-lime-500/15' },
  IRON: { emoji: '💪', gradient: 'from-red-400 to-red-500', bg: 'bg-red-50 dark:bg-red-500/15' },
  CALCIUM: { emoji: '🦴', gradient: 'from-sky-400 to-blue-500', bg: 'bg-sky-50 dark:bg-sky-500/15' },
  MAGNESIUM: { emoji: '🧠', gradient: 'from-purple-400 to-violet-500', bg: 'bg-purple-50 dark:bg-purple-500/15' },
  ZINC: { emoji: '🛡️', gradient: 'from-sky-300 to-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/15' },
  SELENIUM: { emoji: '🌿', gradient: 'from-teal-400 to-emerald-500', bg: 'bg-teal-50 dark:bg-teal-500/15' },
  PHOSPHORUS: { emoji: '🧪', gradient: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50 dark:bg-blue-500/15' },
  POTASSIUM: { emoji: '🍌', gradient: 'from-yellow-400 to-lime-500', bg: 'bg-yellow-50 dark:bg-lime-500/15' },
  OMEGA3: { emoji: '🐟', gradient: 'from-sky-400 to-cyan-500', bg: 'bg-sky-50 dark:bg-cyan-500/15' },
}

export const VITAMIN_FALLBACK_VISUAL: VitaminVisualConfig = {
  emoji: '💊',
  gradient: 'from-gray-400 to-gray-500',
  bg: 'bg-gray-50 dark:bg-gray-500/15',
}

export const PRODUCT_CATEGORY_ICONS: Record<string, string> = {
  'Фрукты и ягоды': '🍎',
  'Овощи': '🥦',
  'Мясо и птица': '🥩',
  'Рыба и морепродукты': '🐟',
  'Молочные продукты': '🥛',
  'Зерновые и бобовые': '🌾',
  'Крупы и злаки': '🌾',
  'Орехи и семена': '🥜',
  'Масла и жиры': '🫒',
  'Сухофрукты': '🍇',
  'Соевые продукты': '🫘',
  'Зелень и травы': '🌿',
  'Яйца': '🥚',
  'Бобовые': '🫘',
  'Зелень': '🌿',
}

export const PRODUCT_ICONS: Record<string, string> = {
  'Куриная печень': '🐔',
  'Говядина': '🥩',
  'Куриное филе': '🍗',
  'Индейка': '🦃',
  'Свинина': '🥓',
  'Печень говяжья': '🥩',
  'Баранина': '🐑',
  'Утиное филе': '🦆',
  'Лосось': '🐟',
  'Тунец': '🐟',
  'Скумбрия': '🐟',
  'Креветки': '🦐',
  'Сельдь': '🐟',
  'Печень трески': '🐟',
  'Сардины': '🐠',
  'Треска': '🐟',
  'Форель': '🎣',
  'Мидии': '🦪',
  'Кальмар': '🦑',
  'Яйца куриные': '🥚',
  'Яйца перепелиные': '🪺',
  'Молоко': '🥛',
  'Сыр твёрдый': '🧀',
  'Творог': '🥣',
  'Кефир 2.5%': '🥛',
  'Йогурт натуральный': '🥣',
  'Сметана 20%': '🥄',
  'Шпинат': '🥬',
  'Брокколи': '🥦',
  'Морковь': '🥕',
  'Батат': '🍠',
  'Перец болгарский': '🫑',
  'Томаты': '🍅',
  'Капуста белокочанная': '🥬',
  'Тыква': '🎃',
  'Свёкла': '🟣',
  'Цветная капуста': '🥦',
  'Спаржа': '🥬',
  'Чеснок': '🧄',
  'Грибы шампиньоны': '🍄',
  'Грибы лисички': '🍄',
  'Водоросли (нори)': '🌊',
  'Картофель': '🥔',
  'Огурцы': '🥒',
  'Кабачок': '🥒',
  'Квашеная капуста': '🥬',
  'Зелёный горошек': '🟢',
  'Брюссельская капуста': '🥬',
  'Апельсин': '🍊',
  'Лимон': '🍋',
  'Киви': '🥝',
  'Банан': '🍌',
  'Авокадо': '🥑',
  'Клубника': '🍓',
  'Черника': '🫐',
  'Манго': '🥭',
  'Гранат': '🔴',
  'Хурма': '🟠',
  'Малина': '🍓',
  'Грейпфрут': '🍊',
  'Гречка': '🍚',
  'Овсянка': '🥣',
  'Чечевица': '🫘',
  'Нут': '🧆',
  'Фасоль красная': '🫘',
  'Рис бурый': '🍚',
  'Киноа': '🌾',
  'Булгур': '🌾',
  'Горох': '🟢',
  'Миндаль': '🌰',
  'Семена подсолнечника': '🌻',
  'Грецкий орех': '🌰',
  'Семена тыквы': '🎃',
  'Кешью': '🌰',
  'Льняное семя': '🌱',
  'Кунжут': '⚪',
  'Фундук': '🌰',
  'Семена чиа': '⚫',
  'Кедровый орех': '🌲',
  'Оливковое масло': '🫒',
  'Масло сливочное': '🧈',
  'Рыбий жир (масло)': '🐟',
  'Курага': '🍑',
  'Чернослив': '🟣',
  'Изюм': '🍇',
  'Финики': '🟤',
  'Тофу': '◻️',
  'Соевые бобы': '🫘',
  'Петрушка': '🌿',
  'Укроп': '🌿',
  'Руккола': '🥬',
}

export function getProductCategoryIcon(category?: string | null): string {
  if (!category) return '🍽️'
  return PRODUCT_CATEGORY_ICONS[category] || '🍽️'
}

export function getProductIcon(name?: string | null, category?: string | null): string {
  if (!name) return getProductCategoryIcon(category)
  return PRODUCT_ICONS[name.trim()] || getProductCategoryIcon(category)
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_VISUALS: Record<MealType, MealVisualConfig> = {
  breakfast: {
    label: 'Завтрак',
    icon: '🌅',
    gradient: 'from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30',
    text: 'text-amber-600 dark:text-amber-400',
  },
  lunch: {
    label: 'Обед',
    icon: '☀️',
    gradient: 'from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30',
    text: 'text-blue-600 dark:text-blue-400',
  },
  dinner: {
    label: 'Ужин',
    icon: '🌙',
    gradient: 'from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  snack: {
    label: 'Перекус',
    icon: '🍎',
    gradient: 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30',
    text: 'text-green-600 dark:text-green-400',
  },
}

const RECIPE_FALLBACK_VISUALS: RecipeFallbackVisual[] = [
  { gradient: 'from-primary-500 to-cyan-500', text: 'Новая идея' },
  { gradient: 'from-emerald-500 to-teal-500', text: 'Полезный ужин' },
  { gradient: 'from-amber-500 to-orange-500', text: 'Быстрый вариант' },
  { gradient: 'from-fuchsia-500 to-pink-500', text: 'Домашний рецепт' },
]

export function getRecipeFallbackVisual(recipeId: number): RecipeFallbackVisual {
  return RECIPE_FALLBACK_VISUALS[Math.abs(recipeId) % RECIPE_FALLBACK_VISUALS.length]
}
