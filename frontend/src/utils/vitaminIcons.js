// Emoji icons and gradient colors for each vitamin code
const vitaminMap = {
  VIT_A:     { emoji: '🥕', gradient: 'from-orange-400 to-amber-500', bg: 'bg-orange-50 dark:bg-orange-500/15' },
  VIT_B6:    { emoji: '🧬', gradient: 'from-indigo-400 to-blue-500', bg: 'bg-indigo-50 dark:bg-indigo-500/15' },
  VIT_B9:    { emoji: '🥬', gradient: 'from-emerald-400 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-500/15' },
  VIT_B12:   { emoji: '🔴', gradient: 'from-pink-400 to-rose-500', bg: 'bg-pink-50 dark:bg-pink-500/15' },
  VIT_C:     { emoji: '🍊', gradient: 'from-yellow-400 to-orange-400', bg: 'bg-yellow-50 dark:bg-yellow-500/15' },
  VIT_D:     { emoji: '☀️', gradient: 'from-amber-300 to-yellow-400', bg: 'bg-amber-50 dark:bg-amber-500/15' },
  VIT_E:     { emoji: '✨', gradient: 'from-green-400 to-emerald-500', bg: 'bg-green-50 dark:bg-green-500/15' },
  IRON:      { emoji: '💪', gradient: 'from-red-400 to-red-500', bg: 'bg-red-50 dark:bg-red-500/15' },
  CALCIUM:   { emoji: '🦴', gradient: 'from-sky-400 to-blue-500', bg: 'bg-sky-50 dark:bg-sky-500/15' },
  MAGNESIUM: { emoji: '🧠', gradient: 'from-purple-400 to-violet-500', bg: 'bg-purple-50 dark:bg-purple-500/15' },
}

const fallback = { emoji: '💊', gradient: 'from-gray-400 to-gray-500', bg: 'bg-gray-50 dark:bg-gray-500/15' }

export function getVitaminIcon(code) {
  return vitaminMap[code] || fallback
}

export default vitaminMap
