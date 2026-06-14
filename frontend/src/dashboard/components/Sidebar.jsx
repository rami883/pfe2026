import receptionLogo from '../../assets/logo-reception.png'

function Sidebar({
  items,
  activeItem,
  onItemChange,
}) {
  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-logo dashboard-logo--reception">
        <span className="dashboard-logo__media" aria-hidden="true">
          <img
            src={receptionLogo}
            alt=""
            className="dashboard-logo__image"
            loading="lazy"
            decoding="async"
          />
        </span>
      </div>

      <nav className="dashboard-nav" aria-label="Dashboard menu">
        {items.map((item) => {
          const isActive = item.id === activeItem
          const Icon = item.icon

          return (
            <button
              key={item.id}
              type="button"
              className={`dashboard-nav__item ${isActive ? 'is-active' : ''}`}
              onClick={() => onItemChange(item.id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
              {Number(item.badge || 0) > 0 ? (
                <span className="dashboard-nav__badge">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

    </aside>
  )
}

export default Sidebar
