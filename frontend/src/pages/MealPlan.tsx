import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { CardSkeleton } from '../components/Skeleton'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useToast } from '../context/ToastContext'
import type { MealPlanItem } from '../types'

interface MealConfigEntry {
  label: string
  icon: string
  gradient: string
  text: string
  surface: string
  border: string
  accent: string
  note: string
}

interface SummaryCard {
  label: string
  value: string
  description: string
  accent: string
  surface: string
  border: string
}

const MEAL_CONFIG: Record<string, MealConfigEntry> = {
  breakfast: {
    label: 'Завтрак',
    icon: '🌅',
    gradient: 'from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    surface: 'from-amber-50 via-white to-white dark:from-amber-500/10 dark:via-white/[0.03] dark:to-white/[0.02]',
    border: 'border-amber-100 dark:border-amber-500/20',
    accent: 'text-amber-600 dark:text-amber-300',
    note: 'Старт дня лучше держать простым, но насыщенным по смыслу.',
  },
  lunch: {
    label: 'Обед',
    icon: '☀️',
    gradient: 'from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    surface: 'from-cyan-50 via-white to-white dark:from-cyan-500/10 dark:via-white/[0.03] dark:to-white/[0.02]',
    border: 'border-cyan-100 dark:border-cyan-500/20',
    accent: 'text-cyan-600 dark:text-cyan-300',
    note: 'Основной прием пищи удобно использовать для самой плотной поддержки рациона.',
  },
  dinner: {
    label: 'Ужин',
    icon: '🌙',
    gradient: 'from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30',
    text: 'text-indigo-600 dark:text-indigo-400',
    surface: 'from-indigo-50 via-white to-white dark:from-indigo-500/10 dark:via-white/[0.03] dark:to-white/[0.02]',
    border: 'border-indigo-100 dark:border-indigo-500/20',
    accent: 'text-indigo-600 dark:text-indigo-300',
    note: 'Вечер лучше завершать блюдом, которое не перегружает день лишней сложностью.',
  },
  snack: {
    label: 'Перекус',
    icon: '🍎',
    gradient: 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30',
    text: 'text-green-600 dark:text-green-400',
    surface: 'from-emerald-50 via-white to-white dark:from-emerald-500/10 dark:via-white/[0.03] dark:to-white/[0.02]',
    border: 'border-emerald-100 dark:border-emerald-500/20',
    accent: 'text-emerald-600 dark:text-emerald-300',
    note: 'Небольшой слот можно использовать как мягкое усиление дневной схемы.',
  },
}

