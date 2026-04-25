function SectionCard({ title, children }) {
  return (
    <section className="section-card">
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  )
}

export default SectionCard

