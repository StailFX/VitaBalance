import { lazy, Suspense, useState, useEffect } from 'react'
import PageTransition from '../components/PageTransition'
import { useInView, useCountUp } from '../hooks/useAnimations'
import { useHasStoredToken } from '../hooks/useHasStoredToken'
import { useMediaQuery } from '../hooks/useMediaQuery'

const HomeHeroVisual = lazy(() => import('../components/home/HomeHeroVisual'))
const HomeSecondarySections = lazy(() => import('../components/home/HomeSecondarySections'))

interface AnimatedStatProps {
  value: number
  suffix?: string
  label: string
  color: string
  enabled: boolean
}

function AnimatedStat({ value, suffix = '', label, color, enabled }: AnimatedStatProps) {
  const count = useCountUp(parseInt(String(value)) || 0, { enabled })
  return (
    <div>
      <div className={`text-2xl sm:text-3xl font-bold ${color}`}>{count}{suffix}</div>
      <div className="mt-0.5 text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-300">{label}</div>
    </div>
  )
}

function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return many
  if (last > 1 && last < 5) return few
  if (last === 1) return one
  return many
}

interface CountsData {
  vitamins: number
  products: number
  recipes: number
}

const HOME_COUNTS: CountsData = {
  vitamins: 20,
  products: 91,
  recipes: 60,
}

interface StatsRowProps {
  counts: CountsData
}

function StatsRow({ counts }: StatsRowProps) {
  const [ref, visible] = useInView()

  const stats = [
    { value: counts.vitamins, suffix: '', label: plural(counts.vitamins, 'Витамин', 'Витамина', 'Витаминов'), color: 'text-primary-600 dark:text-primary-400' },
    { value: counts.recipes, suffix: '+', label: plural(counts.recipes, 'Рецепт', 'Рецепта', 'Рецептов'), color: 'text-cyan-600 dark:text-cyan-400' },
    { value: counts.products, suffix: '+', label: plural(counts.products, 'Продукт', 'Продукта', 'Продуктов'), color: 'text-accent-600 dark:text-accent-400' },
  ]
  return (
    <div ref={ref} className="flex items-center gap-8 sm:gap-10 pt-6 border-t border-gray-200/60 dark:border-white/[0.06]">
      {stats.map((s, i) => (
        <AnimatedStat key={i} {...s} enabled={visible} />
      ))}
    </div>
  )
}

