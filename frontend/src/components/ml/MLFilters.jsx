function MLFilters({
  filters,
  onChange,
  onReset,
  transporteurOptions = [],
  fournisseurOptions = [],
  typeTransportOptions = [],
  statusOptions = [],
}) {
  return (
    <section className="ml-filters">
      <label className="ml-filter-item">
        <span>Transporteur</span>
        <select
          value={filters.transporteur}
          onChange={(event) => onChange('transporteur', event.target.value)}
        >
          <option value="">Tous</option>
          {transporteurOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="ml-filter-item">
        <span>Fournisseur</span>
        <select
          value={filters.fournisseur}
          onChange={(event) => onChange('fournisseur', event.target.value)}
        >
          <option value="">Tous</option>
          {fournisseurOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="ml-filter-item">
        <span>Type transport</span>
        <select
          value={filters.typeTransport}
          onChange={(event) => onChange('typeTransport', event.target.value)}
        >
          <option value="">Tous</option>
          {typeTransportOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="ml-filter-item">
        <span>Statut</span>
        <select
          value={filters.statut}
          onChange={(event) => onChange('statut', event.target.value)}
        >
          <option value="">Tous</option>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="ml-filter-item ml-filter-item--search">
        <span>Recherche</span>
        <input
          type="text"
          value={filters.search}
          onChange={(event) => onChange('search', event.target.value)}
          placeholder="Transporteur, fournisseur, designation..."
        />
      </label>

      <div className="ml-filter-actions">
        <button type="button" className="ml-reset-btn" onClick={onReset}>
          Reinitialiser
        </button>
      </div>
    </section>
  )
}

export default MLFilters

