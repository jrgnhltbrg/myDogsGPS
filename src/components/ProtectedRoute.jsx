import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, requireAdmin = false }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <p>Laddar...</p>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <p>Laddar...</p>
  if (profile.status !== 'approved') return <Navigate to="/pending" replace />
  if (requireAdmin && profile.role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}
