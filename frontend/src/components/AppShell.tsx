import { AuthProvider } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import Layout from './Layout'

export default function AppShell() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </ToastProvider>
  )
}
