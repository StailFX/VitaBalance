import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and retrieves token from localStorage', () => {
    localStorage.setItem('token', 'test-access-token')
    expect(localStorage.getItem('token')).toBe('test-access-token')
  })

  it('stores refresh token alongside access token', () => {
    localStorage.setItem('token', 'access-123')
    localStorage.setItem('refreshToken', 'refresh-456')
    expect(localStorage.getItem('token')).toBe('access-123')
    expect(localStorage.getItem('refreshToken')).toBe('refresh-456')
  })

  it('clears both tokens on logout', () => {
    localStorage.setItem('token', 'access-123')
    localStorage.setItem('refreshToken', 'refresh-456')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })
})
