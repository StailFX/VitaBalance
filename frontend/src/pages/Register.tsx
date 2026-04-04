import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageTransition from '../components/PageTransition'
import AnimateIn, { StaggerChildren } from '../components/AnimateIn'

interface PasswordStrength {
  level: number
  label: string
  color: string
  textColor: string
}

interface SummaryCard {
  label: string
  value: string
  description: string
  accent: string
  surface: string
  border: string
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 0, label: 'Слабый', color: 'bg-red-500', textColor: 'text-red-500' }
  if (score <= 2) return { level: 1, label: 'Средний', color: 'bg-yellow-500', textColor: 'text-yellow-500' }
  return { level: 2, label: 'Сильный', color: 'bg-green-500', textColor: 'text-green-500' }
}

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
)

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPassword2, setShowPassword2] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const strength = useMemo(() => getPasswordStrength(password), [password])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (password !== password2) {
      setError('Пароли не совпадают')
      return
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }

    setLoading(true)
    try {
      await register(email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } }
      setError(axiosError.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  const summaryCards: SummaryCard[] = [
    {
      label: 'Старт',
      value: '1 шаг',
      description: 'После регистрации вы сразу попадаете в личный кабинет и можете перейти к заполнению профиля.',
      accent: 'text-primary-600 dark:text-primary-300',
      surface: 'from-primary-50 via-white to-white dark:from-primary-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-primary-100 dark:border-primary-500/20',
    },
    {
      label: 'Фокус',
      value: 'Без шума',
      description: 'Экран регистрации не должен перегружать: только понятный вход в продукт и быстрый старт.',
      accent: 'text-cyan-600 dark:text-cyan-300',
      surface: 'from-cyan-50 via-white to-white dark:from-cyan-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-cyan-100 dark:border-cyan-500/20',
    },
    {
      label: 'Путь',
      value: 'От данных к выводам',
      description: 'После создания аккаунта можно сразу перейти к профилю, анализу, продуктам и рецептам.',
      accent: 'text-emerald-600 dark:text-emerald-300',
      surface: 'from-emerald-50 via-white to-white dark:from-emerald-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-emerald-100 dark:border-emerald-500/20',
    },
    {
      label: 'Безопасность',
      value: 'Надежнее',
      description: 'Сила пароля подсказывается сразу, чтобы вход в продукт был устойчивым с самого начала.',
      accent: 'text-rose-600 dark:text-rose-300',
      surface: 'from-rose-50 via-white to-white dark:from-rose-500/12 dark:via-white/[0.04] dark:to-white/[0.02]',
      border: 'border-rose-100 dark:border-rose-500/20',
    },
  ]

  return (
    <PageTransition>
      <div className="min-h-[84vh] px-4 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-xl shadow-gray-200/40 dark:shadow-primary-500/[0.05]">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-12 left-0 h-48 w-48 rounded-full bg-accent-500/[0.08] dark:bg-accent-500/[0.14] blur-3xl" />
              <div className="absolute top-1/3 right-0 h-56 w-56 rounded-full bg-primary-500/[0.08] dark:bg-primary-500/[0.12] blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
                style={{
                  backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
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
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Создание аккаунта</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                  Создайте аккаунт и сразу перейдите к реальным действиям
                </h1>
                <p className="text-base sm:text-lg text-gray-500 dark:text-gray-300 leading-relaxed max-w-xl mb-6">
                  Регистрация здесь нужна не ради формы как таковой, а чтобы быстро открыть персональный путь: профиль, анализ, продукты, рецепты и план питания в одном сценарии.
                </p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <Link
                    to="/login"
                    className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
                  >
                    Уже есть аккаунт
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                  <Link
                    to="/"
                    className="px-6 py-3 rounded-2xl bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2"
                  >
                    На главную
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776L12 3l8.25 6.776v10.099A1.125 1.125 0 0119.125 21H4.875a1.125 1.125 0 01-1.125-1.125V9.776z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
                    </svg>
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                    Быстрый старт без лишних экранов
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                    Сразу доступ к кабинету
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300">
                    Подсказка по силе пароля
                  </span>
                </div>

                <StaggerChildren variant="fade-up" stagger={70} className="grid grid-cols-2 gap-3 self-start mt-8">
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

              <AnimateIn variant="blur" className="bg-white/90 dark:bg-white/[0.03] rounded-[1.9rem] border border-gray-200 dark:border-white/[0.08] shadow-sm p-6 sm:p-7 self-start">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Создать аккаунт</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-300">После регистрации можно сразу перейти к заполнению профиля и первому анализу.</p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-6 text-sm flex items-center gap-3 border border-red-100 dark:border-red-800/40">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Пароль</label>
                      <span className="text-xs text-gray-400">Минимум 6 символов</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Придумайте пароль"
                        className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>

                    {password.length > 0 && (
                      <div className="mt-3">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map((index) => (
                            <div
                              key={index}
                              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                                index <= strength.level ? strength.color : 'bg-gray-200 dark:bg-white/[0.1]'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs mt-1 font-medium ${strength.textColor}`}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Повторите пароль</label>
                    <div className="relative">
                      <input
                        type={showPassword2 ? 'text' : 'password'}
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                        required
                        placeholder="Повторите пароль"
                        className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword2(!showPassword2)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        {showPassword2 ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary text-white py-3 rounded-2xl font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Регистрация...' : 'Создать аккаунт'}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/[0.06]">
                  <p className="text-center text-sm text-gray-500 dark:text-gray-300">
                    Уже есть аккаунт?{' '}
                    <Link to="/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
                      Войти
                    </Link>
                  </p>
                </div>
              </AnimateIn>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
