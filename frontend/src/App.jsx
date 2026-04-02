import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DataEntry from './pages/DataEntry'
import AnalysisResults from './pages/AnalysisResults'
import AnalysisHistory from './pages/AnalysisHistory'
import Recipes from './pages/Recipes'
import RecipeDetail from './pages/RecipeDetail'
import Favorites from './pages/Favorites'
import VitaminGuide from './pages/VitaminGuide'
import ProductSearch from './pages/ProductSearch'
import MealPlan from './pages/MealPlan'
import NotFound from './pages/NotFound'
import PrivateRoute from './components/PrivateRoute'

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="vitamins" element={<VitaminGuide />} />
                <Route path="products" element={<ProductSearch />} />
                <Route path="dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="data-entry" element={<PrivateRoute><DataEntry /></PrivateRoute>} />
                <Route path="analysis" element={<PrivateRoute><AnalysisResults /></PrivateRoute>} />
                <Route path="analysis/history" element={<PrivateRoute><AnalysisHistory /></PrivateRoute>} />
                <Route path="recipes" element={<PrivateRoute><Recipes /></PrivateRoute>} />
                <Route path="recipes/:id" element={<PrivateRoute><RecipeDetail /></PrivateRoute>} />
                <Route path="favorites" element={<PrivateRoute><Favorites /></PrivateRoute>} />
                <Route path="meal-plan" element={<PrivateRoute><MealPlan /></PrivateRoute>} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            </ErrorBoundary>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
