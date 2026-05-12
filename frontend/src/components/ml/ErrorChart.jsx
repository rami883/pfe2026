import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import '../../dashboard/chartSetup'
import { formatCurrency } from './mlFormatters'

function ErrorChart({ rows = [] }) {
  const chartRows = rows.slice(0, 15)

  const data = useMemo(
    () => ({
      labels: chartRows.map((item, index) => `${item.transporteur || 'N/A'} #${index + 1}`),
      datasets: [
        {
          label: 'Erreur absolue',
          data: chartRows.map((item) => Number(item.erreur_absolue) || 0),
          backgroundColor: '#d71920',
          borderRadius: 8,
        },
      ],
    }),
    [chartRows],
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          callbacks: {
            label(context) {
              return formatCurrency(context.parsed.y)
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6b7280', maxRotation: 0, autoSkip: true },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.18)' },
          ticks: {
            color: '#6b7280',
            callback(value) {
              return formatCurrency(value)
            },
          },
        },
      },
    }),
    [],
  )

  return (
    <section className="ml-chart-card">
      <h3>Operations avec plus grandes erreurs</h3>
      <div className="ml-chart-wrap">
        <Bar data={data} options={options} />
      </div>
    </section>
  )
}

export default ErrorChart

