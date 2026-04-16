import { useState, useEffect, useRef, type FormEvent, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
// import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
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
  bg: string
  icon: ReactNode
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
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current) }
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

  const getGenderLabel = (g: string) => g === 'male' ? 'Мужской' : g === 'female' ? 'Женский' : 'Не указан'

  const quickActions: QuickAction[] = [
    {
      to: '/data-entry',
      title: 'Ввести данные',
      desc: 'Загрузить анализы или заполнить анкету симптомов',
      gradient: 'from-primary-500 to-blue-500',
      bg: 'bg-primary-50',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      to: '/analysis',
      title: 'Мой анализ',
      desc: 'Посмотреть результаты витаминного анализа',
      gradient: 'from-accent-500 to-emerald-500',
      bg: 'bg-accent-50',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      to: '/favorites',
      title: 'Избранные рецепты',
      desc: 'Ваши сохранённые рецепты',
      gradient: 'from-rose-500 to-pink-500',
      bg: 'bg-rose-50',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
  ]

  const profileFields = [
    { label: 'Email', value: user?.email },
    { label: 'Пол', value: getGenderLabel(profile.gender) },
    { label: 'Возраст', value: profile.age ? `${profile.age} лет` : 'Не указан' },
    { label: 'Рост', value: profile.height_cm ? `${profile.height_cm} см` : 'Не указан' },
    { label: 'Вес', value: profile.weight_kg ? `${profile.weight_kg} кг` : 'Не указан' },
  ]

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <span className="section-eyebrow inline-block px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Личный кабинет
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Добро пожаловать!</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-1">Управляйте профилем и отслеживайте витаминный баланс</p>
        </div>

        {/* Profile card */}
        <div className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-primary-500 to-accent-500 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Профиль</h2>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-sm font-medium hover:bg-white/30 transition-colors"
              >
                Редактировать
              </button>
            )}
          </div>

          <div className="p-6">
            {saved && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl mb-5 text-sm flex items-center gap-3 border border-emerald-100 dark:border-emerald-800">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Профиль успешно сохранён!
              </div>
            )}

            {editing ? (
              <form onSubmit={handleSave} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Пол</label>
                  <select
                    value={profile.gender}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setProfile({ ...profile, gender: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white"
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
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
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
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
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
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                  />
                </div>
                <div className="flex flex-col gap-3 pt-2 sm:col-span-2 sm:flex-row">
                  <button type="submit" className="btn-primary w-full rounded-xl px-8 py-3 font-semibold text-white sm:w-auto">
                    Сохранить
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="w-full rounded-xl px-6 py-3 font-medium text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-gray-200 sm:w-auto">
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {profileFields.map((f, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl p-4">
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{f.label}</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{f.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-3 gap-4">
          {quickActions.map((action, i) => {
            // Compute status badge for each card
            let badge: ReactNode = null
            if (action.to === '/data-entry') {
              if (statusLoading) {
                badge = <div className="h-4 w-32 bg-gray-100 dark:bg-white/[0.06] rounded animate-pulse" />
              } else if (historyData && historyData.length > 0) {
                const lastDate = new Date(historyData[0].date)
                const daysAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
                badge = (
                  <span className="text-xs text-gray-400">
                    Последний анализ: {daysAgo === 0 ? 'сегодня' : `${daysAgo} дн. назад`}
                  </span>
                )
              } else {
                badge = <span className="text-xs text-gray-400">Нет данных</span>
              }
            } else if (action.to === '/analysis') {
              if (statusLoading) {
                badge = <div className="h-4 w-32 bg-gray-100 dark:bg-white/[0.06] rounded animate-pulse" />
              } else if (analysisData && analysisData.length > 0) {
                const defCount = analysisData.filter(a => a.status === 'deficiency').length
                badge = defCount > 0
                  ? <span className="text-xs font-medium text-red-500 dark:text-red-400">{defCount} {defCount === 1 ? 'дефицит обнаружен' : 'дефицита обнаружено'}</span>
                  : <span className="text-xs font-medium text-emerald-500 dark:text-emerald-400">Все в норме</span>
              } else {
                badge = <span className="text-xs text-gray-400">Нет данных</span>
              }
            }

            return (
              <Link key={i} to={action.to} className="group block bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.08] p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{action.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300">{action.desc}</p>
                {badge && <div className="mt-2">{badge}</div>}
                <div className="mt-3 text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Перейти
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </PageTransition>
  )
}
