import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { CardSkeleton } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'

export default function Favorites() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [confirmingId, setConfirmingId] = useState(null)
  const [sortBy, setSortBy] = useState('date')
  const { addToast } = useToast()

  useEffect(() => {
    api.get('/favorites/').then((res) => {
      setRecipes(res.data)
      setLoading(false)
    }).catch(() => {
      setError(true)
      setLoading(false)
    })
  }, [])

  const sortedRecipes = useMemo(() => {
    const sorted = [...recipes]
    switch (sortBy) {
      case 'title':
        sorted.sort((a, b) => (a.recipe?.title || '').localeCompare(b.recipe?.title || '', 'ru'))
        break
      case 'cooktime':
        sorted.sort((a, b) => (a.recipe?.cook_time_minutes || 0) - (b.recipe?.cook_time_minutes || 0))
        break
      case 'date':
      default:
        // keep original order (by date added from API)
        break
    }
    return sorted
  }, [recipes, sortBy])

  const removeFavorite = async (recipeId) => {
    try {
      await api.delete(`/favorites/${recipeId}`)
      setRecipes((prev) => prev.filter((r) => r.recipe_id !== recipeId))
      setConfirmingId(null)
      addToast('Рецепт удалён из избранного', 'success')
    } catch {
      addToast('Ошибка удаления из избранного', 'error')
    }
  }

  if (error) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-700 dark:text-gray-300 mb-4">Ошибка загрузки избранного</p>
          <Link to="/" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">На главную</Link>
        </div>
      </PageTransition>
    )
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Избранное
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Избранные рецепты</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-2">Ваши сохранённые рецепты для быстрого доступа</p>
        </div>

        {recipes.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-rose-200 dark:text-rose-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Пока ничего нет</h2>
            <p className="text-gray-500 dark:text-gray-300 mb-8">Добавляйте рецепты в избранное, нажимая на сердечко</p>
            <Link to="/recipes" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
              Посмотреть рецепты
            </Link>
          </div>
        ) : (
          <>
            {/* Count and sorting controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {recipes.length}{' '}
                {(() => {
                  const n = recipes.length % 100
                  const n1 = n % 10
                  if (n > 10 && n < 20) return 'рецептов'
                  if (n1 === 1) return 'рецепт'
                  if (n1 >= 2 && n1 <= 4) return 'рецепта'
                  return 'рецептов'
                })()}{' '}
                в избранном
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">Сортировка:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm px-3 py-1.5 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  <option value="date">По дате добавления</option>
                  <option value="title">По названию</option>
                  <option value="cooktime">По времени готовки</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedRecipes.map((fav) => (
                <div key={fav.recipe_id} className="group bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden card-hover">
                  <div className="relative h-48 bg-gradient-to-br from-rose-100 to-primary-100 dark:from-rose-900/30 dark:to-primary-900/30">
                    {fav.recipe?.image_url ? (
                      <img src={fav.recipe.image_url} alt={fav.recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-rose-200 dark:text-rose-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                      </div>
                    )}
                    {/* Remove button with confirmation */}
                    {confirmingId === fav.recipe_id ? (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-full px-3 py-2 shadow-lg border border-gray-200 dark:border-white/[0.1]">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Удалить?</span>
                        <button
                          onClick={() => removeFavorite(fav.recipe_id)}
                          className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                        >
                          Да
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">/</span>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                          Нет
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(fav.recipe_id)}
                        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{fav.recipe?.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mb-4 line-clamp-2">{fav.recipe?.description}</p>
                    <Link
                      to={`/recipes/${fav.recipe_id}`}
                      className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                    >
                      Подробнее
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  )
}
