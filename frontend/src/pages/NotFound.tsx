import { Link } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'

export default function NotFound() {
  return (
    <PageTransition>
      <div className="min-h-[84vh] px-4 py-10 sm:py-14">
        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-xl shadow-gray-200/40 dark:shadow-primary-500/[0.05]">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-12 left-0 h-48 w-48 rounded-full bg-primary-500/[0.08] dark:bg-primary-500/[0.14] blur-3xl" />
              <div className="absolute top-1/3 right-0 h-56 w-56 rounded-full bg-accent-500/[0.08] dark:bg-accent-500/[0.12] blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
                style={{
                  backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                  backgroundSize: '30px 30px',
                }}
              />
            </div>

            <div className="relative grid xl:grid-cols-[1.05fr_0.95fr] gap-6 p-6 sm:p-8">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/70 dark:bg-white/[0.06] border border-primary-200/60 dark:border-primary-500/20 backdrop-blur-sm mb-5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
                  </span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Маршрут не найден</span>
                </div>

                <div className="text-[6.5rem] sm:text-[8rem] font-extrabold leading-none bg-gradient-to-br from-primary-500 to-accent-500 bg-clip-text text-transparent select-none mb-4">
                  404
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                  Похоже, страница ушла не туда
                </h1>
                <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed max-w-xl mb-6">
                  Запрашиваемый адрес не существует, был перемещен или просто введен с ошибкой. Хорошая новость в том, что все основные сценарии можно быстро продолжить отсюда.
                </p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <Link
                    to="/"
                    className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
                  >
                    Вернуться на главную
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776L12 3l8.25 6.776v10.099A1.125 1.125 0 0119.125 21H4.875a1.125 1.125 0 01-1.125-1.125V9.776z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
                    </svg>
                  </Link>
                  <Link
                    to="/dashboard"
                    className="px-6 py-3 rounded-2xl bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2"
                  >
                    В кабинет
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9m-9 6h9m-9 6h9M4.5 6h.008v.008H4.5V6zm0 6h.008v.008H4.5V12zm0 6h.008v.008H4.5V18z" />
                    </svg>
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                    Можно вернуться к анализу
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                    Можно открыть рецепты
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                    Главный маршрут не потерян
                  </span>
                </div>
              </div>

              <AnimateIn variant="blur" className="self-start">
                <StaggerChildren variant="fade-up" stagger={70} className="grid sm:grid-cols-2 gap-4">
                  <Link
                    to="/analysis"
                    className="rounded-[1.6rem] border border-primary-100 dark:border-primary-500/20 bg-gradient-to-br from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.03] dark:to-white/[0.02] p-5 hover:border-primary-200 dark:hover:border-primary-500/30 transition-colors"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300 mb-2">Анализ</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">Вернуться к результатам</div>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Проверить дефициты, текущие показатели и следующий приоритет.</p>
                  </Link>

                  <Link
                    to="/data-entry"
                    className="rounded-[1.6rem] border border-cyan-100 dark:border-cyan-500/20 bg-gradient-to-br from-cyan-50 via-white to-white dark:from-cyan-500/12 dark:via-white/[0.03] dark:to-white/[0.02] p-5 hover:border-cyan-200 dark:hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300 mb-2">Данные</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">Открыть ввод данных</div>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Добавить новые показатели и продолжить сценарий без догадок.</p>
                  </Link>

                  <Link
                    to="/recipes"
                    className="rounded-[1.6rem] border border-emerald-100 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.03] dark:to-white/[0.02] p-5 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300 mb-2">Рацион</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">Перейти к рецептам</div>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Собрать практичный маршрут через блюда, а не искать заново.</p>
                  </Link>

                  <Link
                    to="/products"
                    className="rounded-[1.6rem] border border-rose-100 dark:border-rose-500/20 bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-500/12 dark:via-white/[0.03] dark:to-white/[0.02] p-5 hover:border-rose-200 dark:hover:border-rose-500/30 transition-colors"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300 mb-2">Продукты</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">Открыть поиск продуктов</div>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Быстро вернуться к продуктовому сценарию под нужный витамин.</p>
                  </Link>
                </StaggerChildren>
              </AnimateIn>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