const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export default function MealPlan() {
  const [plan, setPlan] = useState<MealPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    let mounted = true

    api.get<MealPlanItem[]>('/recipes/meal-plan').then((res) => {
      if (!mounted) return
      setPlan(res.data)
      setLoading(false)
      setError(false)
    }).catch(() => {
      if (!mounted) return
      setLoading(false)
      setError(true)
      addToast('Ошибка загрузки плана питания', 'error')
    })

    return () => {
      mounted = false
    }
  }, [addToast])

  const totalTime = useMemo(
    () => plan.reduce((sum, meal) => sum + (meal.cook_time_minutes || 0), 0),
    [plan],
  )

  const fastestMeal = useMemo(() => {
    return plan.reduce<MealPlanItem | null>((best, current) => {
      if (!best) return current
      return current.cook_time_minutes < best.cook_time_minutes ? current : best
    }, null)
  }, [plan])

  const longestMeal = useMemo(() => {
    return plan.reduce<MealPlanItem | null>((best, current) => {
      if (!best) return current
      return current.cook_time_minutes > best.cook_time_minutes ? current : best
    }, null)
  }, [plan])

  const summaryCards: SummaryCard[] = [
    {
      label: 'Приемы пищи',
      value: `${plan.length}`,
      description: 'Столько слотов уже собрано в текущем плане питания.',
      accent: 'text-emerald-600 dark:text-emerald-300',
      surface: 'from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-emerald-100 dark:border-emerald-500/20',
    },
    {
      label: 'Общее время',
      value: `${totalTime} мин`,
      description: 'Суммарная длительность готовки по всем слотам текущего дня.',
      accent: 'text-primary-600 dark:text-primary-300',
      surface: 'from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-primary-100 dark:border-primary-500/20',
    },
    {
      label: 'Самый быстрый',
      value: fastestMeal ? `${fastestMeal.cook_time_minutes} мин` : 'Нет данных',
      description: fastestMeal ? `${MEAL_CONFIG[fastestMeal.meal_type].label}: ${fastestMeal.recipe_title}` : 'Появится, когда план будет сформирован.',
      accent: 'text-cyan-600 dark:text-cyan-300',
      surface: 'from-cyan-50 via-white to-white dark:from-cyan-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-cyan-100 dark:border-cyan-500/20',
    },
    {
      label: 'Самый длинный',
      value: longestMeal ? `${longestMeal.cook_time_minutes} мин` : 'Нет данных',
      description: longestMeal ? `${MEAL_CONFIG[longestMeal.meal_type].label}: ${longestMeal.recipe_title}` : 'Появится, когда план будет сформирован.',
      accent: 'text-amber-600 dark:text-amber-300',
      surface: 'from-amber-50 via-white to-white dark:from-amber-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-amber-100 dark:border-amber-500/20',
    },
  ]

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Не удалось загрузить план питания</h1>
          <p className="text-gray-500 dark:text-gray-300 mb-8">Попробуйте обновить страницу чуть позже или вернитесь к рецептам.</p>
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

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-xl shadow-gray-200/40 dark:shadow-primary-500/[0.05]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 left-0 h-44 w-44 rounded-full bg-emerald-500/[0.08] dark:bg-emerald-500/[0.14] blur-3xl" />
            <div className="absolute top-1/3 right-0 h-56 w-56 rounded-full bg-cyan-500/[0.08] dark:bg-cyan-500/[0.12] blur-3xl" />
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
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/70 dark:bg-white/[0.06] border border-emerald-200/60 dark:border-emerald-500/20 backdrop-blur-sm mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">План питания</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                {plan.length > 0 ? 'Суточный маршрут по питанию уже собран' : 'План питания пока не сформирован'}
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed max-w-xl mb-6">
                {plan.length > 0
                  ? 'Эта страница превращает рекомендации в понятный дневной ритм: от первого приема пищи до перекуса, без лишнего переключения между разделами.'
                  : 'После анализа здесь появится структура дня с блюдами под ваш профиль, чтобы следующий шаг был не абстрактным, а практическим.'}
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <Link
                  to="/recipes"
                  className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
                >
                  Открыть рецепты
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  to="/analysis"
                  className="px-6 py-3 rounded-2xl bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2"
                >
                  К анализу
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </Link>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  Слотов в плане: {plan.length}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  Общее время: {totalTime} мин
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {fastestMeal ? `Самый быстрый слот: ${MEAL_CONFIG[fastestMeal.meal_type].label}` : 'План ждет наполнения'}
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

        {plan.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513M12 8.25V3m0 16.5v2.25" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">План пока не сформирован</h2>
            <p className="text-gray-500 dark:text-gray-300 mb-8">Сначала введите данные анализа, чтобы система собрала дневную схему под ваш профиль.</p>
            <Link to="/data-entry" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
              Ввести данные
            </Link>
          </div>
        ) : (
          <div className="grid xl:grid-cols-[1.12fr_0.88fr] gap-6 items-start">
            <AnimateIn variant="blur" className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                    Дневной ритм
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Структура дня собрана по слотам</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    Каждый блок показывает не просто блюдо, а его роль в течение дня и быстрый переход к деталям рецепта.
                  </p>
                </div>
              </div>

              <StaggerChildren variant="fade-up" stagger={55} className="space-y-4">
                {mealOrder.map((mealType, index) => {
                  const meal = plan.find((item) => item.meal_type === mealType)
                  const config = MEAL_CONFIG[mealType]
                  if (!meal) return null

                  return (
                    <div
                      key={mealType}
                      className={`relative overflow-hidden rounded-[1.8rem] border ${config.border} bg-gradient-to-br ${config.surface} p-5`}
                    >
                      <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-white/50 dark:bg-white/[0.03] blur-2xl" />
                      <div className="relative">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-2xl shadow-sm`}>
                              {config.icon}
                            </div>
                            <div>
                              <div className={`text-sm font-semibold ${config.text}`}>{config.label}</div>
                              <div className="text-xs text-gray-400">Слот {index + 1} из {plan.length}</div>
                            </div>
                          </div>
                          <span className="px-3 py-1.5 rounded-full bg-white/85 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {meal.cook_time_minutes} мин
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {meal.recipe_title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-300 mb-4 leading-relaxed">
                          {config.note}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="px-3 py-1.5 rounded-full bg-white/85 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-500 dark:text-gray-300">
                            Приготовление займет {meal.cook_time_minutes} минут
                          </span>
                          <Link
                            to={`/recipes/${meal.recipe_id}`}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          >
                            Открыть рецепт
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </StaggerChildren>
            </AnimateIn>

            <StaggerChildren variant="fade-up" stagger={60} className="space-y-4">
              <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                  Обзор дня
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Как распределяется нагрузка</h3>
                <div className="space-y-3 text-sm text-gray-500 dark:text-gray-300">
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                    Быстрее всего готовится: {fastestMeal ? `${MEAL_CONFIG[fastestMeal.meal_type].label} (${fastestMeal.cook_time_minutes} мин)` : 'нет данных'}.
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                    Дольше всего занимает: {longestMeal ? `${MEAL_CONFIG[longestMeal.meal_type].label} (${longestMeal.cook_time_minutes} мин)` : 'нет данных'}.
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                    Общая готовка по дню: {totalTime} минут.
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                  Как использовать
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">План не должен быть идеальным, он должен быть выполнимым</h3>
                <div className="space-y-3 text-sm text-gray-500 dark:text-gray-300">
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                    1. Используйте этот план как базовый ритм дня, а не как жесткий сценарий без изменений.
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                    2. Если слот кажется слишком длинным, откройте рецепт и замените его более быстрым из избранного.
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                    3. Возвращайтесь к анализу, если хотите понять, почему именно эти блюда появились в подборке.
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                  Переходы
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Что удобно открыть после плана</h3>
                <div className="space-y-3">
                  <Link
                    to="/favorites"
                    className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3 hover:border-primary-200 dark:hover:border-primary-500/20 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Избранное</div>
                      <div className="text-xs text-gray-400">Подменить дневные слоты своими сохраненными рецептами.</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>

                  <Link
                    to="/recipes"
                    className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3 hover:border-primary-200 dark:hover:border-primary-500/20 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Подборка рецептов</div>
                      <div className="text-xs text-gray-400">Найти альтернативы для любого приема пищи.</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </StaggerChildren>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
