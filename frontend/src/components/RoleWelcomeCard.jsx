import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getRoleLabel } from '../config/roles'

function RoleWelcomeCard({ title, subtitle, accentLabel }) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const roleLabel = user?.roleLabel || getRoleLabel(user?.role)

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <main className="portal-shell">
      <section className="portal-hero">
        <span className="portal-badge">{accentLabel}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </section>

      <section className="portal-card">
        <div className="portal-card__row">
          <span className="portal-card__label">Bienvenue</span>
          <strong>{user?.fullName || user?.email || 'Utilisateur'}</strong>
        </div>
        <div className="portal-card__row">
          <span className="portal-card__label">Role connecte</span>
          <strong>{roleLabel}</strong>
        </div>
        <div className="portal-card__row">
          <span className="portal-card__label">Email</span>
          <strong>{user?.email || '-'}</strong>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
        </button>
      </section>
    </main>
  )
}

export default RoleWelcomeCard
