import axios, { AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios'

interface QueueItem {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let logoutCallback: (() => void) | null = null
export function setLogoutCallback(fn: () => void): void {
  logoutCallback = fn
}

let isRefreshing = false
let failedQueue: QueueItem[] = []

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        logoutCallback?.()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post('/api/v1/auth/refresh', {
          refresh_token: refreshToken,
        })
        const { access_token, refresh_token } = res.data
        localStorage.setItem('token', access_token)
        localStorage.setItem('refreshToken', refresh_token)
        processQueue(null, access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        logoutCallback?.()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
