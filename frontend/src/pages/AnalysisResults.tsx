import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import api from '../api/client'
import PageTransition from '../components/PageTransition'
import { TableSkeleton } from '../components/Skeleton'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import { getVitaminIcon } from '../utils/vitaminIcons'
import { getChartColors } from '../utils/chartColors'
import type { VitaminAnalysisItem } from '../types'

const RADAR_CHART_MAX = 150
const MIN_BAR_WIDTH_PERCENT = 3

interface StatusConfig {
  bg: string
  text: string
  border: string
  label: string
  dot: string
  color: string
  soft: string
}

interface RadarDataPoint {
  vitamin: string
  value: number
  fullMark: number
}

interface BarDataPoint {
  name: string
  value: number | null
  norm_min: number
  norm_max: number
  status: string
}

function getStatusDescription(item: VitaminAnalysisItem): string {
  if (item.status === 'deficiency') {
    return item.severity >= 30
      ? 'Показатель заметно ниже нормы. Это хороший кандидат для первоочередной коррекции питания.'
      : 'Показатель чуть ниже нормы. Стоит добавить в рацион более релевантные продукты.'
  }
  if (item.status === 'excess') {
    return 'Показатель выше рекомендуемого диапазона. Полезно пересмотреть рацион и добавки.'
  }
  if (item.status === 'normal') {
    return 'Показатель находится в ожидаемом диапазоне. Текущий режим выглядит устойчиво.'
  }
  return 'Для этого витамина пока нет данных. Его можно добавить при следующем вводе анализов.'
}

