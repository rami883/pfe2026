import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { roleHomePaths, roleOptions } from '../config/roles'

const initialFormState = {
  identifier: '',
  password: '',
  role: 'directeur',
}

function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState(initialFormState)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage)
      navigate('/login', { replace: true, state: null })
    }
  }, [location.state, navigate])

  function handleChange(event) {
    const { name, value } = event.target

    if (errorMessage) {
      setErrorMessage('')
    }

    if (successMessage) {
      setSuccessMessage('')
    }

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!formData.identifier.trim() || !formData.password.trim()) {
      setErrorMessage('Veuillez completer votre identifiant et votre mot de passe.')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const user = await login({
        identifier: formData.identifier.trim(),
        password: formData.password,
        role: formData.role,
      })

      navigate(roleHomePaths[user.role] || '/login', { replace: true })
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Connexion impossible pour le moment. Veuillez reessayer.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-card">
          <div className="login-card__header">
            <span className="login-card__badge">Acces securise</span>
            <h2>Se connecter</h2>
            <p>Connectez-vous pour acceder a votre espace selon votre role.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {successMessage ? (
              <p className="form-success" role="status">
                {successMessage}
              </p>
            ) : null}

            <div className="field-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <small className="field-hint">
                {
                  roleOptions.find((role) => role.value === formData.role)
                    ?.description
                }
              </small>
            </div>

            <div className="field-group">
              <label htmlFor="identifier">Identifiant ou email</label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="prenom.nom ou prenom.nom@yazaki-europe.com"
                autoComplete="username"
                value={formData.identifier}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="field-group">
              <label htmlFor="password">Mot de passe</label>
              <div className="password-field">
                <input
                  id="password"
                  name="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  placeholder="Saisissez votre mot de passe"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  aria-label={
                    isPasswordVisible
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                >
                  {isPasswordVisible ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </div>

            {errorMessage ? (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              className="primary-button primary-button--wide"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
            </button>

            <p className="auth-switch">
              Pas encore de compte ?{' '}
              <Link className="auth-switch__link" to="/register">
                Inscription
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
