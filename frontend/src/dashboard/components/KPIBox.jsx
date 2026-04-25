function KPIBox({ icon: Icon, label, value, helper }) {
  return (
    <article className="kpi-box">
      <div className="kpi-box__icon-wrap">
        {Icon ? <Icon size={18} aria-hidden="true" /> : null}
      </div>
      <div className="kpi-box__content">
        <p className="kpi-box__label">{label}</p>
        <strong className="kpi-box__value">{value}</strong>
        {helper ? <p className="kpi-box__helper">{helper}</p> : null}
      </div>
    </article>
  )
}

export default KPIBox