export default function AnalysisResults() {
  const [analysis, setAnalysis] = useState<VitaminAnalysisItem[] | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)
  const [chartType, setChartType] = useState<'radar' | 'bar'>('radar')
  const [exporting, setExporting] = useState<boolean>(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()
  const { dark } = useTheme()

  useEffect(() => {
    api.get('/vitamins/analysis').then((res) => {
      const data: VitaminAnalysisItem[] = res.data
      setAnalysis(data)
      setLoading(false)

      const criticalDef = data.filter((item) => item.status === 'deficiency' && item.severity >= 30)
      const excess = data.filter((item) => item.status === 'excess' && item.severity >= 20)
      if (criticalDef.length > 0) {
        const names = criticalDef.slice(0, 3).map((item) => item.vitamin_name).join(', ')
        addToast(`Критический дефицит: ${names}. Рекомендуем скорректировать рацион.`, 'error')
      } else if (excess.length > 0) {
        const names = excess.slice(0, 3).map((item) => item.vitamin_name).join(', ')
        addToast(`Повышенный уровень: ${names}. Проконсультируйтесь с врачом.`, 'info')
      } else if (data.every((item) => item.status === 'normal' || item.status === 'no_data') && data.some((item) => item.status === 'normal')) {
        addToast('Все витамины в норме!', 'success')
      }
    }).catch(() => {
      setError(true)
      setLoading(false)
    })
  }, [addToast])

  const handleExportPDF = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      const el = reportRef.current
      if (!el) return
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: dark ? '#0d1117' : '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save('vitamin-analysis.pdf')
      addToast('PDF успешно экспортирован', 'success')
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
        <div className="max-w-6xl mx-auto px-4 py-8">
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
          <p className="text-gray-500 dark:text-gray-300 mb-8">Сначала введите результаты анализов или заполните анкету симптомов.</p>
          <Link to="/data-entry" className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-block">
            Ввести данные
          </Link>
        </div>
      </PageTransition>
    )
  }

  const getStatusConfig = (status: string): StatusConfig => {
    switch (status) {
      case 'deficiency':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          text: 'text-red-600 dark:text-red-300',
          border: 'border-red-200 dark:border-red-800/60',
          label: 'Дефицит',
          dot: 'bg-red-500',
          color: '#ef4444',
          soft: 'from-red-50 via-white to-white dark:from-red-500/10 dark:via-white/[0.03] dark:to-white/[0.02]',
        }
      case 'excess':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          text: 'text-amber-600 dark:text-amber-300',
          border: 'border-amber-200 dark:border-amber-800/60',
          label: 'Избыток',
          dot: 'bg-amber-500',
          color: '#f59e0b',
          soft: 'from-amber-50 via-white to-white dark:from-amber-500/10 dark:via-white/[0.03] dark:to-white/[0.02]',
        }
      case 'normal':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          text: 'text-emerald-600 dark:text-emerald-300',
          border: 'border-emerald-200 dark:border-emerald-800/60',
          label: 'Норма',
          dot: 'bg-emerald-500',
          color: '#10b981',
          soft: 'from-emerald-50 via-white to-white dark:from-emerald-500/10 dark:via-white/[0.03] dark:to-white/[0.02]',
        }
      default:
        return {
          bg: 'bg-gray-50 dark:bg-white/[0.03]',
          text: 'text-gray-500 dark:text-gray-300',
          border: 'border-gray-200 dark:border-white/[0.08]',
          label: 'Нет данных',
          dot: 'bg-gray-300 dark:bg-gray-600',
          color: '#9ca3af',
          soft: 'from-gray-50 via-white to-white dark:from-white/[0.04] dark:via-white/[0.03] dark:to-white/[0.02]',
        }
    }
  }

  const defCount = analysis.filter((item) => item.status === 'deficiency').length
  const normalCount = analysis.filter((item) => item.status === 'normal').length
  const excessCount = analysis.filter((item) => item.status === 'excess').length
  const noDataCount = analysis.filter((item) => item.status === 'no_data').length
  const topDeficiencies = analysis
    .filter((item) => item.status === 'deficiency' && item.severity > 0)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3)
  const topExcess = analysis
    .filter((item) => item.status === 'excess' && item.severity > 0)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 2)

  const heroTitle = defCount > 0
    ? 'Есть витамины, которым сейчас нужна поддержка'
    : excessCount > 0
      ? 'Баланс в целом хороший, но есть показатели выше нормы'
      : 'Ваш витаминный профиль выглядит устойчиво'
  const heroText = defCount > 0
    ? 'Сначала обратите внимание на самые выраженные дефициты, а затем проверьте, какие продукты и рецепты помогут закрыть эти зоны.'
    : excessCount > 0
      ? 'Основная часть профиля выглядит спокойно, но несколько показателей стоит пересмотреть с точки зрения рациона и добавок.'
      : 'Большинство показателей находятся в комфортном диапазоне. Можно поддерживать текущий режим и периодически обновлять анализ.'
  const focusNote = topDeficiencies[0]
    ? `Главный фокус сейчас — ${topDeficiencies[0].vitamin_name}: отклонение ${topDeficiencies[0].severity}%.`
    : topExcess[0]
      ? `Самый заметный избыток сейчас — ${topExcess[0].vitamin_name}: превышение ${topExcess[0].severity}%.`
      : 'Выраженных рисков не видно: можно использовать страницу как спокойную контрольную сводку.'

  const radarData: RadarDataPoint[] = analysis.filter((item) => item.value !== null).map((item) => ({
    vitamin: item.vitamin_name.replace('Витамин ', '').replace('(', '\n('),
    value: item.norm_max > 0 ? Math.round(((item.value as number) / item.norm_max) * 100) : 0,
    fullMark: RADAR_CHART_MAX,
  }))

  const barData: BarDataPoint[] = analysis.filter((item) => item.value !== null).map((item) => ({
    name: item.vitamin_name.replace('Витамин ', '').split(' ')[0],
    value: item.value,
    norm_min: item.norm_min,
    norm_max: item.norm_max,
    status: item.status,
  }))

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div ref={reportRef} className="space-y-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-xl shadow-gray-200/40 dark:shadow-primary-500/[0.05]">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-8 left-0 h-44 w-44 rounded-full bg-primary-500/[0.08] dark:bg-primary-500/[0.14] blur-3xl" />
              <div className="absolute top-1/3 right-0 h-52 w-52 rounded-full bg-accent-500/[0.08] dark:bg-accent-500/[0.12] blur-3xl" />
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
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Ваш анализ</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                  {heroTitle}
                </h1>
                <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed mb-6 max-w-xl">
                  {heroText}
                </p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <Link
                    to="/analysis/history"
                    className="px-5 py-3 rounded-2xl bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2"
                  >
                    История анализа
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </Link>
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className={`btn-primary text-white px-5 py-3 rounded-2xl font-semibold inline-flex items-center gap-2 ${exporting ? 'opacity-60 cursor-not-allowed' : ''}`}
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

                <div className="flex flex-wrap gap-2.5">
                  <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                    Всего показателей: {analysis.length}
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                    Данных нет: {noDataCount}
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                    {focusNote}
                  </span>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-gray-200/80 dark:border-white/[0.08] bg-white/85 dark:bg-white/[0.04] backdrop-blur-sm p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">Сводка</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ключевые цифры</h2>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                </div>

                <StaggerChildren variant="fade-up" stagger={70} className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-[1.35rem] border border-rose-100 dark:border-rose-500/20 bg-rose-50/80 dark:bg-rose-500/10 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300 mb-2">Дефициты</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{defCount}</div>
                  </div>
                  <div className="rounded-[1.35rem] border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-500/10 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300 mb-2">В норме</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{normalCount}</div>
                  </div>
                  <div className="rounded-[1.35rem] border border-amber-100 dark:border-amber-500/20 bg-amber-50/80 dark:bg-amber-500/10 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300 mb-2">Избыток</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{excessCount}</div>
                  </div>
                  <div className="rounded-[1.35rem] border border-gray-200 dark:border-white/[0.08] bg-gray-50/80 dark:bg-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">Нет данных</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{noDataCount}</div>
                  </div>
                </StaggerChildren>

                <div className={`rounded-[1.5rem] border p-4 ${defCount > 0 ? 'border-rose-100 dark:border-rose-500/20 bg-rose-50/80 dark:bg-rose-500/10' : excessCount > 0 ? 'border-amber-100 dark:border-amber-500/20 bg-amber-50/80 dark:bg-amber-500/10' : 'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-500/10'}`}>
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">Фокус страницы</div>
                  <div className="text-base font-semibold text-gray-900 dark:text-white mb-1">{focusNote}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    {defCount > 0
                      ? 'Сначала разберите дефициты, а затем переходите к рецептам и подбору продуктов.'
                      : excessCount > 0
                        ? 'Здесь важно не только закрывать дефициты, но и не усиливать уже повышенные показатели.'
                        : 'Можно использовать анализ как контрольную точку и поддерживать текущий режим питания.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {topDeficiencies.length > 0 ? (
            <AnimateIn variant="fade-up" className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-rose-500 dark:text-rose-300 font-semibold mb-2">
                    Приоритет
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Самые важные дефициты</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    Эти позиции дают самый заметный вклад в общую картину и заслуживают внимания в первую очередь.
                  </p>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                {topDeficiencies.map((item) => {
                  const icon = getVitaminIcon(item.vitamin_code)
                  return (
                    <div key={item.vitamin_id} className="relative overflow-hidden rounded-[1.75rem] border border-rose-100 dark:border-rose-500/20 bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-500/12 dark:via-white/[0.03] dark:to-white/[0.02] p-5">
                      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-rose-200/40 dark:bg-rose-500/10 blur-2xl" />
                      <div className="relative flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${icon.gradient} flex items-center justify-center text-xl text-white shadow-lg`}>
                          {icon.emoji}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{item.vitamin_name}</h3>
                          <span className="text-xs font-semibold text-rose-500 dark:text-rose-300">Отклонение {item.severity}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed mb-4">
                        {getStatusDescription(item)}
                      </p>
                      <Link
                        to={`/products?vitamin_id=${item.vitamin_id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-300 hover:underline"
                      >
                        Подобрать продукты
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </AnimateIn>
          ) : (
            <AnimateIn variant="fade-up" className={`rounded-[2rem] border p-6 sm:p-7 ${excessCount > 0 ? 'border-amber-100 dark:border-amber-500/20 bg-amber-50/80 dark:bg-amber-500/10' : 'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-500/10'}`}>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {excessCount > 0 ? 'Заметных дефицитов нет, но есть избыток' : 'Картина выглядит ровной'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {excessCount > 0
                  ? `Наибольшее внимание сейчас стоит уделить ${topExcess.map((item) => item.vitamin_name).join(', ')}.`
                  : 'Это хороший момент, чтобы сохранить текущий режим и использовать историю для контроля динамики во времени.'}
              </p>
            </AnimateIn>
          )}

          <AnimateIn variant="blur" className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
              <div>
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                  Визуализация
                </span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Общая форма профиля</h2>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  Радар лучше показывает общую картину, а столбцы помогают точнее сравнивать значения с нормой.
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-white/[0.06] rounded-2xl p-1 inline-flex gap-1">
                <button
                  onClick={() => setChartType('radar')}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${chartType === 'radar' ? 'bg-white dark:bg-white/[0.08] text-primary-600 dark:text-primary-300 shadow-sm' : 'text-gray-500 dark:text-gray-300'}`}
                >
                  Радар
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${chartType === 'bar' ? 'bg-white dark:bg-white/[0.08] text-primary-600 dark:text-primary-300 shadow-sm' : 'text-gray-500 dark:text-gray-300'}`}
                >
                  Столбцы
                </button>
              </div>
            </div>

            <div className="h-96">
              {chartType === 'radar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={chartColors.grid} />
                    <PolarAngleAxis dataKey="vitamin" tick={{ fontSize: 11, fill: chartColors.axis }} />
                    <PolarRadiusAxis angle={30} domain={[0, RADAR_CHART_MAX]} tick={{ fontSize: 10, fill: chartColors.axis }} />
                    <Radar name="Ваш уровень (%)" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: chartColors.axis }} stroke={chartColors.axisLine} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: chartColors.axis }} stroke={chartColors.axisLine} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius: '14px',
                        boxShadow: '0 10px 25px -15px rgb(0 0 0 / 0.35)',
                        color: chartColors.tooltipText,
                      }}
                      labelStyle={{ color: chartColors.tooltipText }}
                      itemStyle={{ color: chartColors.tooltipText }}
                      formatter={(value: number, _name: string, props: { payload: BarDataPoint }) => [
                        `${value} (норма: ${props.payload.norm_min}–${props.payload.norm_max})`,
                        'Значение',
                      ]}
                    />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={getStatusConfig(entry.status).color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </AnimateIn>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
              <div>
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-2">
                  Детализация
                </span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Разбор по каждому показателю</h2>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  Здесь проще всего увидеть статус, диапазон нормы и текущий приоритет для каждого витамина и минерала.
                </p>
              </div>
            </div>

            <div className="grid xl:grid-cols-2 gap-4">
              {analysis.map((item, idx) => {
                const config = getStatusConfig(item.status)
                const icon = getVitaminIcon(item.vitamin_code)
                const percentage = item.value !== null && item.norm_max > 0
                  ? Math.min(((item.value as number) / item.norm_max) * 100, 100)
                  : 0
                const progressWidth = item.value !== null ? Math.max(percentage, MIN_BAR_WIDTH_PERCENT) : 0

                return (
                  <div
                    key={item.vitamin_id}
                    className={`group relative overflow-hidden rounded-[1.75rem] border ${config.border} bg-gradient-to-br ${config.soft} p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
                    style={{ animationDelay: `${idx * 45}ms` }}
                  >
                    <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: config.color }} />
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/40 dark:bg-white/[0.04] blur-2xl" />

                    <div className="relative flex gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${icon.gradient} flex items-center justify-center text-xl text-white shadow-lg flex-shrink-0`}>
                        {icon.emoji}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`}></span>
                              <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-semibold">
                                {item.vitamin_code}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg leading-snug">{item.vitamin_name}</h3>
                          </div>

                          <div className="text-right min-w-[108px]">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
                              {config.label}
                              {item.severity > 0 ? ` ${item.severity}%` : ''}
                            </span>
                            <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                              {item.value !== null ? item.value : '—'} <span className="text-xs font-normal text-gray-400">{item.unit}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed mb-4">
                          {getStatusDescription(item)}
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Текущее значение</span>
                            <span>Норма: {item.norm_min}–{item.norm_max} {item.unit}</span>
                          </div>
                          <div className="h-2.5 bg-white/80 dark:bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${progressWidth}%`,
                                backgroundColor: config.color,
                              }}
                            />
                          </div>
                        </div>

                        {item.status === 'deficiency' && (
                          <div className="mt-4">
                            <Link
                              to={`/products?vitamin_id=${item.vitamin_id}`}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-300 hover:underline"
                            >
                              Подобрать продукты для коррекции
                              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                              </svg>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="flex flex-wrap gap-3 mt-8">
          {defCount > 0 && (
            <Link
              to="/recipes"
              className="btn-primary text-white px-8 py-3.5 rounded-2xl font-semibold inline-flex items-center gap-2"
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
              className="px-8 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/[0.08] font-semibold inline-flex items-center gap-2 hover:bg-white dark:hover:bg-white/[0.08] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              План питания
            </Link>
          )}

          {noDataCount > 0 && (
            <Link
              to="/data-entry"
              className="px-8 py-3.5 rounded-2xl bg-white dark:bg-white/[0.05] text-primary-600 dark:text-primary-300 border border-primary-200 dark:border-primary-500/20 font-semibold inline-flex items-center gap-2 hover:bg-primary-50 dark:hover:bg-primary-500/[0.08] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Добавить недостающие данные
            </Link>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
