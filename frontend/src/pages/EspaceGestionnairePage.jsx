import { Boxes } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { createReception } from '../api/dashboardApi'
import { getRoleLabel } from '../config/roles'

const INITIAL_FORM = {//initalisation mt3 les champs
  arrivalDate: '',
  arrivalTime: '',
  trailerPlate: '',
  transportType: 'Truck',
  supplier: '',
  origin: 'Local',
  palletsCount: '',
  position: '',
}
//correction les champs
function sanitizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
}
//normalisation des champs poour le payload back
function buildReceptionPayload(formData) {
  const arrivalDate = String(formData.arrivalDate || '').trim()
  const arrivalTime = String(formData.arrivalTime || '').trim()
  const trailerPlate = sanitizeText(formData.trailerPlate).toUpperCase()
  const supplier = sanitizeText(formData.supplier)
  const position = sanitizeText(formData.position)
  const palletsCount = Number(formData.palletsCount)

  const isValidTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(arrivalTime)
  const isValidPallets =
    Number.isInteger(palletsCount) && palletsCount > 0 && palletsCount <= 5000

  const isValid =
    Boolean(arrivalDate) &&
    isValidTime &&
    Boolean(trailerPlate) &&
    Boolean(supplier) &&
    Boolean(position) &&
    isValidPallets

  return {
    isValid,
    payload: {
      arrivalDate,
      arrivalTime,
      trailerPlate,
      transportType: formData.transportType,
      supplier,
      origin: formData.origin,
      palletsCount,
      position,
    },
  }
}

function EspaceGestionnairePage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [formData, setFormData] = useState(INITIAL_FORM)//enregister les valeur entrer de la formulaire dans formdata
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }
//il fonctionne pour les changement
  function handleFieldChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
    setIsSubmitted(false)
    setSubmitError('')
  }
//button envoyer formulaire
  async function handleSubmit(event) {
    event.preventDefault()
    const normalized = buildReceptionPayload(formData)//normaliser les champs et construire le payload pour backend
    if (!normalized.isValid) {
      setSubmitError(
        'Veuillez verifier le format des champs (heure HH:mm, palettes > 0, textes valides).',
      )
      setIsSubmitted(false)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      await createReception(normalized.payload)
      setIsSubmitted(true)
      setFormData(INITIAL_FORM)
    } catch (error) {
      setSubmitError(error?.message || "Impossible d'enregistrer la reception.")
      setIsSubmitted(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="portal-shell stock-manager-shell">
      <div className="stock-manager-shell__bg" aria-hidden="true" />
      <section className="portal-hero">
        <span className="portal-badge">
          <Boxes size={16} aria-hidden="true" />
          Espace stock
        </span>
        <h1>Formulaire d'arrivee transport</h1>
      </section>

      <section className="portal-card arrival-card">
        <div className="arrival-card__header">
          <div className="arrival-card__identity">
            <span className="portal-card__label">Gestionnaire connecte</span>
            <strong>{user?.fullName || user?.email || 'Utilisateur'}</strong>
            <span className="field-hint">{getRoleLabel(user?.role)}</span>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
          </button>
        </div>

        <form className="arrival-form" onSubmit={handleSubmit}>
          <div className="arrival-grid">
            <div className="field-group">
              <label htmlFor="arrival-date">Date d'arrivee</label>
              <input
                id="arrival-date"
                name="arrivalDate"
                type="date"
                value={formData.arrivalDate}
                onChange={handleFieldChange}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="arrival-time">Heure d'arrivee</label>
              <input
                id="arrival-time"
                name="arrivalTime"
                type="time"
                value={formData.arrivalTime}
                onChange={handleFieldChange}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="trailer-plate">Numero de remorque / Plate</label>
              <input
                id="trailer-plate"
                name="trailerPlate"
                type="text"
                value={formData.trailerPlate}
                onChange={handleFieldChange}
                placeholder="Ex: 123 TN 4567"
                maxLength={40}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="transport-type">Type de vehicule</label>
              <select
                id="transport-type"
                name="transportType"
                value={formData.transportType}
                onChange={handleFieldChange}
                required
              >
                <option value="Truck">Truck</option>
                <option value="Van">Van</option>
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="supplier">Supplier / Fournisseur</label>
              <input
                id="supplier"
                name="supplier"
                type="text"
                value={formData.supplier}
                onChange={handleFieldChange}
                placeholder="Nom du fournisseur"
                maxLength={120}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="origin">Origine</label>
              <select
                id="origin"
                name="origin"
                value={formData.origin}
                onChange={handleFieldChange}
                required
              >
                <option value="Local">Local</option>
                <option value="Euro">Euro</option>
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="pallets-count">Nombre de palettes</label>
              <input
                id="pallets-count"
                name="palletsCount"
                type="number"
                min="1"
                step="1"
                value={formData.palletsCount}
                onChange={handleFieldChange}
                placeholder="0"
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="position">Position</label>
              <input
                id="position"
                name="position"
                type="text"
                value={formData.position}
                onChange={handleFieldChange}
                placeholder="Ex: Quai 02 / Zone A"
                maxLength={120}
                required
              />
            </div>
          </div>

          {submitError ? (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          ) : null}

          {isSubmitted ? (
            <p className="form-success" role="status">
              Arrivee enregistree en base avec succes.
            </p>
          ) : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : "Enregistrer l'arrivee"}
          </button>
        </form>
      </section>
    </main>
  )
}

export default EspaceGestionnairePage
