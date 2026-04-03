// Emoji icons and gradient colors for each vitamin code
const vitaminMap = {
  VIT_A:      { emoji: '🥕', gradient: 'from-orange-400 to-amber-500', bg: 'bg-orange-50 dark:bg-orange-500/15' },
  VIT_B1:     { emoji: '🌾', gradient: 'from-yellow-500 to-amber-600', bg: 'bg-yellow-50 dark:bg-yellow-500/15' },
  VIT_B2:     { emoji: '🥛', gradient: 'from-amber-400 to-orange-400', bg: 'bg-amber-50 dark:bg-amber-500/15' },
  VIT_B3:     { emoji: '🔥', gradient: 'from-red-400 to-orange-500', bg: 'bg-red-50 dark:bg-red-500/15' },
  VIT_B5:     { emoji: '⚡', gradient: 'from-cyan-400 to-teal-500', bg: 'bg-cyan-50 dark:bg-cyan-500/15' },
  VIT_B6:     { emoji: '🧬', gradient: 'from-indigo-400 to-blue-500', bg: 'bg-indigo-50 dark:bg-indigo-500/15' },
  VIT_B9:     { emoji: '🥬', gradient: 'from-emerald-400 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-500/15' },
  VIT_B12:    { emoji: '🔴', gradient: 'from-pink-400 to-rose-500', bg: 'bg-pink-50 dark:bg-pink-500/15' },
  VIT_C:      { emoji: '🍊', gradient: 'from-yellow-400 to-orange-400', bg: 'bg-yellow-50 dark:bg-yellow-500/15' },
  VIT_D:      { emoji: '☀️', gradient: 'from-amber-300 to-yellow-400', bg: 'bg-amber-50 dark:bg-amber-500/15' },
  VIT_E:      { emoji: '✨', gradient: 'from-green-400 to-emerald-500', bg: 'bg-green-50 dark:bg-green-500/15' },
  VIT_K:      { emoji: '🩸', gradient: 'from-lime-400 to-green-500', bg: 'bg-lime-50 dark:bg-lime-500/15' },
  IRON:       { emoji: '💪', gradient: 'from-red-400 to-red-500', bg: 'bg-red-50 dark:bg-red-500/15' },
  CALCIUM:    { emoji: '🦴', gradient: 'from-sky-400 to-blue-500', bg: 'bg-sky-50 dark:bg-sky-500/15' },
  MAGNESIUM:  { emoji: '🧠', gradient: 'from-purple-400 to-violet-500', bg: 'bg-purple-50 dark:bg-purple-500/15' },
  ZINC:       { emoji: '🛡️', gradient: 'from-slate-400 to-zinc-500', bg: 'bg-slate-50 dark:bg-slate-500/15' },
  SELENIUM:   { emoji: '🌿', gradient: 'from-teal-400 to-emerald-500', bg: 'bg-teal-50 dark:bg-teal-500/15' },
  PHOSPHORUS: { emoji: '🧪', gradient: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50 dark:bg-blue-500/15' },
  POTASSIUM:  { emoji: '🍌', gradient: 'from-yellow-400 to-lime-500', bg: 'bg-yellow-50 dark:bg-lime-500/15' },
  OMEGA3:     { emoji: '🐟', gradient: 'from-sky-400 to-cyan-500', bg: 'bg-sky-50 dark:bg-cyan-500/15' },
}

const fallback = { emoji: '💊', gradient: 'from-gray-400 to-gray-500', bg: 'bg-gray-50 dark:bg-gray-500/15' }

export function getVitaminIcon(code) {
  return vitaminMap[code] || fallback
}

export default vitaminMap
