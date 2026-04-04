import { useState, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { Skeleton } from '../components/Skeleton'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useToast } from '../context/ToastContext'
import type { FavoriteOut, RecipeDetail as RecipeDetailType, RecipeShort } from '../types'

interface SummaryCard {
  label: string
  value: string
  description: string
  accent: string
  surface: string
  border: string
}

function trimText(value: string, maxLength = 120): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trimEnd()}...`
}

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>()
  const [recipe, setRecipe] = useState<RecipeDetailType | null>(null)
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [multiplier, setMultiplier] = useState(1)
  const [relatedRecipes, setRelatedRecipes] = useState<RecipeShort[]>([])
  const { addToast } = useToast()

  useEffect(() => {
    if (!id) return

    let mounted = true
    setMultiplier(1)
    setLoading(true)
    setError(false)

    Promise.allSettled([
      api.get<RecipeDetailType>(`/recipes/${id}`),
      api.get<FavoriteOut[]>('/favorites/'),
      api.get<RecipeShort[]>('/recipes/recommended'),
    ]).then(([recipeRes, favoritesRes, relatedRes]) => {
      if (!mounted) return

      if (recipeRes.status !== 'fulfilled') {
        setError(true)
        setLoading(false)
        return
      }

      setRecipe(recipeRes.value.data)

      if (favoritesRes.status === 'fulfilled') {
        setIsFav(favoritesRes.value.data.some((item) => item.recipe_id === Number(id)))
      } else {
        setIsFav(false)
      }

      if (relatedRes.status === 'fulfilled') {
        const data = Array.isArray(relatedRes.value.data) ? relatedRes.value.data : []
        setRelatedRecipes(data.filter((item) => item.id !== Number(id)).slice(0, 4))
      } else {
        setRelatedRecipes([])
      }

      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [id])

  const toggleFav = async () => {
    if (!id) return

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
      addToast('Не удалось обновить избранное', 'error')
    }
  }

  const steps = useMemo(() => {
    if (!recipe?.instructions) return []
    return recipe.instructions
      .split('\n')
      .map((step) => step.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(Boolean)
  }, [recipe?.instructions])

  const formatAmount = (amount: number | null): string | number => {
    if (amount == null) return ''
    const value = amount * multiplier
    return Number.isInteger(value) ? value : parseFloat(value.toFixed(2))
  }

  const vitaminPreview = useMemo(() => {
    if (!recipe?.vitamin_content) return []
    return [...recipe.vitamin_content].sort((a, b) => b.amount - a.amount).slice(0, 4)
  }, [recipe?.vitamin_content])

  const summaryCards: SummaryCard[] = recipe ? [
    {
      label: 'Время',
      value: `${recipe.cook_time_minutes} мин`,
      description: 'Ориентир по длительности приготовления блюда.',
      accent: 'text-primary-600 dark:text-primary-300',
      surface: 'from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-primary-100 dark:border-primary-500/20',
    },
    {
      label: 'Ингредиенты',
      value: `${recipe.ingredients.length}`,
      description: 'Столько позиций понадобится для приготовления.',
      accent: 'text-cyan-600 dark:text-cyan-300',
      surface: 'from-cyan-50 via-white to-white dark:from-cyan-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-cyan-100 dark:border-cyan-500/20',
    },
    {
      label: 'Шаги',
      value: `${steps.length || 1}`,
      description: 'Столько шагов составляют процесс приготовления.',
      accent: 'text-emerald-600 dark:text-emerald-300',
      surface: 'from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-emerald-100 dark:border-emerald-500/20',
    },
    {
      label: 'Избранное',
      value: isFav ? 'Сохранено' : 'Не сохранено',
      description: isFav ? 'Рецепт уже лежит в вашей личной подборке.' : 'Можно сохранить рецепт, чтобы быстро вернуться к нему позже.',
      accent: 'text-rose-600 dark:text-rose-300',
      surface: 'from-rose-50 via-white to-white dark:from-rose-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-rose-100 dark:border-rose-500/20',
    },
  ] : []

  if (error) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.401 3.003c1.155-2 4.043-2 5.198 0l6.125 10.607c1.154 1.999-.289 4.498-2.599 4.498H5.875c-2.31 0-3.753-2.499-2.599-4.498L9.401 3.003z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Не удалось загрузить рецепт</h1>
          <p className="text-gray-500 dark:text-gray-300 mb-8">Попробуйте открыть страницу еще раз или вернитесь к подборке рецептов.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold"
            >
              Обновить страницу
            </button>
            <Link
              to="/recipes"
              className="px-8 py-3 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08]"
            >
              К рецептам
            </Link>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (loading || !recipe) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <div className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
            <Skeleton className="h-80 w-full rounded-none" />
            <div className="p-8 space-y-4">
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <div className="grid gap-3 pt-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-3xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <Link
          to="/recipes"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Назад к рецептам
        </Link>

        <section className="relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-xl shadow-gray-200/40 dark:shadow-primary-500/[0.05]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 left-0 h-44 w-44 rounded-full bg-primary-500/[0.08] dark:bg-primary-500/[0.14] blur-3xl" />
            <div className="absolute top-1/3 right-0 h-56 w-56 rounded-full bg-accent-500/[0.08] dark:bg-accent-500/[0.12] blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />
          </div>

          <div className="relative grid xl:grid-cols-[1.15fr_0.85fr] gap-6 p-6 sm:p-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/70 dark:bg-white/[0.06] border border-primary-200/60 dark:border-primary-500/20 backdrop-blur-sm mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Карточка рецепта</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                {recipe.title}
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed max-w-xl mb-6">
                {recipe.description}
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  type="button"
                  onClick={toggleFav}
                  className={`px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2 transition-colors ${
                    isFav
                      ? 'bg-rose-500 text-white'
                      : 'btn-primary text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                  {isFav ? 'В избранном' : 'Сохранить рецепт'}
                </button>
                <Link
                  to="/meal-plan"
                  className="px-6 py-3 rounded-2xl bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2"
                >
                  План питания
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12m-12 5.25h12m-12 5.25h12m-16.5-10.5h.008v.008H3.75V6.75zm0 5.25h.008v.008H3.75V12zm0 5.25h.008v.008H3.75v-.008z" />
                  </svg>
                </Link>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  Время: {recipe.cook_time_minutes} мин
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  Ингредиентов: {recipe.ingredients.length}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  Шагов: {steps.length || 1}
                </span>
              </div>
            </div>

            <StaggerChildren variant="fade-up" stagger={70} className="grid gap-3 self-start sm:grid-cols-2">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-[1.5rem] border ${card.border} bg-gradient-to-br ${card.surface} p-4 sm:p-5`}
                >
                  <div className={`text-xs uppercase tracking-[0.18em] ${card.accent} mb-2`}>{card.label}</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">{card.description}</p>
                </div>
              ))}
            </StaggerChildren>
          </div>
        </section>

        <div className="grid xl:grid-cols-[1.06fr_0.94fr] gap-6 items-start">
          <AnimateIn variant="blur" className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
            <div className="relative h-80 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 overflow-hidden">
              {recipe.image_url ? (
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                  onError={(event) => { (event.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-24 h-24 text-primary-200 dark:text-primary-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 dark:bg-white/[0.08] backdrop-blur-sm text-sm font-medium text-gray-700 dark:text-gray-200">
                  <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {recipe.cook_time_minutes} минут на приготовление
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                    Масштабирование
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Подстройте рецепт под нужное количество порций</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Порции:</span>
                  {[1, 2, 3].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMultiplier(value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        multiplier === value
                          ? 'bg-primary-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                      }`}
                    >
                      {value}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-gray-200 dark:border-white/[0.08] bg-gradient-to-r from-primary-50 via-white to-cyan-50 dark:from-primary-500/10 dark:via-white/[0.03] dark:to-cyan-500/8 p-5 mb-6">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Короткая сводка</div>
                <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
                  {trimText(recipe.description, 190)}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <div
                    key={`${ingredient.product_name}-${index}`}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{index + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{ingredient.product_name}</div>
                    </div>
                    <div className="text-sm text-gray-400 whitespace-nowrap">
                      {ingredient.amount != null ? formatAmount(ingredient.amount) : ''} {ingredient.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>

          <StaggerChildren variant="fade-up" stagger={60} className="space-y-4">
            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Витаминный профиль
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">На чем держится ценность этого блюда</h3>
              {vitaminPreview.length > 0 ? (
                <div className="space-y-3">
                  {vitaminPreview.map((item, index) => (
                    <div
                      key={`${item.vitamin_name}-${index}`}
                      className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3"
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">{item.vitamin_name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {item.amount} {item.unit}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Для этого рецепта пока нет детального витаминного профиля, но ингредиенты уже можно использовать как основу в рационе.
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Приготовление
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Пошаговый процесс</h3>
              <div className="space-y-4">
                {steps.length > 1 ? (
                  steps.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{index + 1}</span>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{step}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] p-5">
                    {recipe.instructions}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Следующий шаг
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Куда удобно перейти дальше</h3>
              <div className="space-y-3">
                <Link
                  to="/favorites"
                  className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3 hover:border-primary-200 dark:hover:border-primary-500/20 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Открыть избранное</div>
                    <div className="text-xs text-gray-400">Собрать личную подборку сохраненных блюд.</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>

                <Link
                  to="/meal-plan"
                  className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3 hover:border-primary-200 dark:hover:border-primary-500/20 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">План питания</div>
                    <div className="text-xs text-gray-400">Посмотреть, как встроить рецепт в дневной ритм.</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </StaggerChildren>
        </div>

        {relatedRecipes.length > 0 && (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
              <div>
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                  Похожие варианты
                </span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Что еще можно приготовить в том же ритме</h2>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  Эти карточки помогут быстро переключиться на соседние варианты без возврата к общему списку.
                </p>
              </div>
            </div>

            <StaggerChildren variant="fade-up" stagger={45} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedRecipes.map((relatedRecipe) => (
                <Link
                  key={relatedRecipe.id}
                  to={`/recipes/${relatedRecipe.id}`}
                  className="group overflow-hidden rounded-[1.7rem] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm"
                >
                  <div className="relative h-36 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 overflow-hidden">
                    {relatedRecipe.image_url ? (
                      <img
                        src={relatedRecipe.image_url}
                        alt={relatedRecipe.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(event) => { (event.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-primary-200 dark:text-primary-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-white/90 dark:bg-white/[0.08] backdrop-blur-sm text-xs font-medium text-gray-700 dark:text-gray-200">
                      {relatedRecipe.cook_time_minutes} мин
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {relatedRecipe.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      {trimText(relatedRecipe.description, 90)}
                    </p>
                  </div>
                </Link>
              ))}
            </StaggerChildren>
          </section>
        )}
      </div>
    </PageTransition>
  )
}
