import { useState, useEffect, useMemo, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useToast } from '../context/ToastContext'
import { getVitaminIcon } from '../utils/vitaminIcons'
import type { Vitamin, SymptomMapping, UserOut, UserProfile } from '../types'

interface GroupedSymptom {
  text: string
  ids: number[]
  vitaminIds: number[]
}

interface LabEntryDraft {
  vitamin_id: number
  value: number
  source: 'lab'
}

interface SavedVitaminEntry {
  id: number
  vitamin_id: number
  value: number
  source: string
  entry_date: string
}

interface SummaryCard {
  label: string
  value: string
  description: string
  accent: string
  surface: string
  border: string
}

function getGenderLabel(gender: UserProfile['gender']): string {
  if (gender === 'female') return 'Женский профиль'
  if (gender === 'male') return 'Мужской профиль'
  return 'Профиль не заполнен'
}

function getNormRange(vitamin: Vitamin, gender: UserProfile['gender']): { min: number; max: number; basis: 'male' | 'female' } {
  if (gender === 'female') {
    return {
      min: vitamin.norm_female_min,
      max: vitamin.norm_female_max,
      basis: 'female',
    }
  }

  return {
    min: vitamin.norm_male_min,
    max: vitamin.norm_male_max,
    basis: 'male',
  }
}

