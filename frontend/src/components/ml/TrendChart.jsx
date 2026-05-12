import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import '../../dashboard/chartSetup'
import { formatCurrency, formatPercent } from './mlFormatters'

/** Seuils de qualité des prédictions (alignés sur le backend) */
const SEUIL_BONNE = 15   // < 15% → Bonne
const SEUIL_VERIFIER = 25 // > 25% → À vérifier

/**
 * Line chart : Évolution mensuelle de l'erreur % moyenne et du MAE.
 *
 * Deux lignes de référence horizontales indiquent :
 * - 🟢 Seuil "Bonne prédiction" (15%)
 * - 🟡 Seuil "À vérifier" (25%)
 *
 * Permet de détecter si le modèle se dégrade avec le temps (concept de drift).
 */
function TrendChart({ trend = [] }) {
  // Lignes de référence horizontales = même point sur toutes les périodes
  const refDataBonne = useMemo(
    () => trend.map(() => SEUIL_BONNE),
    [trend],
  )
  const refDataVerifier = useMemo(
    () => trend.map(() => SEUIL_VERIFIER),
    [trend],
  )

  const data = useMemo(
    () => ({
      labels: trend.map((d) => d.period),
      datasets: [
        // Ligne principale : erreur % moyenne
        {
          label: 'Erreur % moyenne',
          data: trend.map((d) => d.avgErrorPercent),
          borderColor: '#d71920',
          backgroundColor: 'rgba(215, 25, 32, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: '#d71920',
          pointHoverRadius: 7,
          borderWidth: 2,
          order: 1,
        },
        // Seuil 15% — bonne prédiction (vert)
        {
          label: `Seuil Bonne (${SEUIL_BONNE}%)`,
          data: refDataBonne,
          borderColor: 'rgba(22, 163, 74, 0.7)',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          tension: 0,
          order: 0,
        },
        // Seuil 25% — à vérifier (orange)
        {
          label: `Seuil À vérifier (${SEUIL_VERIFIER}%)`,
          data: refDataVerifier,
          borderColor: 'rgba(245, 158, 11, 0.7)',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          tension: 0,
          order: 0,
        },
      ],
    }),
    [trend, refDataBonne, refDataVerifier],
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#6b7280',
            usePointStyle: true,
            pointStyleWidth: 12,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#9ca3af',
          bodyColor: '#ffffff',
          callbacks: {
            label(ctx) {
              const d = trend[ctx.dataIndex]
              if (!d) return `${ctx.dataset.label}: ${ctx.parsed.y} %`
              if (ctx.datasetIndex === 0) {
                return [
                  `Erreur % moy: ${formatPercent(ctx.parsed.y)}`,
                  `MAE moy: ${formatCurrency(d.avgMae)}`,
                  `Opérations: ${d.count}`,
                ]
              }
              return `${ctx.dataset.label}: ${ctx.parsed.y} %`
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(148,163,184,0.12)' },
          ticks: { color: '#6b7280', font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148,163,184,0.12)' },
          ticks: {
            color: '#6b7280',
            callback: (v) => `${v} %`,
          },
          title: {
            display: true,
            text: 'Erreur % moyenne',
            color: '#9ca3af',
            font: { size: 11 },
          },
        },
      },
    }),
    [trend],
  )

  if (!trend.length) {
    return (
      <section className="ml-chart-card ml-chart-card--full">
        <h3>Tendance mensuelle des erreurs</h3>
        <div className="ml-chart-empty">
          Données disponibles après plusieurs mois de prédictions
        </div>
      </section>
    )
  }

  return (
    <section className="ml-chart-card ml-chart-card--full">
      <h3>Tendance mensuelle des erreurs</h3>
      <p className="ml-chart-subtitle">
        Évolution de l'erreur % moyenne · 🟢 &lt;{SEUIL_BONNE}% Bonne · 🟡 &lt;{SEUIL_VERIFIER}% Moyenne
      </p>
      <div className="ml-chart-wrap ml-chart-wrap--trend">
        <Line data={data} options={options} />
      </div>
    </section>
  )
}

export default TrendChart
