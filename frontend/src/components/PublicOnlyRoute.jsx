import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { normalizeRole, roleHomePaths } from '../config/roles'
import FullScreenStatus from './FullScreenStatus'

function PublicOnlyRoute({ children }) {
  const { authReady, user } = useAuth()

  if (!authReady) {
    return (
      <FullScreenStatus
        title="Initialisation"
        message="Preparation de votre experience de connexion..."
      />
    )
  }

  if (user) {
    return <Navigate to={roleHomePaths[normalizeRole(user.role)] || '/login'} replace />
  }

  return children
}

export default PublicOnlyRoute
