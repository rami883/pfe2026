import { Bell, Building2, ChevronDown } from 'lucide-react'

function TopHeader({
  title,
  subtitle,
  filters,
  onFiltersChange,
  onResetFilters,
  periodOptions,
  supplierOptions,
  originOptions,
  vehicleTypeOptions,
  notificationCount = 0,
  onOpenAlerts,
}) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header__top">
        <div className="dashboard-header__intro">
          <h1>{title}</h1>
          <p>{subtitle}</p>
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

          <div className="dashboard-avatar" aria-label="Current user">
            DR
          </div>
        </div>
      </div>

      <div className="dashboard-filters-grid">
        <label className="dashboard-filter">
          <span>Periode</span>
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
          <span>Date debut</span>
          <div className="dashboard-filter__control">
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => onFiltersChange('fromDate', event.target.value)}
            />
          </div>
        </label>

        <label className="dashboard-filter">
          <span>Date fin</span>
          <div className="dashboard-filter__control">
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => onFiltersChange('toDate', event.target.value)}
            />
          </div>
        </label>

        <label className="dashboard-filter">
          <span>Origin</span>
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
          <span>Vehicle Type</span>
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
              Suppliers (multi-select)
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

        <div className="dashboard-filter dashboard-filter--actions">
          <button type="button" className="dashboard-clear-btn" onClick={onResetFilters}>
            Reinitialiser les filtres
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopHeader
