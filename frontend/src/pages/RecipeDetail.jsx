import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { Skeleton } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'

export default function RecipeDetail() {
  const { id } = useParams()
  const [recipe, setRecipe] = useState(null)
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [multiplier, setMultiplier] = useState(1)
  const [relatedRecipes, setRelatedRecipes] = useState([])
  const { addToast } = useToast()

  useEffect(() => {
    setMultiplier(1)
    Promise.all([
      api.get(`/recipes/${id}`),
      api.get('/favorites/'),
    ]).then(([recRes, favRes]) => {
      setRecipe(recRes.data)
      setIsFav(favRes.data.some((f) => f.recipe_id === Number(id)))
      setLoading(false)
    }).catch(() => {
      setError(true)
      setLoading(false)
    })

    // Fetch related recipes
    api.get('/recipes/recommended').then((res) => {
      const data = Array.isArray(res.data) ? res.data : []
      setRelatedRecipes(data.filter((r) => r.id !== Number(id)).slice(0, 4))
    }).catch(() => {})
  }, [id])

  const toggleFav = async () => {
    try {
      if (isFav) {
        await api.delete(`/favorites/${id}`)
        setIsFav(false)
        addToast('Удалено из избранного', 'info')
      } else {
        await api.post(`/favorites/${id}`)
        setIsFav(true)
        addToast('Добавлено в избранное', 'success')
      }
    } catch {
      addToast('Ошибка', 'error')
    }
  }

  if (error) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-700 dark:text-gray-300 mb-4">Ошибка загрузки рецепта</p>
          <Link to="/recipes" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Назад</Link>
        </div>
      </PageTransition>
    )
  }

  if (loading || !recipe) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
            <Skeleton className="h-72 w-full rounded-none" />
            <div className="p-8 space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <div className="grid grid-cols-2 gap-3 pt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  const steps = recipe.instructions
    ? recipe.instructions.split('\n').filter(s => s.trim())
    : []

  // Format a multiplied amount nicely
  const formatAmount = (amount) => {
    if (amount == null) return ''
    const val = amount * multiplier
    return Number.isInteger(val) ? val : parseFloat(val.toFixed(2))
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/recipes" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Назад к рецептам
        </Link>

        <div className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-100 dark:border-white/[0.06] shadow-sm overflow-hidden">
          {/* Hero image */}
          <div className="relative h-72 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30">
            {recipe.image_url ? (
              <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-24 h-24 text-primary-200 dark:text-primary-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" />
                </svg>
              </div>
            )}
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            {/* Favorite button */}
            <button
              onClick={toggleFav}
              className={`absolute top-4 right-4 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isFav
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-white/80 dark:bg-white/[0.05] backdrop-blur-sm text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-white/[0.06]'
              }`}
            >
              <svg className="w-6 h-6" fill={isFav ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
            {/* Time badge */}
            <div className="absolute bottom-4 left-6 flex items-center gap-2">
              <div className="bg-white/90 dark:bg-white/[0.05] backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {recipe.cook_time_minutes} мин
              </div>
            </div>
          </div>

          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{recipe.title}</h1>
            <p className="text-gray-500 dark:text-gray-300 mb-8 text-lg">{recipe.description}</p>

            {/* Vitamin content badges */}
            {recipe.vitamin_content && recipe.vitamin_content.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Витаминный состав</h2>
                <div className="flex flex-wrap gap-2">
                  {recipe.vitamin_content.map((vc, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-200 px-4 py-2 rounded-xl text-sm font-medium border border-primary-100 dark:border-primary-500/20">
                      <span className="w-2 h-2 rounded-full bg-primary-400 dark:bg-primary-300"></span>
                      {vc.vitamin_name}: {vc.amount} {vc.unit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients with portion multiplier */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Ингредиенты</h2>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Порции:</span>
                  {[1, 2, 3].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMultiplier(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        multiplier === m
                          ? 'bg-primary-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                      }`}
                    >
                      {m}x
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {recipe.ingredients?.map((ing, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{i + 1}</span>
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{ing.product_name}</span>
                    <span className="text-sm text-gray-400 ml-auto">
                      {ing.amount != null ? formatAmount(ing.amount) : ''} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Приготовление</h2>
              <div className="space-y-4">
                {steps.length > 1 ? (
                  steps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{i + 1}</span>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{step.replace(/^\d+[\.\)]\s*/, '')}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-gray-50 dark:bg-white/[0.02] rounded-2xl p-6">
                    {recipe.instructions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related recipes */}
        {relatedRecipes.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Похожие рецепты</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedRecipes.map((r) => (
                <Link
                  key={r.id}
                  to={`/recipes/${r.id}`}
                  className="group bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden card-hover"
                >
                  <div className="relative h-32 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 overflow-hidden">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-primary-200 dark:text-primary-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-white/[0.05] backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {r.cook_time_minutes} мин
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">{r.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
