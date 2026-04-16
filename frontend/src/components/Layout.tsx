import { lazy, Suspense, useState, useEffect, useRef, type ReactNode } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const LayoutFooter = lazy(() => import('./LayoutFooter'))

interface NavLinkProps {
  to: string
  children: ReactNode
}

function NavLink({ to, children }: NavLinkProps) {
  const location = useLocation()
  const active = location.pathname === to
  return (
    <Link
      to={to}
      className={`relative px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary-500 rounded-full" />
      )}
    </Link>
  )
}

export default function Layout() {
  const { user, logout, loading } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : null
  const hasStoredToken = typeof window !== 'undefined' && Boolean(window.localStorage.getItem('token'))
  const authPending = loading && hasStoredToken

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-[#0d1117] mesh-bg">
      {/* Navbar */}
      <header className="sticky top-0 z-50 glass border-b border-gray-200 dark:border-gray-700/50 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold gradient-text">VitaBalance</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/vitamins">Справочник</NavLink>
            <NavLink to="/products">Продукты</NavLink>
            {user ? (
              <>
                <NavLink to="/data-entry">Ввод данных</NavLink>
                <NavLink to="/analysis">Анализ</NavLink>
                <NavLink to="/analytics">Аналитика</NavLink>
                <NavLink to="/recipes">Рецепты</NavLink>
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen) }}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white text-sm font-bold flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                    aria-label="Меню пользователя"
                  >
                    {userInitial || (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    )}
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700/50 p-2 z-50">
                      <Link
                        to="/meal-plan"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-200"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        План питания
                      </Link>
                      <Link
                        to="/favorites"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-200"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                        Избранное
                      </Link>
                      <Link
                        to="/analytics"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-200"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        Аналитика
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-200"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        Кабинет
                      </Link>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700/50" />
                      <button
                        onClick={() => { setDropdownOpen(false); handleLogout() }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-red-500 w-full"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        Выйти
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : authPending ? (
              <>
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
                <div className="flex items-center gap-1">
                  <div className="h-9 w-[6.5rem] rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                  <div className="h-9 w-[5.5rem] rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                  <div className="h-9 w-[6rem] rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                  <div className="h-9 w-[5rem] rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                </div>
              </>
            ) : (
              <>
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
                <Link to="/login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors px-3 py-2">
                  Вход
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-white px-5 py-2 rounded-xl text-sm font-medium"
                >
                  Регистрация
                </Link>
              </>
            )}
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="ml-2 w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Переключить тему"
            >
              {dark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile burger + theme toggle */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={toggle}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              aria-label="Переключить тему"
            >
              {dark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Меню навигации" aria-expanded={mobileOpen}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden glass border-t border-white/30 dark:border-gray-700/50 px-4 pb-4 space-y-2">
            <Link to="/vitamins" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileOpen(false)}>Справочник</Link>
            <Link to="/products" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileOpen(false)}>Продукты</Link>
            {user ? (
              <>
                <div className="flex items-center gap-3 py-3 mb-1 border-b border-gray-100 dark:border-gray-700/50">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {userInitial || (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{user.email || 'Пользователь'}</span>
                </div>
                <Link to="/data-entry" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileOpen(false)}>Ввод данных</Link>
                <Link to="/analysis" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileOpen(false)}>Анализ</Link>
                <Link to="/analytics" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileOpen(false)}>Аналитика</Link>
                <Link to="/recipes" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileOpen(false)}>Рецепты</Link>
                <Link to="/meal-plan" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileOpen(false)}>План питания</Link>
                <Link to="/favorites" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileOpen(false)}>Избранное</Link>
                <Link to="/dashboard" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileOpen(false)}>Кабинет</Link>
                <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="block py-2 text-red-500">Выйти</button>
              </>
            ) : authPending ? (
              <>
                <div className="h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                <div className="h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
              </>
            ) : (
              <>
                <Link to="/login" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileOpen(false)}>Вход</Link>
                <Link to="/register" className="block py-2 text-primary-600 dark:text-primary-400 font-medium" onClick={() => setMobileOpen(false)}>Регистрация</Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Suspense fallback={<div className="content-auto py-10" />}>
        <LayoutFooter />
      </Suspense>
    </div>
  )
}
