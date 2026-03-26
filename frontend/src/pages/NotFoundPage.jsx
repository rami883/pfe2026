import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main className="status-screen">
      <section className="status-panel">
        <span className="status-icon" aria-hidden="true">
          <TriangleAlert size={18} />
        </span>
        <h1>Page introuvable</h1>
        <p>La ressource demandee n&apos;est pas disponible dans cette version du projet.</p>
        <Link className="primary-button primary-button--inline" to="/login">
          <span className="button-content">
            <ArrowLeft size={16} aria-hidden="true" />
            Retour a la connexion
          </span>
        </Link>
      </section>
    </main>
  )
}

export default NotFoundPage
