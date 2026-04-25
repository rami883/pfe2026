function ChartCard({ title, subtitle, actions, children }) {
  return (
    <section className="chart-card">
      <div className="chart-card__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="chart-card__actions">{actions}</div> : null}
      </div>
      <div className="chart-card__body">{children}</div>
    </section>
  )
}

export default ChartCard
