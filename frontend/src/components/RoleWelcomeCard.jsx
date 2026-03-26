import { useState } from 'react'
import { LogOut, Mail, ShieldCheck, UserCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getRoleLabel } from '../config/roles'

function RoleWelcomeCard({ title, subtitle, accentLabel, accentIcon }) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const roleLabel = user?.roleLabel || getRoleLabel(user?.role)
  const AccentIcon = accentIcon

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
        <span className="portal-badge">
          {AccentIcon ? <AccentIcon size={16} aria-hidden="true" /> : null}
          {accentLabel}
        </span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </section>

      <section className="portal-card">
        <div className="portal-card__row">
          <span className="portal-card__label portal-card__label--with-icon">
            <UserCircle2 size={15} aria-hidden="true" />
            Bienvenue
          </span>
          <strong>{user?.fullName || user?.email || 'Utilisateur'}</strong>
        </div>
        <div className="portal-card__row">
          <span className="portal-card__label portal-card__label--with-icon">
            <ShieldCheck size={15} aria-hidden="true" />
            Role connecte
          </span>
          <strong>{roleLabel}</strong>
        </div>
        <div className="portal-card__row">
          <span className="portal-card__label portal-card__label--with-icon">
            <Mail size={15} aria-hidden="true" />
            Email
          </span>
          <strong>{user?.email || '-'}</strong>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <span className="button-content">
            <LogOut size={16} aria-hidden="true" />
            {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
          </span>
        </button>
      </section>
    </main>
  )
}

export default RoleWelcomeCard
