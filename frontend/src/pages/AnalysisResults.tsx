import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { TableSkeleton } from '../components/Skeleton'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { getVitaminIcon } from '../utils/vitaminIcons'
import { getChartColors } from '../utils/chartColors'
import { VitaminAnalysisItem } from '../types'

const MIN_BAR_WIDTH_PERCENT = 3
const MAX_VISUAL_PERCENT = 150
const TARGET_PERCENT = 100

interface StatusConfig {
  bg: string
  text: string
  border: string
  label: string
  dot: string
  color: string
}

interface BarDataPoint {
  shortName: string
  fullName: string
  percent: number
  visualPercent: number
  actualValue: number
  norm_min: number
  norm_max: number
  status: string
  unit: string
}

interface SummaryCardConfig {
  label: string
  value: number
  surface: string
  valueColor: string
  labelColor: string
}

function getPercentOfNorm(value: number, normMax: number): number {
  if (normMax <= 0) return 0
  return Math.round((value / normMax) * 100)
}

function getVisualPercent(percent: number): number {
  return Math.max(MIN_BAR_WIDTH_PERCENT, Math.min(percent, MAX_VISUAL_PERCENT))
}

function getShortVitaminName(name: string): string {
  const cleaned = name
    .replace(/^Витамин\s+/i, '')
    .replace(/\s*\([^)]*\)\s*/g, '')
    .trim()

  if (cleaned.length <= 12) {
    return cleaned
  }

  return `${cleaned.slice(0, 11)}…`
}

function getVitaminInstrumentalName(item: VitaminAnalysisItem): string {
  const specialForms: Record<string, string> = {
    IRON: 'железом',
    CALCIUM: 'кальцием',
    MAGNESIUM: 'магнием',
    ZINC: 'цинком',
    SELENIUM: 'селеном',
    PHOSPHORUS: 'фосфором',
    POTASSIUM: 'калием',
    OMEGA3: 'омега-3',
  }

  if (specialForms[item.vitamin_code]) {
    return specialForms[item.vitamin_code]
  }

  if (item.vitamin_name.startsWith('Витамин ')) {
    return `витамином ${item.vitamin_name.replace(/^Витамин\s+/i, '').trim()}`
  }

  return item.vitamin_name.toLowerCase()
}

function AnalysisBarTooltip({
  active,
  payload,
  statusConfigMap,
}: {
  active?: boolean
  payload?: Array<{ payload: BarDataPoint }>
  statusConfigMap: Record<string, StatusConfig>
}) {
  if (!active || !payload?.length) {
    return null
  }

  const data = payload[0]?.payload
  if (!data) {
    return null
  }

  const config = statusConfigMap[data.status] ?? statusConfigMap.no_data

  return (
    <div
      className="rounded-2xl border px-3 py-3 shadow-xl backdrop-blur-sm"
      style={{
        maxWidth: 'min(260px, calc(100vw - 48px))',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: 'rgba(229, 231, 235, 0.9)',
      }}
    >
      <div className="mb-1.5 text-sm font-semibold text-gray-900 break-words">
        {data.fullName}
      </div>
      <div className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </div>
      <div className="mt-2 space-y-1.5 text-xs text-gray-600">
        <div className="flex items-start justify-between gap-3">
          <span>% от верхней границы нормы</span>
          <span className="shrink-0 font-semibold text-gray-900">{data.percent}%</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span>Фактическое значение</span>
          <span className="shrink-0 font-semibold text-gray-900">{data.actualValue} {data.unit}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span>Нормальный диапазон</span>
          <span className="shrink-0 font-semibold text-gray-900">{data.norm_min}-{data.norm_max} {data.unit}</span>
        </div>
      </div>
    </div>
  )
}

