import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { UserOut } from '../types'

interface AuthContextValue {
  user: UserOut | null
  setUser: React.Dispatch<React.SetStateAction<UserOut | null>>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false

    import('../api/client')
      .then(({ default: api }) => api.get<UserOut>('/profile/me'))
      .then((res) => {
        if (!cancelled) {
          setUser(res.data)
        }
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    const { default: api } = await import('../api/client')
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    const res = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    localStorage.setItem('token', res.data.access_token)
    localStorage.setItem('refreshToken', res.data.refresh_token)
    const profile = await api.get<UserOut>('/profile/me')
    setUser(profile.data)
  }

  const register = async (email: string, password: string): Promise<void> => {
    const { default: api } = await import('../api/client')
    await api.post('/auth/register', { email, password })
    await login(email, password)
  }

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    let cancelled = false

    import('../api/client').then(({ setLogoutCallback }) => {
      if (!cancelled) {
        setLogoutCallback(logout)
      }
    })

    return () => {
      cancelled = true
    }
  }, [logout, user])

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
