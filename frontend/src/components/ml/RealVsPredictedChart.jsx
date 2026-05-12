import { useMemo } from 'react'
import { Scatter } from 'react-chartjs-2'
import '../../dashboard/chartSetup'
import { formatCurrency } from './mlFormatters'

/**
 * Scatter plot : Montant réel (X) vs Montant prédit (Y).
 *
 * Visualisation ML standard : les points proches de la droite diagonale
 * y = x indiquent une excellente prédiction.
 * Points au-dessus → surestimation | Points en dessous → sous-estimation.
 */
function RealVsPredictedChart({ predictions = [] }) {
  // Utilise jusqu'à 100 prédictions pour un nuage de points lisible
  const points = predictions.slice(0, 100)

  const { minVal, maxVal } = useMemo(() => {
    const allValues = points.flatMap((p) => [
      Number(p.montant_reel) || 0,
      Number(p.montant_predit) || 0,
    ])
    return {
      minVal: Math.max(0, Math.min(...allValues) * 0.9),
      maxVal: Math.max(...allValues) * 1.1,
    }
  }, [points])

  const data = useMemo(
    () => ({
      datasets: [
        // Droite de référence parfaite y = x
        {
          type: 'scatter',
          label: 'Prédiction parfaite (y = x)',
          data: [
            { x: minVal, y: minVal },
            { x: maxVal, y: maxVal },
          ],
          showLine: true,
          borderColor: 'rgba(107, 114, 128, 0.5)',
          borderWidth: 2,
          borderDash: [8, 4],
          pointRadius: 0,
          fill: false,
          order: 0,
        },
        // Nuage de points des prédictions
        {
          label: 'Prédictions',
          data: points.map((p) => ({
            x: Number(p.montant_reel) || 0,
            y: Number(p.montant_predit) || 0,
          })),
          backgroundColor: points.map((p) => {
            const pct = Number(p.erreur_pourcentage) || 0
            if (pct < 15) return 'rgba(22, 163, 74, 0.65)'    // vert → bonne
            if (pct <= 25) return 'rgba(245, 158, 11, 0.65)'  // orange → moyenne
            return 'rgba(215, 25, 32, 0.65)'                  // rouge → à vérifier
          }),
          borderColor: 'transparent',
          pointRadius: 5,
          pointHoverRadius: 7,
          order: 1,
        },
      ],
    }),
    [points, minVal, maxVal],
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: '#6b7280', usePointStyle: true, pointStyleWidth: 10 },
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#9ca3af',
          bodyColor: '#ffffff',
          callbacks: {
            title(ctx) {
              const point = points[ctx[0]?.dataIndex]
              return point ? `${point.transporteur} — ${point.fournisseur}` : ''
            },
            label(ctx) {
              if (ctx.dataset.label === 'Prédiction parfaite (y = x)') return null
              const point = points[ctx.dataIndex]
              return [
                `Réel:    ${formatCurrency(ctx.parsed.x)}`,
                `Prédit:  ${formatCurrency(ctx.parsed.y)}`,
                `Erreur:  ${Number(point?.erreur_pourcentage || 0).toFixed(1)} %`,
              ]
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Montant réel (€)',
            color: '#6b7280',
            font: { size: 11, weight: '600' },
          },
          grid: { color: 'rgba(148,163,184,0.15)' },
          ticks: {
            color: '#6b7280',
            callback: (v) => formatCurrency(v),
          },
          min: minVal,
          max: maxVal,
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: 'Montant prédit (€)',
            color: '#6b7280',
            font: { size: 11, weight: '600' },
          },
          grid: { color: 'rgba(148,163,184,0.15)' },
          ticks: {
            color: '#6b7280',
            callback: (v) => formatCurrency(v),
          },
          min: minVal,
          max: maxVal,
        },
      },
    }),
    [minVal, maxVal, points],
  )

  if (!points.length) {
    return (
      <section className="ml-chart-card">
        <h3>Réel vs Prédit — Scatter plot</h3>
        <div className="ml-chart-empty">Aucune donnée disponible</div>
      </section>
    )
  }

  return (
    <section className="ml-chart-card ml-chart-card--wide">
      <h3>Réel vs Prédit — Scatter plot</h3>
      <p className="ml-chart-subtitle">
        Points proches de la diagonale = prédictions précises.
        🟢 &lt;15% · 🟡 15–25% · 🔴 &gt;25%
      </p>
      <div className="ml-chart-wrap">
        <Scatter data={data} options={options} />
      </div>
    </section>
  )
}

export default RealVsPredictedChart
