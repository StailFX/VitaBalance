import { useState, useEffect, useRef, type FormEvent, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useToast } from '../context/ToastContext'
import type { VitaminAnalysisItem, AnalysisSnapshot } from '../types'

interface ProfileForm {
  gender: string
  age: string | number
  height_cm: string | number
  weight_kg: string | number
}

interface QuickAction {
  to: string
  title: string
  desc: string
  gradient: string
  surface: string
  border: string
  accent: string
  icon: ReactNode
}

const quickActions: QuickAction[] = [
  {
    to: '/data-entry',
    title: 'Ввести данные',
    desc: 'Обновите анализы или заполните анкету симптомов, чтобы картина была точнее.',
    gradient: 'from-primary-500 to-blue-500',
    surface: 'from-primary-50 via-white to-blue-50 dark:from-primary-500/12 dark:via-white/[0.03] dark:to-blue-500/10',
    border: 'border-primary-100 dark:border-primary-500/20',
    accent: 'text-primary-600 dark:text-primary-300',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    to: '/analysis',
    title: 'Открыть анализ',
    desc: 'Проверьте дефициты, норму и приоритетные направления по питанию.',
    gradient: 'from-accent-500 to-emerald-500',
    surface: 'from-emerald-50 via-white to-accent-50 dark:from-emerald-500/12 dark:via-white/[0.03] dark:to-accent-500/10',
    border: 'border-emerald-100 dark:border-emerald-500/20',
    accent: 'text-emerald-600 dark:text-emerald-300',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    to: '/favorites',
    title: 'Избранные рецепты',
    desc: 'Соберите личную подборку блюд, к которым можно быстро вернуться.',
    gradient: 'from-rose-500 to-pink-500',
    surface: 'from-rose-50 via-white to-pink-50 dark:from-rose-500/12 dark:via-white/[0.03] dark:to-pink-500/10',
    border: 'border-rose-100 dark:border-rose-500/20',
    accent: 'text-rose-600 dark:text-rose-300',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
]

function getGenderLabel(gender: string): string {
  if (gender === 'male') return 'Мужской'
  if (gender === 'female') return 'Женский'
  return 'Не указан'
}

export default function Dashboard() {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState<ProfileForm>({ gender: '', age: '', height_cm: '', weight_kg: '' })
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [analysisData, setAnalysisData] = useState<VitaminAnalysisItem[] | null>(null)
  const [historyData, setHistoryData] = useState<AnalysisSnapshot[] | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const { addToast } = useToast()
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (user?.profile) {
      setProfile({
        gender: user.profile.gender || '',
        age: user.profile.age || '',
        height_cm: user.profile.height_cm || '',
        weight_kg: user.profile.weight_kg || '',
      })
    }
  }, [user])

  useEffect(() => {
    let mounted = true
    Promise.allSettled([
      api.get('/vitamins/analysis'),
      api.get('/vitamins/history'),
    ]).then(([analysisRes, historyRes]) => {
      if (!mounted) return
      if (analysisRes.status === 'fulfilled') setAnalysisData(analysisRes.value.data)
      if (historyRes.status === 'fulfilled') setHistoryData(historyRes.value.data)
      setStatusLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const res = await api.put('/profile/me', profile)
      setUser(res.data)
      setEditing(false)
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
    } catch {
      addToast('Ошибка сохранения профиля', 'error')
    }
  }

  const deficiencyCount = analysisData?.filter((item) => item.status === 'deficiency').length ?? 0
  const normalCount = analysisData?.filter((item) => item.status === 'normal').length ?? 0
  const noDataCount = analysisData?.filter((item) => item.status === 'no_data').length ?? 0
  const latestSnapshot = historyData?.[0] ?? null
  const completedProfileFields = [profile.gender, profile.age, profile.height_cm, profile.weight_kg]
    .filter((value) => value !== '' && value !== null && value !== undefined).length
  const profileCompletion = Math.round((completedProfileFields / 4) * 100)
  const latestDate = latestSnapshot ? new Date(latestSnapshot.date) : null
  const latestDateLabel = latestDate
    ? latestDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Данных пока нет'
  const latestAgeDays = latestDate
    ? Math.max(0, Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24)))
    : null
  const heroTitle = deficiencyCount > 0
    ? 'Кабинет показывает, где сейчас нужен фокус'
    : latestSnapshot
      ? 'Все ключевые данные собраны в одном месте'
      : 'Соберите базовый профиль и начните отслеживать баланс'
  const heroText = deficiencyCount > 0
    ? 'У вас уже есть результаты, поэтому в центре внимания сейчас приоритетные дефициты, свежесть данных и полнота профиля.'
    : latestSnapshot
      ? 'Профиль, история анализов и быстрые сценарии под рукой: можно спокойно обновлять данные и возвращаться к рекомендациям.'
      : 'Начните с заполнения профиля и первого ввода данных, чтобы система построила персональную картину витаминного баланса.'
  const nextStepLabel = deficiencyCount > 0
    ? 'Сначала стоит открыть анализ и посмотреть, какие витамины требуют внимания.'
    : latestSnapshot
      ? 'Следующий шаг: поддерживать актуальность данных и возвращаться к истории изменений.'
      : 'Следующий шаг: заполнить профиль и добавить первые показатели.'

  const profileFields = [
    { label: 'Email', value: user?.email || 'Не указан' },
    { label: 'Пол', value: getGenderLabel(profile.gender) },
    { label: 'Возраст', value: profile.age ? `${profile.age} лет` : 'Не указан' },
    { label: 'Рост', value: profile.height_cm ? `${profile.height_cm} см` : 'Не указан' },
    { label: 'Вес', value: profile.weight_kg ? `${profile.weight_kg} кг` : 'Не указан' },
  ]

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-xl shadow-gray-200/40 dark:shadow-primary-500/[0.05] mb-8">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-12 left-0 h-48 w-48 rounded-full bg-primary-500/[0.08] dark:bg-primary-500/[0.14] blur-3xl" />
            <div className="absolute top-1/3 right-0 h-56 w-56 rounded-full bg-cyan-500/[0.08] dark:bg-cyan-500/[0.14] blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />
          </div>

          <div className="relative grid xl:grid-cols-[1.2fr_0.8fr] gap-6 p-6 sm:p-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/70 dark:bg-white/[0.06] border border-primary-200/60 dark:border-primary-500/20 backdrop-blur-sm mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Личный кабинет</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                {heroTitle}
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed max-w-xl mb-6">
                {heroText}
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <Link
                  to={deficiencyCount > 0 ? '/analysis' : '/data-entry'}
                  className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
                >
                  {deficiencyCount > 0 ? 'Открыть мой анализ' : 'Добавить данные'}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  to="/analysis/history"
                  className="px-6 py-3 rounded-2xl bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2"
                >
                  История изменений
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Link>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {user?.email || 'Почта не указана'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  Профиль заполнен на {profileCompletion}%
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {latestSnapshot ? `Последняя запись ${latestDateLabel}` : 'История ещё не сформирована'}
                </span>
              </div>
            </div>

            <StaggerChildren variant="fade-up" stagger={70} className="grid gap-3 self-start sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-primary-100 dark:border-primary-500/20 bg-gradient-to-br from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.04] dark:to-white/[0.02] p-4 sm:p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-primary-500 dark:text-primary-300 mb-2">Профиль</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{profileCompletion}%</div>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                  {profileCompletion >= 75 ? 'Почти готов для персональных рекомендаций.' : 'Заполните ещё несколько полей для точности.'}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-cyan-100 dark:border-cyan-500/20 bg-gradient-to-br from-cyan-50 via-white to-white dark:from-cyan-500/12 dark:via-white/[0.04] dark:to-white/[0.02] p-4 sm:p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300 mb-2">Свежесть данных</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {latestAgeDays === null ? '—' : latestAgeDays === 0 ? '0 дн.' : `${latestAgeDays} дн.`}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                  {latestSnapshot ? `Последний ввод: ${latestDateLabel}` : 'Добавьте первую запись, чтобы видеть динамику.'}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-rose-100 dark:border-rose-500/20 bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-500/12 dark:via-white/[0.04] dark:to-white/[0.02] p-4 sm:p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300 mb-2">Риск-дефициты</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {statusLoading ? '...' : deficiencyCount}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                  {deficiencyCount > 0 ? 'Есть показатели, которые стоит разобрать первыми.' : 'Критичных дефицитов сейчас не видно.'}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-emerald-100 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.04] dark:to-white/[0.02] p-4 sm:p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300 mb-2">В норме</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {statusLoading ? '...' : normalCount}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                  {normalCount > 0 ? 'Эти показатели уже выглядят устойчиво.' : 'После первого анализа здесь появится стабильная зона.'}
                </p>
              </div>
            </StaggerChildren>
          </div>
        </section>

        <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6 mb-8">
          <AnimateIn variant="blur" className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
            <div className="px-6 sm:px-7 py-5 border-b border-gray-100 dark:border-white/[0.06] bg-gradient-to-r from-white via-primary-50/70 to-cyan-50/70 dark:from-white/[0.02] dark:via-primary-500/[0.08] dark:to-cyan-500/[0.05]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary-500 dark:text-primary-300 font-semibold mb-2">
                    Профиль
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Личные данные</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    Профиль влияет на нормы, поэтому стоит держать его полным и актуальным.
                  </p>
                </div>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 rounded-2xl bg-white/90 dark:bg-white/[0.06] text-gray-700 dark:text-gray-200 text-sm font-semibold border border-gray-200 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.09] transition-colors"
                  >
                    Редактировать профиль
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-7">
              {saved && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl mb-5 text-sm flex items-center gap-3 border border-emerald-100 dark:border-emerald-800">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Профиль успешно сохранён.
                </div>
              )}

              {editing ? (
                <form onSubmit={handleSave} className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Пол</label>
                    <select
                      value={profile.gender}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setProfile({ ...profile, gender: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white"
                    >
                      <option value="">Не указан</option>
                      <option value="male">Мужской</option>
                      <option value="female">Женский</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Возраст</label>
                    <input
                      type="number"
                      min="1"
                      max="150"
                      value={profile.age}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, age: e.target.value })}
                      placeholder="Введите возраст"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Рост (см)</label>
                    <input
                      type="number"
                      min="50"
                      max="300"
                      value={profile.height_cm}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, height_cm: e.target.value })}
                      placeholder="Введите рост"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Вес (кг)</label>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      value={profile.weight_kg}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, weight_kg: e.target.value })}
                      placeholder="Введите вес"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
                    <button type="submit" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold">
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-6 py-3 rounded-2xl text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-all font-medium"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {profileFields.map((field) => (
                    <div
                      key={field.label}
                      className="rounded-[1.5rem] border border-gray-200 dark:border-white/[0.06] bg-gradient-to-br from-white to-gray-50 dark:from-white/[0.03] dark:to-white/[0.02] p-4"
                    >
                      <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-2">{field.label}</div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white">{field.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AnimateIn>

          <AnimateIn variant="fade-up" className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
            <div className="px-6 sm:px-7 py-5 border-b border-gray-100 dark:border-white/[0.06]">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300 font-semibold mb-2">
                Пульс кабинета
              </span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Что происходит сейчас</h2>
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                Короткая сводка по свежести данных, балансу и следующему действию.
              </p>
            </div>

            <div className="p-6 sm:p-7 space-y-4">
              <div className="rounded-[1.5rem] border border-primary-100 dark:border-primary-500/20 bg-primary-50/80 dark:bg-primary-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-primary-500 dark:text-primary-300 mb-2">История</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{latestDateLabel}</div>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  {latestSnapshot ? `Записей в истории: ${historyData?.length || 0}` : 'История появится после первого ввода данных.'}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-rose-100 dark:border-rose-500/20 bg-rose-50/80 dark:bg-rose-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300 mb-2">Баланс</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {statusLoading ? 'Проверяем данные...' : deficiencyCount > 0 ? `${deficiencyCount} зон риска` : 'Выраженных дефицитов не видно'}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  {statusLoading ? 'Как только анализ загрузится, здесь появится краткая оценка.' : `В норме: ${normalCount}, без данных: ${noDataCount}.`}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300 mb-2">Следующий шаг</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">Рекомендуемый сценарий</div>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1 mb-3">
                  {nextStepLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link to={deficiencyCount > 0 ? '/analysis' : '/data-entry'} className="px-4 py-2 rounded-xl bg-white dark:bg-white/[0.06] border border-white/80 dark:border-white/[0.08] text-sm font-semibold text-gray-800 dark:text-white">
                    {deficiencyCount > 0 ? 'К анализу' : 'Добавить данные'}
                  </Link>
                  <Link to="/vitamins" className="px-4 py-2 rounded-xl bg-white dark:bg-white/[0.06] border border-white/80 dark:border-white/[0.08] text-sm font-semibold text-gray-800 dark:text-white">
                    Справочник
                  </Link>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <div>
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                Навигация
              </span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Быстрые действия</h2>
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                Самые частые сценарии собраны в одном месте, чтобы не искать нужный раздел в меню.
              </p>
            </div>
          </div>

          <StaggerChildren variant="fade-up" stagger={80} className="grid md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              let badge: ReactNode = <span className="text-xs text-gray-400">Быстрый доступ</span>
              if (action.to === '/data-entry') {
                badge = latestSnapshot
                  ? <span className="text-xs text-gray-500 dark:text-gray-300">Последний ввод {latestAgeDays === 0 ? 'сегодня' : `${latestAgeDays} дн. назад`}</span>
                  : <span className="text-xs text-gray-400">История ещё не заполнена</span>
              } else if (action.to === '/analysis') {
                badge = statusLoading
                  ? <span className="text-xs text-gray-400">Загружаем оценку...</span>
                  : deficiencyCount > 0
                    ? <span className="text-xs font-semibold text-rose-500 dark:text-rose-300">Есть дефициты, которые стоит открыть первыми</span>
                    : <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-300">Картина выглядит спокойной</span>
              }

              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className={`group relative overflow-hidden rounded-[1.75rem] border ${action.border} bg-gradient-to-br ${action.surface} p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
                >
                  <div className="absolute top-0 right-0 h-24 w-24 bg-white/35 dark:bg-white/[0.03] rounded-full blur-2xl" />
                  <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center mb-4 shadow-lg`}>
                    {action.icon}
                  </div>
                  <div className="relative">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">{action.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed mb-4">{action.desc}</p>
                    <div className="flex items-center justify-between gap-3">
                      <div>{badge}</div>
                      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${action.accent}`}>
                        Открыть
                        <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </StaggerChildren>
        </section>
      </div>
    </PageTransition>
  )
}
