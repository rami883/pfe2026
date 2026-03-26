import { LoaderCircle } from 'lucide-react'

function FullScreenStatus({ title, message }) {
  return (
    <main className="status-screen" role="status" aria-live="polite">
      <section className="status-panel">
        <span className="status-icon status-icon--loading" aria-hidden="true">
          <LoaderCircle size={18} />
        </span>
        <h1>{title}</h1>
        <p>{message}</p>
      </section>
    </main>
  )
}

export default FullScreenStatus
