import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import api from '../api/client'
import { setLogoutCallback } from '../api/client'
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
    if (token) {
      api.get<UserOut>('/profile/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
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
    await api.post('/auth/register', { email, password })
    await login(email, password)
  }

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  useEffect(() => {
    setLogoutCallback(logout)
  }, [logout])

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
