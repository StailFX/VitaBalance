import { useEffect, useState } from 'react'

export function useHasStoredToken(): boolean {
  const [hasToken, setHasToken] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return Boolean(window.localStorage.getItem('token'))
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const updateTokenState = () => {
      setHasToken(Boolean(window.localStorage.getItem('token')))
    }

    updateTokenState()
    window.addEventListener('storage', updateTokenState)

    return () => {
      window.removeEventListener('storage', updateTokenState)
    }
  }, [])

  return hasToken
}
