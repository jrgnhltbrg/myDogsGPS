import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Admin } from './pages/Admin'
import { Dashboard } from './pages/Dashboard'
import { DogOverview } from './pages/DogOverview'
import { Login } from './pages/Login'
import { Pending } from './pages/Pending'
import { Register } from './pages/Register'

const DogSearch = lazy(() => import('./pages/DogSearch').then((module) => ({ default: module.DogSearch })))

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pending" element={<Pending />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/personregister"
        element={
          <ProtectedRoute requireAdmin>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dogs/:dogId"
        element={
          <ProtectedRoute>
            <DogOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dogs/:dogId/search"
        element={
          <ProtectedRoute>
            <Suspense fallback={<p>Laddar sökkartan...</p>}>
              <DogSearch />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="/admin" element={<Navigate to="/personregister" replace />} />
    </Routes>
  )
}

export default App
