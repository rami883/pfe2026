const ACCENT_MAP = {
  red: { icon: 'rgba(215,25,32,0.12)', color: '#b51218' },
  green: { icon: 'rgba(22,163,74,0.12)', color: '#166534' },
  orange: { icon: 'rgba(245,158,11,0.12)', color: '#92400e' },
  blue: { icon: 'rgba(59,130,246,0.12)', color: '#1d4ed8' },
}

function MLKpiCard({ icon: Icon, label, value, helper, accent = 'red', loading = false }) {
  const colors = ACCENT_MAP[accent] || ACCENT_MAP.red

  if (loading) {
    return (
      <article className="ml-kpi-card ml-kpi-card--loading">
        <div className="ml-kpi-card__icon ml-skeleton" />
        <div className="ml-kpi-card__content">
          <div className="ml-skeleton ml-skeleton--label" />
          <div className="ml-skeleton ml-skeleton--value" />
        </div>
      </article>
    )
  }

  return (
    <article className="ml-kpi-card">
      <div className="ml-kpi-card__icon" style={{ background: colors.icon, color: colors.color }}>
        {Icon ? <Icon size={18} aria-hidden="true" /> : null}
      </div>
      <div className="ml-kpi-card__content">
        <p className="ml-kpi-card__label">{label}</p>
        <strong className="ml-kpi-card__value">{value}</strong>
        {helper ? <p className="ml-kpi-card__helper">{helper}</p> : null}
      </div>
    </article>
  )
}

export default MLKpiCard

