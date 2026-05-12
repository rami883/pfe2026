import { Download } from 'lucide-react'
import { formatCurrency, formatInteger, formatPercent } from './mlFormatters'

// ─── Utilitaires ─────────────────────────────────────────────────────────────
function statusClassName(statut) {
  if (statut === 'Bonne prediction') return 'ml-status-pill ml-status-pill--good'
  if (statut === 'Prediction moyenne') return 'ml-status-pill ml-status-pill--medium'
  return 'ml-status-pill ml-status-pill--review'
}

/**
 * Exporte les lignes actuelles en fichier CSV (séparateur ;, encodage UTF-8 BOM).
 * Le BOM assure que Excel ouvre correctement les caractères accentués.
 */
function exportToCSV(rows) {
  const headers = [
    'Transporteur', 'Fournisseur', 'Type transport', 'Désignation',
    'Nbr Colis', 'Délai (j)', 'Montant Réel EUR', 'Montant Prédit EUR',
    'Erreur Absolue EUR', 'Erreur %', 'Statut',
  ]

  const lines = rows.map((row) =>
    [
      row.transporteur, row.fournisseur, row.type_transport, row.designation,
      row.nbr_colis, row.delai_jours,
      row.montant_reel, row.montant_predit,
      row.erreur_absolue, row.erreur_pourcentage, row.statut,
    ]
      .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
      .join(';'),
  )

  const csv = [headers.map((h) => `"${h}"`).join(';'), ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `predictions_ml_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Composant ────────────────────────────────────────────────────────────────
function PredictionsTable({ rows = [], page = 1, totalPages = 1, total = 0, onPageChange }) {
  return (
    <section className="ml-table-card">
      <div className="ml-table-header">
        <div>
          <h3>Tableau détaillé des prédictions</h3>
          <p className="ml-table-subtitle">
            {total > 0 ? `${total.toLocaleString('fr-FR')} prédictions au total` : 'Aucune prédiction'}
          </p>
        </div>
        {rows.length > 0 && (
          <button
            type="button"
            className="ml-export-btn"
            onClick={() => exportToCSV(rows)}
            title="Télécharger les prédictions filtrées en CSV"
          >
            <Download size={14} aria-hidden="true" />
            Exporter CSV
          </button>
        )}
      </div>

      <div className="ml-table-wrap">
        <table className="ml-table">
          <thead>
            <tr>
              <th>Transporteur</th>
              <th>Fournisseur</th>
              <th>Type</th>
              <th>Désignation</th>
              <th className="ml-table__num">Colis</th>
              <th className="ml-table__num">Délai (j)</th>
              <th className="ml-table__num">Réel €</th>
              <th className="ml-table__num">Prédit €</th>
              <th className="ml-table__num">Err. abs.</th>
              <th className="ml-table__num">Err. %</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td colSpan={11} className="ml-table__empty">
                  Aucune prédiction pour les filtres sélectionnés.
                </td>
              </tr>
            ) : null}

            {rows.map((row) => (
              <tr key={row.id} className="ml-table__row">
                <td className="ml-table__carrier">{row.transporteur}</td>
                <td>{row.fournisseur}</td>
                <td>{row.type_transport}</td>
                <td className="ml-table__designation" title={row.designation}>
                  {row.designation}
                </td>
                <td className="ml-table__num">{formatInteger(row.nbr_colis)}</td>
                <td className="ml-table__num">{formatInteger(row.delai_jours)}</td>
                <td className="ml-table__num ml-table__amount">{formatCurrency(row.montant_reel)}</td>
                <td className="ml-table__num ml-table__amount">{formatCurrency(row.montant_predit)}</td>
                <td className="ml-table__num">{formatCurrency(row.erreur_absolue)}</td>
                <td className="ml-table__num">
                  <span className={`ml-error-badge ${
                    row.erreur_pourcentage < 15
                      ? 'ml-error-badge--good'
                      : row.erreur_pourcentage <= 25
                        ? 'ml-error-badge--medium'
                        : 'ml-error-badge--review'
                  }`}>
                    {formatPercent(row.erreur_pourcentage)}
                  </span>
                </td>
                <td>
                  <span className={statusClassName(row.statut)}>{row.statut}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-pagination">
        <button
          type="button"
          className="ml-page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ← Précédent
        </button>
        <span className="ml-pagination__info">
          Page <strong>{page}</strong> / {totalPages}
        </span>
        <button
          type="button"
          className="ml-page-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant →
        </button>
      </div>
    </section>
  )
}

export default PredictionsTable