export default function AnalysisResults() {
  const [analysis, setAnalysis] = useState<VitaminAnalysisItem[] | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)
  const [chartType, setChartType] = useState<'overview' | 'bar'>('overview')
  const [exporting, setExporting] = useState<boolean>(false)
  const { addToast } = useToast()
  const { dark } = useTheme()
  const isMobile = useMediaQuery('(max-width: 640px)')

  useEffect(() => {
    api.get('/vitamins/analysis').then((res) => {
      setAnalysis(res.data)
      setLoading(false)

      const criticalDef = res.data.filter((a: VitaminAnalysisItem) => a.status === 'deficiency' && a.severity >= 30)
      const excess = res.data.filter((a: VitaminAnalysisItem) => a.status === 'excess' && a.severity >= 20)
      if (criticalDef.length > 0) {
        const names = criticalDef.slice(0, 3).map((a: VitaminAnalysisItem) => a.vitamin_name).join(', ')
        addToast(`Критический дефицит: ${names}. Рекомендуем скорректировать рацион.`, 'error')
      } else if (excess.length > 0) {
        const names = excess.slice(0, 3).map((a: VitaminAnalysisItem) => a.vitamin_name).join(', ')
        addToast(`Повышенный уровень: ${names}. Проконсультируйтесь с врачом.`, 'info')
      } else if (res.data.every((a: VitaminAnalysisItem) => a.status === 'normal' || a.status === 'no_data') && res.data.some((a: VitaminAnalysisItem) => a.status === 'normal')) {
        addToast('Все витамины в норме!', 'success')
      }
    }).catch(() => {
      setError(true)
      setLoading(false)
    })
  }, [])

  const handleExportPDF = async () => {
    if (exporting || !analysis) return
    setExporting(true)

    try {
      const response = await api.get('/vitamins/analysis/export-pdf', {
        responseType: 'blob',
        headers: {
          Accept: 'application/pdf',
        },
      })
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/pdf' })
      const pdfFile = new File([blob], 'vitamin-analysis.pdf', { type: 'application/pdf' })

      if (
        typeof navigator !== 'undefined' &&
        'canShare' in navigator &&
        'share' in navigator &&
        navigator.canShare?.({ files: [pdfFile] })
      ) {
        await navigator.share({
          title: 'Vita Balance',
          text: 'Экспорт анализа витаминов',
          files: [pdfFile],
        })
        addToast('PDF подготовлен', 'success')
        return
      }

      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = pdfFile.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)

      addToast('PDF отправлен на скачивание', 'success')
    } catch {
      addToast('Ошибка при экспорте PDF', 'error')
    } finally {
      setExporting(false)
    }
  }

  const chartColors = useMemo(() => getChartColors(dark), [dark])

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <TableSkeleton />
        </div>
      </PageTransition>
    )
  }

  if (error || !analysis || analysis.length === 0) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Данных пока нет</h1>
          <p className="text-gray-500 dark:text-gray-300 mb-8">Сначала введите результаты анализов или заполните анкету симптомов</p>
          <Link to="/data-entry" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
            Ввести данные
          </Link>
        </div>
      </PageTransition>
    )
  }

  const getStatusConfig = (status: string): StatusConfig => {
    switch (status) {
      case 'deficiency': return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800', label: 'Дефицит', dot: 'bg-red-500', color: '#ef4444' }
      case 'excess': return { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', label: 'Избыток', dot: 'bg-amber-500', color: '#f59e0b' }
      case 'normal': return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', label: 'Норма', dot: 'bg-emerald-500', color: '#10b981' }
      default: return { bg: 'bg-gray-50 dark:bg-white/[0.03]', text: 'text-gray-400', border: 'border-gray-200 dark:border-white/[0.06]', label: 'Нет данных', dot: 'bg-gray-300 dark:bg-gray-600', color: '#d1d5db' }
    }
  }

  const defCount = analysis.filter(a => a.status === 'deficiency').length
  const normalCount = analysis.filter(a => a.status === 'normal').length
  const excessCount = analysis.filter(a => a.status === 'excess').length
  const noDataCount = analysis.filter(a => a.status === 'no_data').length

  const summaryCards: SummaryCardConfig[] = [
    {
      label: 'Дефицитов',
      value: defCount,
      surface: 'bg-red-100 border-red-300 dark:bg-red-950/70 dark:border-red-800',
      valueColor: 'text-red-950 dark:text-red-50',
      labelColor: 'text-red-700 dark:text-red-200',
    },
    {
      label: 'В норме',
      value: normalCount,
      surface: 'bg-emerald-100 border-emerald-300 dark:bg-emerald-950/70 dark:border-emerald-800',
      valueColor: 'text-emerald-950 dark:text-emerald-50',
      labelColor: 'text-emerald-700 dark:text-emerald-200',
    },
    {
      label: 'Избыток',
      value: excessCount,
      surface: 'bg-amber-100 border-amber-300 dark:bg-amber-950/70 dark:border-amber-800',
      valueColor: 'text-amber-950 dark:text-amber-50',
      labelColor: 'text-amber-700 dark:text-amber-200',
    },
    {
      label: 'Нет данных',
      value: noDataCount,
      surface: 'bg-slate-100 border-slate-300 dark:bg-slate-900 dark:border-slate-700',
      valueColor: 'text-slate-900 dark:text-slate-50',
      labelColor: 'text-slate-600 dark:text-slate-300',
    },
  ]

  const analyzedItems = analysis.filter((item) => item.value !== null)

  const barData: BarDataPoint[] = analyzedItems.map((item) => {
    const percent = getPercentOfNorm(item.value as number, item.norm_max)

    return {
      shortName: getShortVitaminName(item.vitamin_name),
      fullName: item.vitamin_name,
      percent,
      visualPercent: getVisualPercent(percent),
      actualValue: item.value as number,
      norm_min: item.norm_min,
      norm_max: item.norm_max,
      status: item.status,
      unit: item.unit,
    }
  })

  const averageCoverage = analyzedItems.length > 0
    ? Math.round(
        analyzedItems.reduce((sum, item) => sum + getPercentOfNorm(item.value as number, item.norm_max), 0) / analyzedItems.length
      )
    : 0

  const strongestDeficiency = analysis
    .filter((item) => item.status === 'deficiency')
    .sort((a, b) => b.severity - a.severity)[0] ?? null

  const strongestExcess = analysis
    .filter((item) => item.status === 'excess')
    .sort((a, b) => b.severity - a.severity)[0] ?? null

  const overviewItems = [...analyzedItems]
    .map((item) => ({
      ...item,
      percent: getPercentOfNorm(item.value as number, item.norm_max),
      visualPercent: getVisualPercent(getPercentOfNorm(item.value as number, item.norm_max)),
    }))
    .sort((a, b) => Math.abs(b.percent - TARGET_PERCENT) - Math.abs(a.percent - TARGET_PERCENT))
    .slice(0, 5)

  const statusConfigMap: Record<string, StatusConfig> = {
    deficiency: getStatusConfig('deficiency'),
    excess: getStatusConfig('excess'),
    normal: getStatusConfig('normal'),
    no_data: getStatusConfig('no_data'),
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="section-eyebrow inline-block px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold uppercase tracking-wider mb-4">
              Ваш анализ
            </span>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Результаты витаминного анализа</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/analysis/history"
              className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/[0.03] text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/[0.06] transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              История
            </Link>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className={`px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors flex items-center gap-2 ${exporting ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {exporting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
              {exporting ? 'Экспорт...' : 'Экспорт PDF'}
            </button>
          </div>
        </div>

        <div data-analysis-report="true">
          {/* Summary cards */}
          <StaggerChildren variant="fade-up" stagger={80} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {summaryCards.map((card) => (
              <div key={card.label} className={`rounded-2xl p-5 border shadow-sm ${card.surface}`}>
                <div className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</div>
                <div className={`text-sm mt-1 font-medium ${card.labelColor}`}>{card.label}</div>
              </div>
            ))}
          </StaggerChildren>

          {/* Priority Deficiencies */}
          {(() => {
            const topDeficiencies = analysis
              .filter(a => a.status === 'deficiency' && a.severity > 0)
              .sort((a, b) => b.severity - a.severity)
              .slice(0, 3)
            if (topDeficiencies.length === 0) return null
            return (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Приоритетные дефициты</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topDeficiencies.map((item) => {
                    const icon = getVitaminIcon(item.vitamin_code)
                    return (
                      <div key={item.vitamin_id} className="bg-white dark:bg-white/[0.03] rounded-2xl border border-red-100 dark:border-red-800/40 p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${icon.gradient} flex items-center justify-center text-lg`}>
                            {icon.emoji}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{item.vitamin_name}</h3>
                            <span className="text-xs font-semibold text-red-500 dark:text-red-400">Дефицит {item.severity}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          Увеличьте потребление продуктов с {getVitaminInstrumentalName(item)}.
                        </p>
                        <Link
                          to={`/products?vitamin=${item.vitamin_id}`}
                          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                        >
                          Подобрать продукты
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Charts */}
          <AnimateIn variant="blur" className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 mb-8">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Визуализация</h2>
              <div className="flex w-full gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/[0.06] sm:inline-flex sm:w-auto">
                <button
                  onClick={() => setChartType('overview')}
                  className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-medium transition-all sm:flex-none ${chartType === 'overview' ? 'bg-white dark:bg-white/[0.08] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-300'}`}
                >
                  Обзор
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-medium transition-all sm:flex-none ${chartType === 'bar' ? 'bg-white dark:bg-white/[0.08] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-300'}`}
                >
                  Столбцы
                </button>
              </div>
            </div>
            {chartType === 'overview' ? (
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 dark:border-primary-900/60 dark:bg-primary-950/30">
                    <div className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">Покрытие нормы</div>
                    <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{averageCoverage}%</div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Средний процент от верхней границы нормы по введенным значениям</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/30">
                    <div className="text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-300">С данными</div>
                    <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{analyzedItems.length}</div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Показателей участвуют в расчете и визуализации</p>
                  </div>
                  <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                    <div className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">Главный дефицит</div>
                    <div className="mt-2 text-base font-semibold text-gray-900 dark:text-white break-words">
                      {strongestDeficiency ? strongestDeficiency.vitamin_name : 'Не выявлен'}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {strongestDeficiency ? `Отклонение: ${strongestDeficiency.severity}%` : 'Сильных дефицитов по текущим данным нет'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">Главный избыток</div>
                    <div className="mt-2 text-base font-semibold text-gray-900 dark:text-white break-words">
                      {strongestExcess ? strongestExcess.vitamin_name : 'Не выявлен'}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {strongestExcess ? `Отклонение: ${strongestExcess.severity}%` : 'Выраженного избытка по текущим данным нет'}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ключевые отклонения</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">100% означает верхнюю границу нормы</p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm dark:bg-white/[0.06] dark:text-gray-300">
                      Шкала 0–150%
                    </div>
                  </div>

                  {overviewItems.length > 0 ? (
                    <div className="space-y-3">
                      {overviewItems.map((item) => {
                        const config = getStatusConfig(item.status)

                        return (
                          <div key={item.vitamin_id} className="rounded-2xl border border-gray-200/80 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white break-words">{item.vitamin_name}</div>
                                <div className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${config.bg} ${config.text} ${config.border}`}>
                                  {config.label}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{item.percent}%</div>
                                <div className="text-[11px] text-gray-500 dark:text-gray-400">от нормы</div>
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="relative h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                                <div
                                  className={`h-full rounded-full ${
                                    item.status === 'deficiency' ? 'bg-red-400' :
                                    item.status === 'excess' ? 'bg-amber-400' :
                                    'bg-emerald-400'
                                  }`}
                                  style={{ width: `${(item.visualPercent / MAX_VISUAL_PERCENT) * 100}%` }}
                                />
                                <div
                                  className="absolute inset-y-[-2px] w-[2px] rounded-full bg-gray-400/70 dark:bg-gray-300/60"
                                  style={{ left: `${(TARGET_PERCENT / MAX_VISUAL_PERCENT) * 100}%` }}
                                />
                              </div>
                              <div className="mt-2 flex flex-col items-start gap-1 text-[11px] text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <span className="break-words">факт: {item.value} {item.unit}</span>
                                <span className="break-words">норма: {item.norm_min}-{item.norm_max} {item.unit}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/70 text-center text-sm text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                      Для визуального обзора нужно хотя бы одно введённое значение.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-[320px] sm:h-80">
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      accessibilityLayer={!isMobile}
                      data={barData}
                      layout="vertical"
                      margin={{
                        top: 8,
                        right: isMobile ? 8 : 18,
                        left: isMobile ? 0 : 8,
                        bottom: 8,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: chartColors.axis }}
                        stroke={chartColors.axisLine}
                        domain={[0, MAX_VISUAL_PERCENT]}
                        tickCount={6}
                        unit="%"
                      />
                      <YAxis
                        type="category"
                        dataKey="shortName"
                        tick={{ fontSize: 11, fill: chartColors.axis }}
                        stroke={chartColors.axisLine}
                        width={isMobile ? 68 : 112}
                      />
                      <Tooltip
                        cursor={{ fill: dark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.06)' }}
                        wrapperStyle={{ outline: 'none', zIndex: 20 }}
                        content={<AnalysisBarTooltip statusConfigMap={statusConfigMap} />}
                      />
                      <Bar dataKey="visualPercent" radius={[0, 8, 8, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={index} fill={getStatusConfig(entry.status).color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 text-center text-sm text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-400">
                    Нет данных для столбчатой диаграммы. Сначала введите хотя бы одно значение.
                  </div>
                )}
              </div>
            )}
          </AnimateIn>

          {/* Vitamin cards */}
          <div className="space-y-3 mb-8">
            {analysis.map((item, idx) => {
              const config = getStatusConfig(item.status)
              const percentage = item.value !== null && item.norm_max > 0
                ? getVisualPercent(getPercentOfNorm(item.value as number, item.norm_max))
                : 0
              return (
                <div key={item.vitamin_id} className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 card-hover stagger-item" style={{ animationDelay: `${idx * 60}ms` }}>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${config.dot}`}></div>
                      <h3 className="font-semibold text-gray-900 dark:text-white break-words">{item.vitamin_name}</h3>
                    </div>
                    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${config.bg} ${config.text} ${config.border}`}>
                      {config.label} {item.severity > 0 ? `(${item.severity}%)` : ''}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full animate-bar-fill ${
                            item.status === 'deficiency' ? 'bg-red-400' :
                            item.status === 'excess' ? 'bg-amber-400' :
                            item.status === 'normal' ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                          style={{ width: `${Math.max(percentage, MIN_BAR_WIDTH_PERCENT)}%`, animationDelay: `${idx * 60 + 300}ms`, animationFillMode: 'both' }}
                        />
                      </div>
                    </div>
                    <div className="w-full text-left sm:min-w-[120px] sm:w-auto sm:text-right">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.value !== null ? item.value : '—'}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                      <div className="text-[10px] text-gray-400">
                        норма: {item.norm_min}–{item.norm_max}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {defCount > 0 && (
            <Link
              to="/recipes"
              className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-white sm:w-auto sm:px-8"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Рекомендованные рецепты
            </Link>
          )}
          {defCount > 0 && (
            <Link
              to="/meal-plan"
              className="btn-secondary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-gray-700 dark:text-gray-200 sm:w-auto sm:px-8"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              План питания
            </Link>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
