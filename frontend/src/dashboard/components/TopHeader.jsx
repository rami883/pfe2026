import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  Filter,
  MapPin,
  Moon,
  RefreshCw,
  Sun,
  Timer,
  Truck,
} from 'lucide-react'

function TopHeader({
  title,
  subtitle,
  showFilters = true,
  filters,
  onFiltersChange,
  onResetFilters,
  periodOptions,
  supplierOptions,
  originOptions,
  vehicleTypeOptions,
  notificationCount = 0,
  onOpenAlerts,
  isDarkMode = false,
  onToggleDarkMode,
}) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header__top">
        <div className="dashboard-header__intro">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <div className="dashboard-header__actions">
          <button
            type="button"
            className="dashboard-icon-btn"
            aria-label="Notifications"
            onClick={onOpenAlerts}
          >
            <Bell size={17} aria-hidden="true" />
            {notificationCount > 0 ? (
              <span className="dashboard-notification-badge">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            ) : (
              <span className="dashboard-notification-dot" />
            )}
          </button>

          <button
            type="button"
            className="dashboard-icon-btn dashboard-theme-toggle"
            aria-label={isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
            title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
            onClick={onToggleDarkMode}
          >
            {isDarkMode ? (
              <Sun size={17} aria-hidden="true" />
            ) : (
              <Moon size={17} aria-hidden="true" />
            )}
          </button>

          <div className="dashboard-avatar" aria-label="Current user">
            Directeur
          </div>
        </div>
      </div>

      {showFilters ? (
        <section className="dashboard-filter-panel" aria-label="Filtres d'analyse">
          <div className="dashboard-filter-panel__header">
            <div className="dashboard-filter-panel__title">
              <span className="dashboard-filter-panel__icon" aria-hidden="true">
                <Filter size={15} />
              </span>
              <div>
                <strong>Filtres d'analyse</strong>
                <p>Ajuster la periode, les fournisseurs et les criteres logistiques.</p>
              </div>
            </div>
            <button type="button" className="dashboard-clear-btn" onClick={onResetFilters}>
              <RefreshCw size={14} aria-hidden="true" />
              Reinitialiser
            </button>
          </div>

          <div className="dashboard-filters-grid">
          <label className="dashboard-filter">
            <span>
              <Timer size={13} aria-hidden="true" />
              Periode
            </span>
            <div className="dashboard-filter__control">
              <select
                value={filters.days}
                onChange={(event) => onFiltersChange('days', Number(event.target.value))}
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </div>
          </label>

          <label className="dashboard-filter">
            <span>
              <CalendarDays size={13} aria-hidden="true" />
              Date debut
            </span>
            <div className="dashboard-filter__control">
              <input
                type="date"
                value={filters.fromDate}
                onChange={(event) => onFiltersChange('fromDate', event.target.value)}
              />
            </div>
          </label>

          <label className="dashboard-filter">
            <span>
              <CalendarDays size={13} aria-hidden="true" />
              Date fin
            </span>
            <div className="dashboard-filter__control">
              <input
                type="date"
                value={filters.toDate}
                onChange={(event) => onFiltersChange('toDate', event.target.value)}
              />
            </div>
          </label>

          <label className="dashboard-filter">
            <span>
              <MapPin size={13} aria-hidden="true" />
              Origine
            </span>
            <div className="dashboard-filter__control">
              <select
                value={filters.origin}
                onChange={(event) => onFiltersChange('origin', event.target.value)}
              >
                {originOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </div>
          </label>

          <label className="dashboard-filter">
            <span>
              <Truck size={13} aria-hidden="true" />
              Type de vehicule
            </span>
            <div className="dashboard-filter__control">
              <select
                value={filters.vehicleType}
                onChange={(event) => onFiltersChange('vehicleType', event.target.value)}
              >
                {vehicleTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </div>
          </label>

          <label className="dashboard-filter dashboard-filter--multi">
            <div className="dashboard-filter-multi__header">
              <span className="dashboard-filter-multi__title">
                <span className="dashboard-filter-multi__icon" aria-hidden="true">
                  <Building2 size={13} />
                </span>
                Fournisseurs
              </span>
              <span className="dashboard-filter-multi__count">
                {filters.suppliers.length
                  ? `${filters.suppliers.length} selectionnes`
                  : 'Tous'}
              </span>
            </div>
            <div className="dashboard-filter__control">
              <select
                multiple
                value={filters.suppliers}
                onChange={(event) =>
                  onFiltersChange(
                    'suppliers',
                    Array.from(event.target.selectedOptions, (option) => option.value),
                  )
                }
              >
                {supplierOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </label>
          </div>
        </section>
      ) : null}
    </header>
  )
}

export default TopHeader
