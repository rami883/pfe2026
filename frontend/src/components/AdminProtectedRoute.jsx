import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { isAdminRole, normalizeRole, roleHomePaths } from '../config/roles'
import FullScreenStatus from './FullScreenStatus'

function AdminProtectedRoute() {
  const { authReady, user } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return (
      <FullScreenStatus
        title="Verification de la session"
        message="Controle des droits administrateur..."
      />
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAdminRole(user.role)) {
    return <Navigate to={roleHomePaths[normalizeRole(user.role)] || '/login'} replace />
  }

  return <Outlet />
}

export default AdminProtectedRoute
