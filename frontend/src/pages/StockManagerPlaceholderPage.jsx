import { Boxes } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getRoleLabel } from '../config/roles'

const INITIAL_FORM = {
  arrivalDate: '',
  arrivalTime: '',
  trailerPlate: '',
  transportType: 'Truck',
  supplier: '',
  origin: 'Local',
  palletsCount: '',
  position: '',
}

function StockManagerPlaceholderPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
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

  function handleFieldChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
    setIsSubmitted(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitted(true)
  }

  return (
    <main className="portal-shell">
      <section className="portal-hero">
        <span className="portal-badge">
          <Boxes size={16} aria-hidden="true" />
          Espace stock
        </span>
        <h1>Formulaire d'arrivee transport</h1>
        <p>
          Renseignez les informations de chaque arrivee dans l'interface
          gestionnaire.
        </p>
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
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="transport-type">Type de transport</label>
              <select
                id="transport-type"
                name="transportType"
                value={formData.transportType}
                onChange={handleFieldChange}
                required
              >
                <option value="Truck">Truck</option>
                <option value="VAN">VAN</option>
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
                min="0"
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
                required
              />
            </div>
          </div>

          {isSubmitted ? (
            <p className="form-success" role="status">
              Arrivee enregistree localement avec succes.
            </p>
          ) : null}

          <button type="submit" className="primary-button">
            Enregistrer l'arrivee
          </button>
        </form>
      </section>
    </main>
  )
}

export default StockManagerPlaceholderPage