export default function Home() {
  const counts = HOME_COUNTS
  const [shouldLoadSecondary, setShouldLoadSecondary] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const hasStoredToken = useHasStoredToken()


  useEffect(() => {
    if (shouldLoadSecondary) return

    const scheduleIdleWork = (
      windowObject: Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
        cancelIdleCallback?: (handle: number) => void
      }
    ) => {
      if (windowObject.requestIdleCallback) {
        const handle = windowObject.requestIdleCallback(() => {
          setShouldLoadSecondary(true)
        }, { timeout: 1200 })

        return () => {
          windowObject.cancelIdleCallback?.(handle)
        }
      }

      const handle = windowObject.setTimeout(() => {
        setShouldLoadSecondary(true)
      }, 250)

      return () => {
        windowObject.clearTimeout(handle)
      }
    }

    return scheduleIdleWork(window)
  }, [shouldLoadSecondary])

  const secondarySectionsFallback = (
    <section className="content-auto py-12 sm:py-20">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 space-y-4">
        <div className="skeleton h-6 w-32 mx-auto" />
        <div className="skeleton h-10 w-3/4 mx-auto rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="skeleton h-44 rounded-3xl" />
          <div className="skeleton h-44 rounded-3xl" />
          <div className="skeleton h-44 rounded-3xl" />
        </div>
      </div>
    </section>
  )

  return (
    <PageTransition>
      <div>
        {/* ===== HERO ===== */}
        <section className="relative flex items-center py-10 sm:py-14 lg:py-16">
          {/* Background effects — contained within hero */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute inset-x-0 top-0 h-[58%] sm:hidden bg-gradient-to-b from-primary-500/[0.06] via-cyan-500/[0.04] to-transparent dark:from-primary-500/[0.12] dark:via-cyan-400/[0.08]" />
            {isDesktop && (
              <>
                <div className="absolute top-0 left-0 w-[50%] h-[50%] rounded-full bg-primary-500/[0.07] dark:bg-primary-500/[0.12] blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[45%] h-[45%] rounded-full bg-cyan-500/[0.06] dark:bg-cyan-400/[0.10] blur-3xl" />
                <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-accent-500/[0.05] dark:bg-accent-400/[0.08] blur-3xl" />
              </>
            )}
            {/* Dot grid */}
            {isDesktop && (
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '32px 32px'
              }} />
            )}
            {/* Floating dots */}
            {isDesktop && (
              <>
                <div className="absolute top-[15%] right-[8%] w-3 h-3 rounded-full bg-primary-400/30 dark:bg-primary-400/50 animate-float" />
                <div className="absolute top-[25%] left-[12%] w-2 h-2 rounded-full bg-cyan-400/30 dark:bg-cyan-400/50 animate-float-reverse" />
                <div className="absolute bottom-[30%] right-[20%] w-2.5 h-2.5 rounded-full bg-accent-400/30 dark:bg-accent-400/50 animate-float" style={{ animationDelay: '-2s' }} />
              </>
            )}
          </div>

          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 relative z-10 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left column — Text */}
              <div className="max-w-xl lg:max-w-none">
                {/* Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/60 dark:bg-white/[0.06] border border-primary-200/50 dark:border-primary-500/20 backdrop-blur-none sm:backdrop-blur-sm mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Персональный подход к здоровью</span>
                </div>

                {/* Heading */}
                <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight mb-5">
                  <span className="text-gray-900 dark:text-white block">Ваш витаминный</span>
                  <span className="gradient-text block">баланс под</span>
                  <span className="gradient-text block">контролем</span>
                </h1>

                {/* Description */}
                <p className="mb-6 max-w-md text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                  Анализируем ваши данные, находим дефициты витаминов
                  и подбираем персональные рецепты для нормализации баланса.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8">
                  {hasStoredToken ? (
                    <a href="/data-entry" className="btn-primary text-white px-7 py-3.5 rounded-2xl text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2">
                      Ввести данные анализов
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </a>
                  ) : (
                    <>
                      <a href="/register" className="btn-primary text-white px-7 py-3.5 rounded-2xl text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2">
                        Начать бесплатно
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </a>
                      <a href="/vitamins" className="btn-secondary text-gray-700 dark:text-gray-200 px-7 py-3.5 rounded-2xl text-sm sm:text-base font-semibold text-center">
                        Справочник витаминов
                      </a>
                    </>
                  )}
                </div>

                {/* Stats row */}
                <StatsRow counts={counts} />
              </div>

              {/* Right column — Vitamin card grid */}
              {isDesktop && (
                <div className="hidden lg:block">
                  <Suspense
                    fallback={
                      <div className="rounded-[2rem] border border-gray-200 dark:border-white/[0.08] p-6 bg-white/70 dark:bg-white/[0.03]">
                        <div className="skeleton h-6 w-32 mb-4" />
                        <div className="grid grid-cols-4 gap-2">
                          {Array.from({ length: 12 }).map((_, index) => (
                            <div key={index} className="skeleton h-16 rounded-xl" />
                          ))}
                        </div>
                      </div>
                    }
                  >
                    <HomeHeroVisual counts={counts} />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===== DISCLAIMER ===== */}
        <section className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 mb-16 sm:mb-20">
          <div className="bg-amber-50/80 dark:bg-amber-500/[0.06] border border-amber-200/50 dark:border-amber-500/20 rounded-2xl p-5 sm:p-6 flex items-start gap-4 backdrop-blur-none sm:backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200/80 leading-relaxed">
              <strong className="font-semibold">Важно:</strong> Данный сервис не заменяет консультацию врача.
              Рекомендации формируются на основе введённых данных и носят информационный характер.
            </p>
          </div>
        </section>

        {shouldLoadSecondary ? (
          <Suspense fallback={secondarySectionsFallback}>
            <HomeSecondarySections counts={counts} user={hasStoredToken} isDesktop={isDesktop} />
          </Suspense>
        ) : (
          secondarySectionsFallback
        )}

      </div>
    </PageTransition>
  )
}
