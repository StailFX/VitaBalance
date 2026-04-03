import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../context/AuthContext'

// Mock the API client
vi.mock('../api/client', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return {
    default: mockApi,
    setLogoutCallback: vi.fn(),
  }
})

import api from '../api/client'

function TestComponent() {
  const { user, login, logout, loading } = useAuth()
  return (
    <div>
      {loading && <span data-testid="loading">Loading...</span>}
      {user ? (
        <>
          <span data-testid="email">{user.email}</span>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <span data-testid="no-user">Not logged in</span>
          <button onClick={() => login('test@test.com', 'Pass123')}>Login</button>
        </>
      )}
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows not logged in when no token exists', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('no-user')).toBeInTheDocument()
    })
  })

  it('loads user profile when token exists', async () => {
    localStorage.setItem('token', 'existing-token')
    api.get.mockResolvedValueOnce({ data: { id: 1, email: 'user@test.com' } })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('user@test.com')
    })
  })

  it('clears token when profile fetch fails', async () => {
    localStorage.setItem('token', 'bad-token')
    api.get.mockRejectedValueOnce(new Error('Unauthorized'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('no-user')).toBeInTheDocument()
    })
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('stores tokens on login', async () => {
    api.post.mockResolvedValueOnce({
      data: { access_token: 'new-access', refresh_token: 'new-refresh' },
    })
    api.get.mockResolvedValueOnce({
      data: { id: 1, email: 'test@test.com' },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('no-user')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('test@test.com')
    })
    expect(localStorage.getItem('token')).toBe('new-access')
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh')
  })

  it('clears all state on logout', async () => {
    localStorage.setItem('token', 'test-token')
    api.get.mockResolvedValueOnce({ data: { id: 1, email: 'user@test.com' } })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('email')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Logout'))

    expect(screen.getByTestId('no-user')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })
})
