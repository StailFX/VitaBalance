import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { setLogoutCallback } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/profile/me')
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

  const login = async (email, password) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    const res = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    localStorage.setItem('token', res.data.access_token)
    localStorage.setItem('refreshToken', res.data.refresh_token)
    const profile = await api.get('/profile/me')
    setUser(profile.data)
  }

  const register = async (email, password) => {
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
