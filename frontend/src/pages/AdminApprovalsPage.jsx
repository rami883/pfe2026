import {
  CheckCircle2,
  ClipboardList,
  Mail,
  ShieldCheck,
  UserRound,
  UserRoundX,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  approvePendingUserRequest,
  getPendingUsersRequest,
  rejectPendingUserRequest,
} from '../api/authApi'
import { useAuth } from '../auth/useAuth'
import { getRoleLabel } from '../config/roles'

function AdminApprovalsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [pendingUsers, setPendingUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [busyActionByUserId, setBusyActionByUserId] = useState({})

  useEffect(() => {
    let isMounted = true

    async function loadPendingUsers() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await getPendingUsersRequest()
        if (isMounted) {
          setPendingUsers(response.users)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.message ||
              'Impossible de charger les demandes en attente pour le moment.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadPendingUsers()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  async function handleApprovalAction(userId, action) {
    setBusyActionByUserId((current) => ({
      ...current,
      [userId]: true,
    }))
    setErrorMessage('')

    try {
      if (action === 'approve') {
        await approvePendingUserRequest(userId)
      } else {
        await rejectPendingUserRequest(userId)
      }

      setPendingUsers((current) => current.filter((user) => user._id !== userId))
    } catch (error) {
      setErrorMessage(
        error.message || "L'operation a echoue. Veuillez reessayer.",
      )
    } finally {
      setBusyActionByUserId((current) => ({
        ...current,
        [userId]: false,
      }))
    }
  }

  return (
    <main className="portal-shell">
      <section className="portal-hero">
        <span className="portal-badge">
          <ClipboardList size={16} aria-hidden="true" />
          Administration
        </span>
        <h1>Validation des nouveaux comptes</h1>
        <p>
          Acceptez ou rejetez les nouvelles inscriptions des directeurs et
          gestionnaires avant leur premier acces.
        </p>
      </section>

      <section className="portal-card approval-card">
        <div className="approval-header">
          <strong>{pendingUsers.length} demande(s) en attente</strong>
          <button
            type="button"
            className="ghost-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
          </button>
        </div>

        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <p className="field-hint">Chargement des demandes en attente...</p>
        ) : null}

        {!isLoading && pendingUsers.length === 0 ? (
          <p className="field-hint">
            Aucune demande en attente pour le moment.
          </p>
        ) : null}

        {!isLoading && pendingUsers.length > 0 ? (
          <div className="approval-list">
            {pendingUsers.map((user) => {
              const isBusy = Boolean(busyActionByUserId[user._id])

              return (
                <article key={user._id} className="approval-item">
                  <div className="approval-item__details">
                    <p className="approval-item__line">
                      <UserRound size={15} aria-hidden="true" />
                      <strong>{user.username}</strong>
                    </p>
                    <p className="approval-item__line">
                      <Mail size={15} aria-hidden="true" />
                      <span>{user.email}</span>
                    </p>
                    <p className="approval-item__line">
                      <ShieldCheck size={15} aria-hidden="true" />
                      <span>{getRoleLabel(user.role)}</span>
                    </p>
                  </div>
                  <div className="approval-item__actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={isBusy}
                      onClick={() => handleApprovalAction(user._id, 'approve')}
                    >
                      <span className="button-content">
                        <CheckCircle2 size={16} aria-hidden="true" />
                        Accepter
                      </span>
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={isBusy}
                      onClick={() => handleApprovalAction(user._id, 'reject')}
                    >
                      <span className="button-content">
                        <UserRoundX size={16} aria-hidden="true" />
                        Rejeter
                      </span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default AdminApprovalsPage
