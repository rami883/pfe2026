import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { roleHomePaths } from '../config/roles'
import FullScreenStatus from './FullScreenStatus'

function ProtectedRoute({ allowedRole }) {
  const { authReady, user } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return (
      <FullScreenStatus
        title="Verification de la session"
        message="Chargement securise de votre espace..."
      />
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={roleHomePaths[user.role] || '/login'} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
