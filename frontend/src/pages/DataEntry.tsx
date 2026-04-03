import { useState, useEffect, useMemo, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { useToast } from '../context/ToastContext'
import { getVitaminIcon } from '../utils/vitaminIcons'
import type { Vitamin, SymptomMapping, UserProfile } from '../types'

interface GroupedSymptom {
  text: string
  ids: number[]
}

export default function DataEntry() {
  const [mode, setMode] = useState<'lab' | 'symptoms'>('lab')
  const [vitamins, setVitamins] = useState<Vitamin[]>([])
  const [labValues, setLabValues] = useState<Record<number, string>>({})
  const [symptoms, setSymptoms] = useState<SymptomMapping[]>([])
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [symptomSearch, setSymptomSearch] = useState('')
  const navigate = useNavigate()
  const { addToast } = useToast()

  useEffect(() => {
    Promise.all([
      api.get('/vitamins/'),
      api.get('/vitamins/symptoms'),
      api.get('/profile/me').catch(() => ({ data: null })),
    ]).then(([vitRes, sympRes, profRes]) => {
      setVitamins(vitRes.data)
      setSymptoms(sympRes.data)
      setProfile(profRes.data)
      setLoading(false)
    })
  }, [])

  const handleLabSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const entries = Object.entries(labValues)
        .filter(([, val]) => val !== '')
        .map(([vitamin_id, value]) => ({
          vitamin_id: Number(vitamin_id),
          value: Number(value),
          source: 'lab',
        }))
      await api.post('/vitamins/entries', entries)
      addToast('Данные успешно сохранены', 'success')
      navigate('/analysis')
    } catch {
      addToast('Ошибка сохранения данных', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSymptomSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/vitamins/entries/symptoms', { symptom_ids: Array.from(selectedSymptoms) })
      addToast('Данные успешно сохранены', 'success')
      navigate('/analysis')
    } catch {
      addToast('Ошибка сохранения данных', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Group symptoms by symptom_text to avoid duplicates in UI
  const groupedSymptoms = useMemo<GroupedSymptom[]>(() => {
    const map = new Map<string, GroupedSymptom>()
    for (const s of symptoms) {
      const existing = map.get(s.symptom_text)
      if (existing) {
        existing.ids.push(s.id)
      } else {
        map.set(s.symptom_text, { text: s.symptom_text, ids: [s.id] })
      }
    }
    return Array.from(map.values())
  }, [symptoms])

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

  // Progress calculation for lab mode
  const filledCount = Object.values(labValues).filter((v) => v !== '' && Number(v) > 0).length
  const totalCount = vitamins.length
  const progressPercent = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0

  // Helper to get normal range text for a vitamin
  const getNormRange = (v: Vitamin & { norm_min?: number; norm_max?: number }): string | null => {
    const gender = profile?.gender
    let min: number | undefined | null, max: number | undefined | null
    if (gender === 'female' || gender === 'F') {
      min = v.norm_female_min ?? v.norm_min
      max = v.norm_female_max ?? v.norm_max
    } else if (gender === 'male' || gender === 'M') {
      min = v.norm_male_min ?? v.norm_min
      max = v.norm_male_max ?? v.norm_max
    } else {
      // Default: prefer male norms or general norms
      min = v.norm_male_min ?? v.norm_min
      max = v.norm_male_max ?? v.norm_max
    }
    if (min != null && max != null) {
      return `Норма: ${min}\u2013${max} ${v.unit || ''}`
    }
    if (min != null) return `Норма: от ${min} ${v.unit || ''}`
    if (max != null) return `Норма: до ${max} ${v.unit || ''}`
    return null
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary-100 dark:border-primary-800 border-t-primary-500 animate-spin"></div>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Ввод данных
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Введите ваши данные</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-2">Результаты лабораторных анализов или анкета симптомов</p>
        </div>

        {/* Mode toggle */}
        <div className="bg-gray-100 dark:bg-white/[0.03] rounded-2xl p-1.5 inline-flex gap-1 mb-8">
          <button
            onClick={() => setMode('lab')}
            className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${
              mode === 'lab'
                ? 'bg-white dark:bg-white/[0.06] text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
              Результаты анализов
            </span>
          </button>
          <button
            onClick={() => setMode('symptoms')}
            className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${
              mode === 'symptoms'
                ? 'bg-white dark:bg-white/[0.06] text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Анкета самочувствия
            </span>
          </button>
        </div>

        {mode === 'lab' ? (
          <form onSubmit={handleLabSubmit} className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Лабораторные данные</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Укажите значения из результатов анализов. Оставьте поле пустым, если данных нет.</p>
                </div>
              </div>
              {/* Progress indicator */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Заполнено {filledCount} из {totalCount}
                  </span>
                  <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{progressPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/60 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {vitamins.map((v) => {
                  const icon = getVitaminIcon(v.code)
                  const normText = getNormRange(v)
                  return (
                  <div key={v.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${icon.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-lg">{icon.emoji}</span>
                    </div>
                    <div className="w-44 flex-shrink-0">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">{v.name}</label>
                      {normText && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-0.5">{normText}</span>
                      )}
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        step="any"
                        placeholder="Введите значение"
                        value={labValues[v.id] || ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setLabValues({ ...labValues, [v.id]: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-24 text-right font-medium">{v.unit}</span>
                  </div>
                  )
                })}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/[0.06]">
                <button type="submit" disabled={submitting} className="btn-primary text-white px-10 py-3 rounded-2xl font-semibold inline-flex items-center gap-2 disabled:opacity-50">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  {submitting ? 'Сохраняю...' : 'Получить анализ'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSymptomSubmit} className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Анкета симптомов</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Отметьте симптомы, которые вы наблюдаете у себя</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Symptom search */}
              <div className="relative mb-4">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={symptomSearch}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSymptomSearch(e.target.value)}
                  placeholder="Поиск симптомов..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                />
                {symptomSearch && (
                  <button
                    type="button"
                    onClick={() => setSymptomSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 dark:bg-white/[0.1] flex items-center justify-center text-gray-500 hover:bg-gray-300 dark:hover:bg-white/[0.15] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {groupedSymptoms.filter((g) => {
                  if (!symptomSearch.trim()) return true
                  const q = symptomSearch.toLowerCase()
                  return g.text.toLowerCase().includes(q)
                }).map((g) => {
                  const isSelected = g.ids.every((id) => selectedSymptoms.has(id))
                  return (
                  <label
                    key={g.text}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                        : 'border-gray-100 dark:border-white/[0.06] hover:border-gray-200 dark:hover:border-white/[0.1] hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300 dark:border-white/[0.1]'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSymptom(g.ids)} className="hidden" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{g.text}</span>
                  </label>
                  )
                })}
              </div>
              {selectedSymptoms.size > 0 && (
                <div className="mt-4 text-sm text-primary-600 dark:text-primary-400 font-medium">
                  Выбрано симптомов: {groupedSymptoms.filter((g) => g.ids.every((id) => selectedSymptoms.has(id))).length}
                </div>
              )}
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/[0.06]">
                <button type="submit" disabled={submitting} className="btn-primary text-white px-10 py-3 rounded-2xl font-semibold inline-flex items-center gap-2 disabled:opacity-50">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  {submitting ? 'Сохраняю...' : 'Получить анализ'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </PageTransition>
  )
}
