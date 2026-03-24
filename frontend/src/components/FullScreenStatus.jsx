function FullScreenStatus({ title, message }) {
  return (
    <main className="status-screen" role="status" aria-live="polite">
      <section className="status-panel">
        <span className="status-pulse" aria-hidden="true" />
        <h1>{title}</h1>
        <p>{message}</p>
      </section>
    </main>
  )
}

export default FullScreenStatus
