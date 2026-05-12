import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import '../../dashboard/chartSetup'
import { formatCurrency, formatPercent } from './mlFormatters'

/**
 * Bar chart horizontal : MAE moyen par transporteur.
 *
 * Identifie quels transporteurs génèrent les prédictions les moins précises.
 * Les données viennent de /api/ml/by-carrier (agrégation MongoDB).
 */
function TransporteurErrorChart({ carriers = [] }) {
  // Trier du plus grand MAE au plus petit et limiter à 10
  const rows = useMemo(
    () => [...carriers].sort((a, b) => b.avgMae - a.avgMae).slice(0, 10),
    [carriers],
  )

  // Gradient de couleur selon la position dans le classement
  const colors = useMemo(
    () =>
      rows.map((_, i) => {
        const ratio = rows.length > 1 ? i / (rows.length - 1) : 0
        // Du rouge vif (position 0 = pire) vers l'orange clair (dernière position)
        const r = Math.round(215 - ratio * 50)
        const g = Math.round(25 + ratio * 120)
        const b = Math.round(32 + ratio * 30)
        return `rgba(${r},${g},${b},0.85)`
      }),
    [rows],
  )

  const data = useMemo(
    () => ({
      labels: rows.map((r) => r.transporteur),
      datasets: [
        {
          label: 'MAE moyen (€)',
          data: rows.map((r) => r.avgMae),
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    }),
    [rows, colors],
  )

  const options = useMemo(
    () => ({
      indexAxis: 'y',  // bar chart horizontal
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#9ca3af',
          bodyColor: '#ffffff',
          callbacks: {
            label(ctx) {
              const carrier = rows[ctx.dataIndex]
              return [
                `MAE moyen: ${formatCurrency(ctx.parsed.x)}`,
                `Erreur %: ${formatPercent(carrier?.avgErrorPct)}`,
                `Opérations: ${carrier?.count}`,
              ]
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(148,163,184,0.15)' },
          ticks: {
            color: '#6b7280',
            callback: (v) => formatCurrency(v),
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#374151',
            font: { weight: '600' },
          },
        },
      },
    }),
    [rows],
  )

  if (!rows.length) {
    return (
      <section className="ml-chart-card">
        <h3>MAE moyen par transporteur</h3>
        <div className="ml-chart-empty">Aucune donnée disponible</div>
      </section>
    )
  }

  return (
    <section className="ml-chart-card">
      <h3>MAE moyen par transporteur</h3>
      <p className="ml-chart-subtitle">Top 10 transporteurs par erreur de prédiction</p>
      <div className="ml-chart-wrap ml-chart-wrap--carriers">
        <Bar data={data} options={options} />
      </div>
    </section>
  )
}

export default TransporteurErrorChart
