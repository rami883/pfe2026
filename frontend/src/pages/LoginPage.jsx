import { useEffect, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { normalizeRole, roleHomePaths } from '../config/roles'

const initialFormState = {
  email: '',
  password: '',
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

    if (!formData.email.trim() || !formData.password.trim()) {
      setErrorMessage('Veuillez completer votre email et votre mot de passe.')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const user = await login({
        email: formData.email.trim(),
        password: formData.password,
      })

      navigate(roleHomePaths[normalizeRole(user.role)] || '/login', {
        replace: true,
      })
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
            <span className="login-card__badge">
              <ShieldCheck size={16} aria-hidden="true" />
              Acces securise
            </span>
            <h2>Se connecter</h2>
            <p>Connectez-vous pour acceder a votre espace.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {successMessage ? (
              <p className="form-success" role="status">
                {successMessage}
              </p>
            ) : null}

            <div className="field-group">
              <label htmlFor="email" className="field-label">
                <Mail size={16} aria-hidden="true" />
                Email
              </label>
              <input
                id="email"
                name="email"
                type="text"
                placeholder="prenom.nom@yazaki-europe.com"
                autoComplete="username"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="field-group">
              <label htmlFor="password" className="field-label">
                <LockKeyhole size={16} aria-hidden="true" />
                Mot de passe
              </label>
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
                  <span className="button-content">
                    {isPasswordVisible ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                    {isPasswordVisible ? 'Masquer' : 'Afficher'}
                  </span>
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
              <span className="button-content">
                <LogIn size={16} aria-hidden="true" />
                {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
              </span>
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
