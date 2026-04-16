import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, useLocation } from 'react-router-dom'

const AppRoutes = lazy(() => import('./AppRoutes'))
const PublicLayout = lazy(() => import('./PublicLayout'))
const Home = lazy(() => import('../pages/Home'))

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

function RoutedAppContent() {
  const location = useLocation()

  if (location.pathname === '/') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <PublicLayout>
          <Home />
        </PublicLayout>
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <AppRoutes />
    </Suspense>
  )
}

export default function RoutedApp() {
  return (
    <Router>
      <RoutedAppContent />
    </Router>
  )
}
