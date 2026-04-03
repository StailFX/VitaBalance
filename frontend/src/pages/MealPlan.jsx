import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { CardSkeleton } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'

const MEAL_CONFIG = {
  breakfast: { label: 'Завтрак', icon: '🌅', gradient: 'from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30', text: 'text-amber-600 dark:text-amber-400' },
  lunch: { label: 'Обед', icon: '☀️', gradient: 'from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30', text: 'text-blue-600 dark:text-blue-400' },
  dinner: { label: 'Ужин', icon: '🌙', gradient: 'from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
  snack: { label: 'Перекус', icon: '🍎', gradient: 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30', text: 'text-green-600 dark:text-green-400' },
}

export default function MealPlan() {
  const [plan, setPlan] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    api.get('/recipes/meal-plan').then((res) => {
      setPlan(res.data)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      addToast('Ошибка загрузки плана питания', 'error')
    })
  }, [addToast])

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </PageTransition>
    )
  }

  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack']

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            План питания
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Суточный план питания</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-2">Составлен на основе ваших дефицитов витаминов</p>
        </div>

        {plan.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513M12 8.25V3m0 16.5v2.25" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">План не сформирован</h2>
            <p className="text-gray-500 dark:text-gray-300 mb-8">Сначала введите данные анализов, чтобы мы составили план</p>
            <Link to="/data-entry" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
              Ввести данные
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {mealOrder.map((mealType) => {
              const meal = plan.find(m => m.meal_type === mealType)
              const config = MEAL_CONFIG[mealType]
              if (!meal) return null
              return (
                <div key={mealType} className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-100 dark:border-white/[0.06] shadow-sm overflow-hidden card-hover">
                  <div className={`bg-gradient-to-r ${config.gradient} px-6 py-4 flex items-center gap-3`}>
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <h2 className={`font-semibold ${config.text}`}>{config.label}</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-300">{meal.cook_time_minutes} мин приготовления</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <Link to={`/recipes/${meal.recipe_id}`} className="group">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-2">
                        {meal.recipe_title}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400">
                        Посмотреть рецепт
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </span>
                    </Link>
                  </div>
                </div>
              )
            })}

            <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-5 border border-gray-200 dark:border-white/[0.08] shadow-sm flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Общее время приготовления</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{plan.reduce((sum, m) => sum + (m.cook_time_minutes || 0), 0)} мин</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
