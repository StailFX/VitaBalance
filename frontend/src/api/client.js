import axios from 'axios'

let logoutCallback = null
export function setLogoutCallback(fn) { logoutCallback = fn }

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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      logoutCallback?.()
    }
    return Promise.reject(error)
  }
)

export default api
