import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Trash2,
  Mail,
  ShieldCheck,
  UserRound,
  UserRoundX,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  approvePendingUserRequest,
  deleteUserRequest,
  getUsersRequest,
  getPendingUsersRequest,
  rejectPendingUserRequest,
} from '../api/authApi'
import { useAuth } from '../auth/useAuth'
import { getRoleLabel } from '../config/roles'

function AdministrationComptesPage() {
  const navigate = useNavigate()
  const { logout, user: currentUser } = useAuth()
  const [pendingUsers, setPendingUsers] = useState([])
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [busyActionByUserId, setBusyActionByUserId] = useState({})
  const currentUserId = String(currentUser?._id || currentUser?.id || '')

  function formatDate(value) {
    if (!value) {
      return '-'
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return '-'
    }

    return parsed.toLocaleString()
  }

  useEffect(() => {
    let isMounted = true

    async function loadAdminData() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [pendingResponse, usersResponse] = await Promise.all([
          getPendingUsersRequest(),
          getUsersRequest(),
        ])

        if (isMounted) {
          setPendingUsers(pendingResponse.users)
          setUsers(usersResponse.users)
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

    loadAdminData()

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
      setUsers((current) =>
        current.map((item) =>
          item._id === userId
            ? {
                ...item,
                isApproved: action === 'approve',
                isRejected: action !== 'approve',
              }
            : item,
        ),
      )
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

  async function handleDeleteUser(userItem) {
    const userId = String(userItem?._id || '')
    const username = userItem?.username || 'cet utilisateur'

    if (!userId) {
      return
    }

    const shouldDelete = window.confirm(
      `Supprimer ${username} ? Cette action est definitive.`,
    )

    if (!shouldDelete) {
      return
    }

    setBusyActionByUserId((current) => ({
      ...current,
      [userId]: true,
    }))
    setErrorMessage('')

    try {
      await deleteUserRequest(userId)
      setUsers((current) => current.filter((item) => item._id !== userId))
      setPendingUsers((current) => current.filter((item) => item._id !== userId))
    } catch (error) {
      setErrorMessage(
        error.message || "La suppression a echoue. Veuillez reessayer.",
      )
    } finally {
      setBusyActionByUserId((current) => ({
        ...current,
        [userId]: false,
      }))
    }
  }

  return (
    <main className="portal-shell admin-shell">
      <div className="admin-shell__bg" aria-hidden="true" />
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
          <strong>
            {pendingUsers.length} demande(s) en attente | {users.length}{' '}
            utilisateur(s)
          </strong>
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

        <section className="admin-users-section">
          <div className="admin-users-section__header">
            <h2>Liste complete des utilisateurs</h2>
            <span>{users.length} compte(s)</span>
          </div>

          {!isLoading && users.length === 0 ? (
            <p className="field-hint">Aucun utilisateur disponible.</p>
          ) : null}

          {!isLoading && users.length > 0 ? (
            <div className="admin-users-table-wrap">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Statut</th>
                    <th>Cree le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => {
                    const userId = String(userItem._id || '')
                    const isBusy = Boolean(busyActionByUserId[userId])
                    const isSelf = userId === currentUserId
                    const statusLabel = userItem.isRejected
                      ? 'Rejete'
                      : userItem.isApproved
                        ? 'Approuve'
                        : 'En attente'
                    const statusClassName = userItem.isRejected
                      ? 'admin-status-pill admin-status-pill--rejected'
                      : userItem.isApproved
                        ? 'admin-status-pill admin-status-pill--approved'
                        : 'admin-status-pill admin-status-pill--pending'

                    return (
                      <tr key={userId}>
                        <td>{userItem.username || '-'}</td>
                        <td>{userItem.email || '-'}</td>
                        <td>{getRoleLabel(userItem.role)}</td>
                        <td>
                          <span className={statusClassName}>{statusLabel}</span>
                        </td>
                        <td>
                          <span className="admin-users-date">
                            <Clock3 size={13} aria-hidden="true" />
                            {formatDate(userItem.createdAt)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ghost-button admin-users-delete-btn"
                            disabled={isBusy || isSelf}
                            onClick={() => handleDeleteUser(userItem)}
                            title={
                              isSelf
                                ? 'Vous ne pouvez pas supprimer votre compte connecte.'
                                : 'Supprimer cet utilisateur'
                            }
                          >
                            <span className="button-content">
                              <Trash2 size={15} aria-hidden="true" />
                              {isBusy ? 'Suppression...' : 'Supprimer'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  )
}

export default AdministrationComptesPage
