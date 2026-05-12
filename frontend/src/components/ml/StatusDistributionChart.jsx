import { useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'
import '../../dashboard/chartSetup'

const STATUS_COLORS = {
  'Bonne prediction': '#16a34a',
  'Prediction moyenne': '#f59e0b',
  'A verifier': '#d71920',
}

function StatusDistributionChart({ distribution = [] }) {
  const rows = useMemo(
    () =>
      distribution.length
        ? distribution
        : [
            { statut: 'Bonne prediction', count: 0 },
            { statut: 'Prediction moyenne', count: 0 },
            { statut: 'A verifier', count: 0 },
          ],
    [distribution],
  )

  const data = useMemo(
    () => ({
      labels: rows.map((item) => item.statut),
      datasets: [
        {
          data: rows.map((item) => Number(item.count) || 0),
          backgroundColor: rows.map((item) => STATUS_COLORS[item.statut] || '#6b7280'),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    }),
    [rows],
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#374151',
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
        },
      },
      cutout: '60%',
    }),
    [],
  )

  return (
    <section className="ml-chart-card">
      <h3>Repartition des statuts</h3>
      <div className="ml-chart-wrap ml-chart-wrap--doughnut">
        <Doughnut data={data} options={options} />
      </div>
    </section>
  )
}

export default StatusDistributionChart
