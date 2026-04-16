import { Suspense, lazy } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import PublicLayout from './components/PublicLayout'
import Home from './pages/Home'

const RoutedApp = lazy(() => import('./components/RoutedApp'))

function RouteFallback() {
  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-14">
      <div className="space-y-4">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-28 w-full rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="skeleton h-36 w-full rounded-3xl" />
          <div className="skeleton h-36 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  )
}

function App() {
  const isHomeEntry = typeof window === 'undefined' || window.location.pathname === '/'

  return (
    <ThemeProvider>
      <ErrorBoundary>
        {isHomeEntry ? (
          <PublicLayout>
            <Home />
          </PublicLayout>
        ) : (
          <Suspense fallback={<RouteFallback />}>
            <RoutedApp />
          </Suspense>
        )}
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
