import { Suspense, lazy, type ReactNode } from 'react'
import { Routes, Route } from 'react-router-dom'

const AppShell = lazy(() => import('./AppShell'))
const PrivateRoute = lazy(() => import('./PrivateRoute'))
const Login = lazy(() => import('../pages/Login'))
const Register = lazy(() => import('../pages/Register'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const DataEntry = lazy(() => import('../pages/DataEntry'))
const AnalysisResults = lazy(() => import('../pages/AnalysisResults'))
const AnalysisHistory = lazy(() => import('../pages/AnalysisHistory'))
const Recipes = lazy(() => import('../pages/Recipes'))
const RecipeDetail = lazy(() => import('../pages/RecipeDetail'))
const Favorites = lazy(() => import('../pages/Favorites'))
const VitaminGuide = lazy(() => import('../pages/VitaminGuide'))
const ProductSearch = lazy(() => import('../pages/ProductSearch'))
const MealPlan = lazy(() => import('../pages/MealPlan'))
const Analytics = lazy(() => import('../pages/Analytics'))
const NotFound = lazy(() => import('../pages/NotFound'))

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

function withRouteSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>
}

function withPrivateRoute(node: ReactNode) {
  return withRouteSuspense(<PrivateRoute>{node}</PrivateRoute>)
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={withRouteSuspense(<AppShell />)}>
        <Route path="login" element={withRouteSuspense(<Login />)} />
        <Route path="register" element={withRouteSuspense(<Register />)} />
        <Route path="vitamins" element={withRouteSuspense(<VitaminGuide />)} />
        <Route path="products" element={withRouteSuspense(<ProductSearch />)} />
        <Route path="dashboard" element={withPrivateRoute(<Dashboard />)} />
        <Route path="data-entry" element={withPrivateRoute(<DataEntry />)} />
        <Route path="analysis" element={withPrivateRoute(<AnalysisResults />)} />
        <Route path="analysis/history" element={withPrivateRoute(<AnalysisHistory />)} />
        <Route path="recipes" element={withPrivateRoute(<Recipes />)} />
        <Route path="recipes/:id" element={withPrivateRoute(<RecipeDetail />)} />
        <Route path="favorites" element={withPrivateRoute(<Favorites />)} />
        <Route path="meal-plan" element={withPrivateRoute(<MealPlan />)} />
        <Route path="analytics" element={withPrivateRoute(<Analytics />)} />
        <Route path="*" element={withRouteSuspense(<NotFound />)} />
      </Route>
    </Routes>
  )
}
