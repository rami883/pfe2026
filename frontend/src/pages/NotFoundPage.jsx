import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main className="status-screen">
      <section className="status-panel">
        <h1>Page introuvable</h1>
        <p>La ressource demandee n&apos;est pas disponible dans cette version du projet.</p>
        <Link className="primary-button primary-button--inline" to="/login">
          Retour a la connexion
        </Link>
      </section>
    </main>
  )
}

export default NotFoundPage
