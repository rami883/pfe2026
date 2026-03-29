import { useState } from 'react'
import {
  LockKeyhole,
  Mail,
  Shield,
  User,
  UserPlus,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { registerRequest } from '../api/authApi'
import { roleOptions } from '../config/roles'
import { validateRegisterForm } from '../utils/registerValidation'
import { YAZAKI_EMAIL_SUFFIX } from '../utils/yazakiEmail'

const initialFormState = {
  nom: '',
  prenom: '',
  identifier: '',
  role: 'directeur',
  password: '',
  confirmPassword: '',
}

function RegisterForm() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialFormState)
  const [errors, setErrors] = useState({})
  const [globalMessage, setGlobalMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    const nextValue = name === 'identifier' ? value.toLowerCase() : value

    setFormData((currentData) => ({
      ...currentData,
      [name]: nextValue,
    }))

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[name]
      return nextErrors
    })

    if (globalMessage) {
      setGlobalMessage('')
    }
  }

  function handleTogglePasswordVisibility(event) {
    event.preventDefault()
    setIsPasswordVisible((current) => !current)
  }

  function handleToggleConfirmPasswordVisibility(event) {
    event.preventDefault()
    setIsConfirmPasswordVisible((current) => !current)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validation = validateRegisterForm(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setErrors({})
    setGlobalMessage('')
    setIsSubmitting(true)

    try {
      await registerRequest(validation.values)
      navigate('/login', {
        replace: true,
        state: {
          successMessage: 'Compte cree avec succes. Connectez-vous pour continuer.',
        },
      })
    } catch (error) {
      if (!error.status) {
        setGlobalMessage(
          error.message ||
            "Impossible de creer le compte pour le moment. Veuillez reessayer.",
        )
        return
      }

      if (error.details) {
        setErrors((currentErrors) => ({
          ...currentErrors,
          ...error.details,
        }))
      }

      if (error.status === 400 || error.status === 409) {
        setGlobalMessage(
          error.message || 'Certains champs sont invalides. Verifiez le formulaire.',
        )
      } else {
        setGlobalMessage(
          "Impossible de creer le compte pour le moment. Veuillez reessayer.",
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-card register-card">
          <div className="login-card__header">
            <span className="login-card__badge">
              <UserPlus size={16} aria-hidden="true" />
              Inscription
            </span>
            <h2>Creer un compte</h2>
            <p>
              Completez le formulaire pour creer un compte Directeur ou
              Gestionnaire de stock.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="register-grid">
              <div className="field-group">
                <label htmlFor="nom" className="field-label">
                  <User size={16} aria-hidden="true" />
                  Nom
                </label>
                <input
                  id="nom"
                  name="nom"
                  type="text"
                  value={formData.nom}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {errors.nom ? (
                  <p className="field-error" role="alert">
                    {errors.nom}
                  </p>
                ) : null}
              </div>

              <div className="field-group">
                <label htmlFor="prenom" className="field-label">
                  <User size={16} aria-hidden="true" />
                  Prenom
                </label>
                <input
                  id="prenom"
                  name="prenom"
                  type="text"
                  value={formData.prenom}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {errors.prenom ? (
                  <p className="field-error" role="alert">
                    {errors.prenom}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="role" className="field-label">
                <Shield size={16} aria-hidden="true" />
                Role
              </label>
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
              {errors.role ? (
                <p className="field-error" role="alert">
                  {errors.role}
                </p>
              ) : (
                <small className="field-hint">
                  {
                    roleOptions.find((role) => role.value === formData.role)
                      ?.description
                  }
                </small>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="identifier" className="field-label">
                <Mail size={16} aria-hidden="true" />
                Identifiant professionnel
              </label>
              <div className="input-with-suffix">
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  placeholder="rami.bhk"
                  autoComplete="username"
                  value={formData.identifier}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <span className="input-suffix" aria-hidden="true">
                  {YAZAKI_EMAIL_SUFFIX}
                </span>
              </div>
              {errors.identifier ? (
                <p className="field-error" role="alert">
                  {errors.identifier}
                </p>
              ) : (
                <small className="field-hint">
                  Saisissez uniquement la partie avant @. Le domaine est ajoute
                  automatiquement.
                </small>
              )}
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
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleTogglePasswordVisibility}
                  aria-label={
                    isPasswordVisible
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                  aria-pressed={isPasswordVisible}
                >
                  <span className="button-content">
                    <LockKeyhole size={16} aria-hidden="true" />
                    {isPasswordVisible ? 'Masquer' : 'Afficher'}
                  </span>
                </button>
              </div>
              {errors.password ? (
                <p className="field-error" role="alert">
                  {errors.password}
                </p>
              ) : null}
            </div>

            <div className="field-group">
              <label htmlFor="confirmPassword" className="field-label">
                <LockKeyhole size={16} aria-hidden="true" />
                Confirmer le mot de passe
              </label>
              <div className="password-field">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleToggleConfirmPasswordVisibility}
                  aria-label={
                    isConfirmPasswordVisible
                      ? 'Masquer la confirmation du mot de passe'
                      : 'Afficher la confirmation du mot de passe'
                  }
                  aria-pressed={isConfirmPasswordVisible}
                >
                  <span className="button-content">
                    <LockKeyhole size={16} aria-hidden="true" />
                    {isConfirmPasswordVisible ? 'Masquer' : 'Afficher'}
                  </span>
                </button>
              </div>
              {errors.confirmPassword ? (
                <p className="field-error" role="alert">
                  {errors.confirmPassword}
                </p>
              ) : null}
            </div>

            {globalMessage ? (
              <p className="form-error" role="alert">
                {globalMessage}
              </p>
            ) : null}

            <button
              type="submit"
              className="primary-button primary-button--wide"
              disabled={isSubmitting}
            >
              <span className="button-content">
                <UserPlus size={16} aria-hidden="true" />
                {isSubmitting ? 'Creation en cours...' : 'Creer un compte'}
              </span>
            </button>

            <p className="auth-switch">
              Vous avez deja un compte ?{' '}
              <Link className="auth-switch__link" to="/login">
                Retour a la connexion
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}

export default RegisterForm
