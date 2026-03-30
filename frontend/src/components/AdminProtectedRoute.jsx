import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { isAdminRole, normalizeRole, roleHomePaths } from '../config/roles'
import FullScreenStatus from './FullScreenStatus'

function AdminProtectedRoute() {
  const { authReady, user } = useAuth()
  const location = useLocation()
  
  console.log('AdminProtectedRoute: user=', user, 'authReady=', authReady)

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

  // Check if user has admin role
  if (!isAdminRole(user.role)) {
    console.log('User is not admin, role:', user.role)
    const redirectPath = roleHomePaths[normalizeRole(user.role)] || '/login'
    return <Navigate to={redirectPath} replace />
  }

  console.log('Admin access granted for user:', user.username)
  return <Outlet />
}

export default AdminProtectedRoute