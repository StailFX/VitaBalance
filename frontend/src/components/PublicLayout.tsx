import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useHasStoredToken } from '../hooks/useHasStoredToken'

const LayoutFooter = lazy(() => import('./LayoutFooter'))

interface PublicNavLinkProps {
  href: string
  children: ReactNode
}

function PublicNavLink({ href, children }: PublicNavLinkProps) {
  return (
    <a
      href={href}
      className="relative px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
    >
      {children}
    </a>
  )
}

interface PublicLayoutProps {
  children?: ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { dark, toggle } = useTheme()
  const hasStoredToken = useHasStoredToken()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showFooter, setShowFooter] = useState(false)

  useEffect(() => {
    if (showFooter || typeof window === 'undefined') {
      return
    }

    const windowObject = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (windowObject.requestIdleCallback) {
      const handle = windowObject.requestIdleCallback(() => {
        setShowFooter(true)
      }, { timeout: 1200 })

      return () => {
        windowObject.cancelIdleCallback?.(handle)
      }
    }

    const handle = windowObject.setTimeout(() => {
      setShowFooter(true)
    }, 250)

    return () => {
      windowObject.clearTimeout(handle)
    }
  }, [showFooter])

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-[#0d1117] mesh-bg">
      <header className="sticky top-0 z-50 glass border-b border-gray-200 dark:border-gray-700/50 shadow-sm">
        <nav className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-md">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold gradient-text">VitaBalance</span>
          </a>

          <div className="hidden md:flex items-center gap-1">
            <PublicNavLink href="/vitamins">Справочник</PublicNavLink>
            <PublicNavLink href="/products">Продукты</PublicNavLink>
            <div className="mx-2 h-6 w-px bg-gray-200 dark:bg-gray-700" />
            {hasStoredToken ? (
              <>
                <a
                  href="/data-entry"
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors px-3 py-2"
                >
                  Ввод данных
                </a>
                <a
                  href="/dashboard"
                  className="btn-primary rounded-xl px-5 py-2 text-sm font-medium text-white"
                >
                  Кабинет
                </a>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className="px-3 py-2 text-sm text-gray-600 transition-colors hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
                >
                  Вход
                </a>
                <a
                  href="/register"
                  className="btn-primary rounded-xl px-5 py-2 text-sm font-medium text-white"
                >
                  Регистрация
                </a>
              </>
            )}
            <button
              onClick={toggle}
              className="ml-2 flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Переключить тему"
            >
              {dark ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
          </div>

          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={toggle}
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Переключить тему"
            >
              {dark ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
            <button
              className="p-2 text-gray-600 dark:text-gray-300"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Меню навигации"
              aria-expanded={mobileOpen}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700/50 bg-white/90 dark:bg-[#0d1117]/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">
              <a href="/vitamins" className="rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/[0.04]">
                Справочник витаминов
              </a>
              <a href="/products" className="rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/[0.04]">
                Продукты
              </a>
              {hasStoredToken ? (
                <>
                  <a href="/data-entry" className="rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/[0.04]">
                    Ввод данных
                  </a>
                  <a href="/dashboard" className="btn-primary mt-1 rounded-xl px-4 py-3 text-center text-sm font-semibold text-white">
                    Открыть кабинет
                  </a>
                </>
              ) : (
                <>
                  <a href="/login" className="rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/[0.04]">
                    Вход
                  </a>
                  <a href="/register" className="btn-primary mt-1 rounded-xl px-4 py-3 text-center text-sm font-semibold text-white">
                    Регистрация
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      {showFooter ? (
        <Suspense fallback={<div className="content-auto py-10" />}>
          <LayoutFooter />
        </Suspense>
      ) : (
        <div className="content-auto py-10" />
      )}
    </div>
  )
}