export default function DataEntry() {
  const [mode, setMode] = useState<'lab' | 'symptoms'>('lab')
  const [vitamins, setVitamins] = useState<Vitamin[]>([])
  const [labValues, setLabValues] = useState<Record<number, string>>({})
  const [symptoms, setSymptoms] = useState<SymptomMapping[]>([])
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [symptomSearch, setSymptomSearch] = useState('')
  const [labSearch, setLabSearch] = useState('')
  const navigate = useNavigate()
  const { addToast } = useToast()

  useEffect(() => {
    let mounted = true

    Promise.allSettled([
      api.get<Vitamin[]>('/vitamins/'),
      api.get<SymptomMapping[]>('/vitamins/symptoms'),
      api.get<UserOut>('/profile/me'),
      api.get<SavedVitaminEntry[]>('/vitamins/entries/latest', { params: { source: 'lab' } }),
    ]).then(([vitaminsRes, symptomsRes, profileRes, savedEntriesRes]) => {
      if (!mounted) return

      const hasCriticalError = vitaminsRes.status !== 'fulfilled' || symptomsRes.status !== 'fulfilled'
      if (hasCriticalError) {
        setLoadingError(true)
        setLoading(false)
        addToast('Не удалось загрузить форму ввода', 'error')
        return
      }

      setVitamins(vitaminsRes.value.data)
      setSymptoms(symptomsRes.value.data)

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data?.profile ?? null)
      } else {
        setProfile(null)
      }

      if (savedEntriesRes.status === 'fulfilled') {
        const initialLabValues = Object.fromEntries(
          savedEntriesRes.value.data.map((entry) => [entry.vitamin_id, String(entry.value)])
        )
        setLabValues(initialLabValues)
      }

      setLoadingError(false)
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [addToast])

  const validLabEntries = useMemo<LabEntryDraft[]>(() => (
    Object.entries(labValues)
      .map(([vitaminId, value]) => ({ vitamin_id: Number(vitaminId), rawValue: value.trim() }))
      .filter((entry) => entry.rawValue !== '' && !Number.isNaN(Number(entry.rawValue)))
      .map((entry) => ({
        vitamin_id: entry.vitamin_id,
        value: Number(entry.rawValue),
        source: 'lab' as const,
      }))
  ), [labValues])

  const groupedSymptoms = useMemo<GroupedSymptom[]>(() => {
    const map = new Map<string, GroupedSymptom>()

    for (const symptom of symptoms) {
      const existing = map.get(symptom.symptom_text)
      if (existing) {
        existing.ids.push(symptom.id)
        if (!existing.vitaminIds.includes(symptom.vitamin_id)) {
          existing.vitaminIds.push(symptom.vitamin_id)
        }
      } else {
        map.set(symptom.symptom_text, {
          text: symptom.symptom_text,
          ids: [symptom.id],
          vitaminIds: [symptom.vitamin_id],
        })
      }
    }

    return Array.from(map.values())
  }, [symptoms])

  const filteredVitamins = useMemo(() => {
    const query = labSearch.trim().toLowerCase()
    if (!query) return vitamins
    return vitamins.filter((vitamin) => (
      vitamin.name.toLowerCase().includes(query) || vitamin.code.toLowerCase().includes(query)
    ))
  }, [labSearch, vitamins])

  const filteredSymptoms = useMemo(() => {
    const query = symptomSearch.trim().toLowerCase()
    if (!query) return groupedSymptoms
    return groupedSymptoms.filter((group) => group.text.toLowerCase().includes(query))
  }, [groupedSymptoms, symptomSearch])

  const selectedSymptomGroups = useMemo(() => (
    groupedSymptoms.filter((group) => group.ids.every((id) => selectedSymptoms.has(id)))
  ), [groupedSymptoms, selectedSymptoms])

  const selectedVitaminCoverage = useMemo(() => {
    const vitaminIds = new Set<number>()
    symptoms.forEach((symptom) => {
      if (selectedSymptoms.has(symptom.id)) vitaminIds.add(symptom.vitamin_id)
    })
    return vitaminIds.size
  }, [selectedSymptoms, symptoms])

  const filledCount = validLabEntries.length
  const totalCount = vitamins.length
  const progressPercent = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0
  const profileCompletion = Math.round((
    [profile?.gender, profile?.age, profile?.height_cm, profile?.weight_kg]
      .filter((value) => value !== null && value !== undefined)
      .length / 4
  ) * 100)
  const profileBasis = profile?.gender === 'female' ? 'женские нормы' : 'мужские нормы'

  const heroTitle = mode === 'lab'
    ? (filledCount > 0
      ? 'Соберите ввод так, чтобы анализ был точным и спокойным для чтения'
      : 'Начните с лабораторных значений и задайте новую контрольную точку')
    : (selectedSymptomGroups.length > 0
      ? 'Симптомы тоже можно превратить в понятную картину дефицитов'
      : 'Отметьте самочувствие, если анализов под рукой пока нет')

  const heroText = mode === 'lab'
    ? 'Страница помогает быстро внести показатели, держать в фокусе норму и не теряться в длинной форме. Чем полнее ввод, тем полезнее итоговый анализ.'
    : 'Анкета самочувствия подходит для первого приближения. Отметьте наблюдаемые симптомы, и система свяжет их с возможными дефицитами.'

  const summaryCards: SummaryCard[] = mode === 'lab'
    ? [
      {
        label: 'Витамины',
        value: `${totalCount}`,
        description: 'Показателей доступно для ввода в лабораторном сценарии.',
        accent: 'text-primary-600 dark:text-primary-300',
        surface: 'from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
        border: 'border-primary-100 dark:border-primary-500/20',
      },
      {
        label: 'Заполнено',
        value: `${filledCount}`,
        description: 'Числовых значений уже готовы к отправке в анализ.',
        accent: 'text-cyan-600 dark:text-cyan-300',
        surface: 'from-cyan-50 via-white to-white dark:from-cyan-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
        border: 'border-cyan-100 dark:border-cyan-500/20',
      },
      {
        label: 'Профиль',
        value: `${profileCompletion}%`,
        description: profile?.gender ? `Сейчас ориентиры строятся через ${profileBasis}.` : 'Пол пока не указан, поэтому используется мужской ориентир.',
        accent: 'text-emerald-600 dark:text-emerald-300',
        surface: 'from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
        border: 'border-emerald-100 dark:border-emerald-500/20',
      },
      {
        label: 'Готовность',
        value: filledCount > 0 ? 'Можно анализировать' : 'Нужны данные',
        description: filledCount > 0 ? 'Форма уже содержит данные, можно переходить к результатам.' : 'Добавьте хотя бы один показатель, чтобы построить анализ.',
        accent: 'text-rose-600 dark:text-rose-300',
        surface: 'from-rose-50 via-white to-white dark:from-rose-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
        border: 'border-rose-100 dark:border-rose-500/20',
      },
    ]
    : [
      {
        label: 'Симптомы',
        value: `${groupedSymptoms.length}`,
        description: 'Доступных признаков самочувствия можно отметить на странице.',
        accent: 'text-amber-600 dark:text-amber-300',
        surface: 'from-amber-50 via-white to-white dark:from-amber-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
        border: 'border-amber-100 dark:border-amber-500/20',
      },
      {
        label: 'Выбрано',
        value: `${selectedSymptomGroups.length}`,
        description: 'Симптомов уже добавлено в текущий сценарий анализа.',
        accent: 'text-orange-600 dark:text-orange-300',
        surface: 'from-orange-50 via-white to-white dark:from-orange-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
        border: 'border-orange-100 dark:border-orange-500/20',
      },
      {
        label: 'Покрытие',
        value: `${selectedVitaminCoverage}`,
        description: 'Столько витаминных направлений затрагивают выбранные симптомы.',
        accent: 'text-primary-600 dark:text-primary-300',
        surface: 'from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
        border: 'border-primary-100 dark:border-primary-500/20',
      },
      {
        label: 'Профиль',
        value: `${profileCompletion}%`,
        description: profile?.gender ? `Сохранен ${getGenderLabel(profile.gender).toLowerCase()}.` : 'Профиль можно уточнить позже в личном кабинете.',
        accent: 'text-emerald-600 dark:text-emerald-300',
        surface: 'from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
        border: 'border-emerald-100 dark:border-emerald-500/20',
      },
    ]

  const handleLabSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (validLabEntries.length === 0) {
      addToast('Добавьте хотя бы один показатель анализа', 'info')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/vitamins/entries', validLabEntries)
      addToast('Данные анализов сохранены', 'success')
      navigate('/analysis')
    } catch {
      addToast('Ошибка сохранения данных', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSymptomSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (selectedSymptoms.size === 0) {
      addToast('Выберите хотя бы один симптом', 'info')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/vitamins/entries/symptoms', { symptom_ids: Array.from(selectedSymptoms) })
      addToast('Анкета самочувствия сохранена', 'success')
      navigate('/analysis')
    } catch {
      addToast('Ошибка сохранения данных', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSymptom = (ids: number[]) => {
    setSelectedSymptoms((prev) => {
      const next = new Set(prev)
      const isSelected = ids.every((id) => next.has(id))
      if (isSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="w-14 h-14 rounded-full border-4 border-primary-100 dark:border-primary-900/40 border-t-primary-500 animate-spin" />
        </div>
      </PageTransition>
    )
  }

  if (loadingError) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.094c.55 0 1.02.398 1.11.94l.178 1.068a1.125 1.125 0 001.65.79l.962-.55a1.125 1.125 0 011.362.171l.773.773c.39.39.457.997.17 1.362l-.55.962a1.125 1.125 0 00.79 1.65l1.069.178c.541.09.939.56.939 1.11v1.094c0 .55-.398 1.02-.94 1.11l-1.068.178a1.125 1.125 0 00-.79 1.65l.55.962c.287.365.22.972-.171 1.362l-.773.773a1.125 1.125 0 01-1.362.17l-.962-.55a1.125 1.125 0 00-1.65.79l-.178 1.069c-.09.541-.56.939-1.11.939h-1.094c-.55 0-1.02-.398-1.11-.94l-.178-1.068a1.125 1.125 0 00-1.65-.79l-.962.55a1.125 1.125 0 01-1.362-.171l-.773-.773a1.125 1.125 0 01-.17-1.362l.55-.962a1.125 1.125 0 00-.79-1.65l-1.069-.178A1.125 1.125 0 013 12.547v-1.094c0-.55.398-1.02.94-1.11l1.068-.178a1.125 1.125 0 00.79-1.65l-.55-.962a1.125 1.125 0 01.171-1.362l.773-.773a1.125 1.125 0 011.362-.17l.962.55a1.125 1.125 0 001.65-.79l.178-1.069z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Форма ввода сейчас недоступна</h1>
          <p className="text-gray-500 dark:text-gray-300 mb-8">Не удалось загрузить витамины или симптомы. Попробуйте обновить страницу чуть позже.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold"
            >
              Обновить страницу
            </button>
            <Link
              to="/dashboard"
              className="px-8 py-3 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08]"
            >
              В кабинет
            </Link>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-xl shadow-gray-200/40 dark:shadow-primary-500/[0.05]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 left-0 h-44 w-44 rounded-full bg-primary-500/[0.08] dark:bg-primary-500/[0.14] blur-3xl" />
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
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/70 dark:bg-white/[0.06] border border-primary-200/60 dark:border-primary-500/20 backdrop-blur-sm mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Ввод данных</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                {heroTitle}
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed max-w-xl mb-6">
                {heroText}
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <Link
                  to="/analysis"
                  className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
                >
                  Открыть анализ
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  to="/dashboard"
                  className="px-6 py-3 rounded-2xl bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2"
                >
                  Вернуться в кабинет
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9m-9 6h9m-9 6h9M4.5 6h.008v.008H4.5V6zm0 6h.008v.008H4.5V12zm0 6h.008v.008H4.5V18z" />
                  </svg>
                </Link>
              </div>

              <div className="inline-flex flex-wrap gap-1.5 rounded-[1.35rem] bg-gray-100/95 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] p-1.5">
                <button
                  type="button"
                  onClick={() => setMode('lab')}
                  className={`px-4 sm:px-5 py-3 rounded-[1rem] text-sm font-semibold transition-all inline-flex items-center gap-2 ${
                    mode === 'lab'
                      ? 'bg-white dark:bg-white/[0.08] text-primary-600 dark:text-primary-300 shadow-sm'
                      : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                  Анализы
                </button>
                <button
                  type="button"
                  onClick={() => setMode('symptoms')}
                  className={`px-4 sm:px-5 py-3 rounded-[1rem] text-sm font-semibold transition-all inline-flex items-center gap-2 ${
                    mode === 'symptoms'
                      ? 'bg-white dark:bg-white/[0.08] text-primary-600 dark:text-primary-300 shadow-sm'
                      : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                  Самочувствие
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5 mt-6">
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {getGenderLabel(profile?.gender ?? null)}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  Нормы: {profileBasis}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                  {mode === 'lab' ? `Подготовлено ${filledCount} значений` : `Выбрано ${selectedSymptomGroups.length} симптомов`}
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

        <div className="grid xl:grid-cols-[1.12fr_0.88fr] gap-6 items-start">
          <AnimateIn variant="blur" className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 sm:p-7">
            {mode === 'lab' ? (
              <form onSubmit={handleLabSubmit} className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                      Лабораторный сценарий
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Добавьте показатели из анализов</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                      Оставляйте пустыми те показатели, которых пока нет. Система возьмет только заполненные значения.
                    </p>
                  </div>
                  <label className="w-full sm:w-72">
                    <span className="sr-only">Поиск витамина</span>
                    <div className="relative">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      <input
                        type="text"
                        value={labSearch}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setLabSearch(e.target.value)}
                        placeholder="Найти витамин или код"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] transition-all text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                  </label>
                </div>

                <div className="rounded-[1.6rem] border border-gray-200 dark:border-white/[0.08] bg-gradient-to-r from-primary-50 via-white to-cyan-50 dark:from-primary-500/10 dark:via-white/[0.03] dark:to-cyan-500/8 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">Прогресс заполнения</div>
                      <p className="text-sm text-gray-500 dark:text-gray-300">
                        {filledCount > 0
                          ? `Уже заполнено ${filledCount} из ${totalCount} показателей.`
                          : 'Добавьте хотя бы один показатель, чтобы построить анализ.'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{progressPercent}%</div>
                      <div className="text-xs text-gray-400">готово к отправке</div>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/70 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {!profile?.gender && (
                    <div className="mt-4 rounded-2xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/85 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
                      Пол в профиле не указан, поэтому диапазоны на карточках показываются по мужским нормам. Это можно уточнить в{' '}
                      <Link to="/dashboard" className="font-semibold underline underline-offset-2">
                        личном кабинете
                      </Link>
                      .
                    </div>
                  )}
                </div>

                {filteredVitamins.length === 0 ? (
                  <div className="rounded-[1.6rem] border border-dashed border-gray-300 dark:border-white/[0.12] px-6 py-10 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ничего не найдено</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      Попробуйте изменить запрос или очистить поиск, чтобы вернуть весь список витаминов.
                    </p>
                  </div>
                ) : (
                  <StaggerChildren variant="fade-up" stagger={45} className="grid md:grid-cols-2 gap-4">
                    {filteredVitamins.map((vitamin) => {
                      const icon = getVitaminIcon(vitamin.code)
                      const value = labValues[vitamin.id] ?? ''
                      const isFilled = value.trim() !== '' && !Number.isNaN(Number(value))
                      const range = getNormRange(vitamin, profile?.gender ?? null)

                      return (
                        <label
                          key={vitamin.id}
                          className={`relative overflow-hidden rounded-[1.6rem] border p-4 transition-all cursor-text ${
                            isFilled
                              ? 'border-primary-200 dark:border-primary-500/25 bg-gradient-to-br from-primary-50/80 via-white to-white dark:from-primary-500/10 dark:via-white/[0.03] dark:to-white/[0.02] shadow-sm'
                              : 'border-gray-200 dark:border-white/[0.08] bg-gradient-to-br from-white to-gray-50 dark:from-white/[0.03] dark:to-white/[0.02]'
                          }`}
                        >
                          <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-white/50 dark:bg-white/[0.03] blur-2xl" />
                          <div className="relative">
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${icon.gradient} flex items-center justify-center text-xl text-white shadow-lg flex-shrink-0`}>
                                  {icon.emoji}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-1">
                                    {vitamin.code}
                                  </div>
                                  <h3 className="font-semibold text-gray-900 dark:text-white leading-snug">{vitamin.name}</h3>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                isFilled
                                  ? 'bg-primary-50 dark:bg-primary-500/12 text-primary-600 dark:text-primary-300 border-primary-200 dark:border-primary-500/20'
                                  : 'bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-300 border-gray-200 dark:border-white/[0.08]'
                              }`}>
                                {isFilled ? 'Заполнено' : 'Пусто'}
                              </span>
                            </div>

                            <div className="rounded-2xl bg-gray-50/90 dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/[0.06] px-4 py-3 mb-4">
                              <div className="text-xs uppercase tracking-[0.16em] text-gray-400 font-semibold mb-1">
                                Диапазон нормы
                              </div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {range.min}-{range.max} {vitamin.unit}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Основание: {range.basis === 'female' ? 'женский профиль' : 'мужской профиль'}
                              </div>
                            </div>

                            <div className="flex items-end gap-3">
                              <div className="flex-1">
                                <span className="text-xs uppercase tracking-[0.16em] text-gray-400 font-semibold mb-2 block">
                                  Значение анализа
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Например, 32.5"
                                  value={value}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    setLabValues((prev) => ({ ...prev, [vitamin.id]: e.target.value }))
                                  }}
                                  className="w-full px-4 py-3 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400"
                                />
                              </div>
                              <div className="pb-3 text-sm font-semibold text-gray-400 whitespace-nowrap">
                                {vitamin.unit}
                              </div>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </StaggerChildren>
                )}

                <div className="pt-5 border-t border-gray-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-500 dark:text-gray-300 max-w-xl">
                    Форма отправит только заполненные поля. После сохранения вы сразу попадете на страницу анализа.
                  </p>
                  <button
                    type="submit"
                    disabled={submitting || validLabEntries.length === 0}
                    className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {submitting ? 'Сохраняю...' : 'Получить анализ'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSymptomSubmit} className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                      Сценарий самочувствия
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Соберите картину по симптомам</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                      Подойдет для быстрого старта, когда лабораторных данных нет под рукой. Чем точнее выбор, тем полезнее рекомендация.
                    </p>
                  </div>
                  <label className="w-full sm:w-72">
                    <span className="sr-only">Поиск симптома</span>
                    <div className="relative">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      <input
                        type="text"
                        value={symptomSearch}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSymptomSearch(e.target.value)}
                        placeholder="Найти симптом"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] transition-all text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                  </label>
                </div>

                <div className="rounded-[1.6rem] border border-gray-200 dark:border-white/[0.08] bg-gradient-to-r from-amber-50 via-white to-orange-50 dark:from-amber-500/10 dark:via-white/[0.03] dark:to-orange-500/8 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">Текущая выборка</div>
                      <p className="text-sm text-gray-500 dark:text-gray-300">
                        {selectedSymptomGroups.length > 0
                          ? `Вы выбрали ${selectedSymptomGroups.length} симптомов, которые покрывают ${selectedVitaminCoverage} витаминных направлений.`
                          : 'Начните отмечать симптомы, чтобы система оценила вероятные дефициты.'}
                      </p>
                    </div>
                    {selectedSymptomGroups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSymptoms(new Set())}
                        className="px-4 py-2 rounded-xl bg-white/80 dark:bg-white/[0.06] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/[0.08] text-sm font-semibold"
                      >
                        Очистить выбор
                      </button>
                    )}
                  </div>
                </div>

                {filteredSymptoms.length === 0 ? (
                  <div className="rounded-[1.6rem] border border-dashed border-gray-300 dark:border-white/[0.12] px-6 py-10 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Симптомы не найдены</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      Попробуйте изменить поисковый запрос или очистить его, чтобы увидеть полный список.
                    </p>
                  </div>
                ) : (
                  <StaggerChildren variant="fade-up" stagger={35} className="grid md:grid-cols-2 gap-4">
                    {filteredSymptoms.map((group) => {
                      const isSelected = group.ids.every((id) => selectedSymptoms.has(id))

                      return (
                        <label
                          key={group.text}
                          className={`relative overflow-hidden rounded-[1.6rem] border p-4 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary-200 dark:border-primary-500/20 bg-gradient-to-br from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.03] dark:to-white/[0.02] shadow-sm'
                              : 'border-gray-200 dark:border-white/[0.08] bg-gradient-to-br from-white to-gray-50 dark:from-white/[0.03] dark:to-white/[0.02] hover:border-gray-300 dark:hover:border-white/[0.14]'
                          }`}
                        >
                          <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-white/50 dark:bg-white/[0.03] blur-2xl" />
                          <div className="relative flex items-start gap-4">
                            <div className={`mt-0.5 w-6 h-6 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected
                                ? 'border-primary-500 bg-primary-500'
                                : 'border-gray-300 dark:border-white/[0.12] bg-white dark:bg-white/[0.03]'
                            }`}>
                              {isSelected && (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSymptom(group.ids)}
                                className="hidden"
                              />
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="font-semibold text-gray-900 dark:text-white leading-snug">{group.text}</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${
                                  isSelected
                                    ? 'bg-primary-50 dark:bg-primary-500/12 text-primary-600 dark:text-primary-300 border-primary-200 dark:border-primary-500/20'
                                    : 'bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-300 border-gray-200 dark:border-white/[0.08]'
                                }`}>
                                  {isSelected ? 'Выбрано' : 'Не выбрано'}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                <span className="px-3 py-1 rounded-full bg-white/85 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-xs text-gray-500 dark:text-gray-300">
                                  Связано с {group.vitaminIds.length} показателями
                                </span>
                                <span className="px-3 py-1 rounded-full bg-white/85 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-xs text-gray-500 dark:text-gray-300">
                                  Используется в анализе самочувствия
                                </span>
                              </div>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </StaggerChildren>
                )}

                <div className="pt-5 border-t border-gray-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-500 dark:text-gray-300 max-w-xl">
                    Анкета отправляет только выбранные симптомы и строит анализ по вероятным направлениям дефицита.
                  </p>
                  <button
                    type="submit"
                    disabled={submitting || selectedSymptoms.size === 0}
                    className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {submitting ? 'Сохраняю...' : 'Получить анализ'}
                  </button>
                </div>
              </form>
            )}
          </AnimateIn>

          <StaggerChildren variant="fade-up" stagger={60} className="space-y-4">
            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Контекст
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Как быстрее получить полезный результат</h3>
              <div className="space-y-3 text-sm text-gray-500 dark:text-gray-300">
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  1. Если есть лабораторные данные, начните с них: они дают самый точный профиль.
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  2. Если анализов нет, используйте анкету симптомов, чтобы получить рабочую первую гипотезу.
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                  3. После сохранения откройте результаты и рекомендации по продуктам, чтобы быстро перейти к действию.
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Профиль
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Профиль влияет на диапазоны нормы</h3>
              <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed mb-4">
                Сейчас сохранен: <span className="font-semibold text-gray-900 dark:text-white">{getGenderLabel(profile?.gender ?? null)}</span>.
                {' '}Если хотите точнее интерпретировать нормы, стоит проверить пол, возраст, рост и вес в кабинете.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08]"
              >
                Открыть профиль
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>

            <div className="bg-white dark:bg-white/[0.03] rounded-[1.8rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">
                Быстрый обзор
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {mode === 'lab' ? 'Что уже подготовлено' : 'На чем держится текущая анкета'}
              </h3>

              {mode === 'lab' ? (
                filledCount > 0 ? (
                  <div className="space-y-3">
                    {validLabEntries.slice(0, 4).map((entry) => {
                      const vitamin = vitamins.find((item) => item.id === entry.vitamin_id)
                      if (!vitamin) return null
                      const icon = getVitaminIcon(vitamin.code)

                      return (
                        <div key={entry.vitamin_id} className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${icon.gradient} flex items-center justify-center text-xl text-white shadow-lg flex-shrink-0`}>
                            {icon.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white">{vitamin.name}</div>
                            <div className="text-xs text-gray-400">{entry.value} {vitamin.unit}</div>
                          </div>
                        </div>
                      )
                    })}
                    {filledCount > 4 && (
                      <div className="text-sm text-gray-400">И еще {filledCount - 4} показателей готовы к отправке.</div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
                    Пока нет введенных лабораторных значений. Начните хотя бы с одного показателя, чтобы получить первую персональную сводку.
                  </p>
                )
              ) : (
                selectedSymptomGroups.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSymptomGroups.slice(0, 4).map((group) => (
                      <div key={group.text} className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-white">{group.text}</div>
                        <div className="text-xs text-gray-400 mt-1">Связано с {group.vitaminIds.length} показателями</div>
                      </div>
                    ))}
                    {selectedSymptomGroups.length > 4 && (
                      <div className="text-sm text-gray-400">И еще {selectedSymptomGroups.length - 4} симптомов участвуют в расчете.</div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
                    Симптомы еще не выбраны. Отметьте хотя бы один пункт, и страница сразу станет полезной для первого анализа.
                  </p>
                )
              )}
            </div>
          </StaggerChildren>
        </div>
      </div>
    </PageTransition>
  )
}
