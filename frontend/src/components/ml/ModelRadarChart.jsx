import { useMemo } from 'react'
import { Radar } from 'react-chartjs-2'
import '../../dashboard/chartSetup'

function clampScore(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

function safeRatioScore(bestValue, currentValue) {
  const best = Number(bestValue)
  const current = Number(currentValue)
  if (!Number.isFinite(best) || !Number.isFinite(current) || current <= 0) {
    return 0
  }
  return clampScore((best / current) * 100)
}

function cvMeanScore(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return clampScore(((parsed + 1) / 2) * 100)
}

const MODEL_STYLES = [
  {
    border: '#d71920',
    background: 'rgba(215, 25, 32, 0.18)',
    point: '#d71920',
  },
  {
    border: '#475569',
    background: 'rgba(71, 85, 105, 0.16)',
    point: '#475569',
  },
  {
    border: '#94a3b8',
    background: 'rgba(148, 163, 184, 0.13)',
    point: '#94a3b8',
  },
]

function ModelRadarChart({ models = [] }) {
  const radarData = useMemo(() => {
    const validModels = (Array.isArray(models) ? models : []).filter((row) => row?.model)
    const minMae = Math.min(...validModels.map((row) => Number(row.mae)).filter(Number.isFinite))
    const minRmse = Math.min(...validModels.map((row) => Number(row.rmse)).filter(Number.isFinite))
    const minCvStd = Math.min(
      ...validModels.map((row) => Number(row.cvR2Std)).filter((value) => Number.isFinite(value) && value > 0),
    )

    return {
      labels: [
        'Faible MAE',
        'Faible RMSE',
        'Score R2',
        'Validation croisee',
        'Stabilite',
      ],
      datasets: validModels.map((row, index) => {
        const style = MODEL_STYLES[index % MODEL_STYLES.length]
        return {
          label: row.model,
          data: [
            safeRatioScore(minMae, row.mae),
            safeRatioScore(minRmse, row.rmse),
            clampScore(Number(row.r2) * 100),
            cvMeanScore(row.cvR2Mean),
            safeRatioScore(minCvStd, row.cvR2Std),
          ],
          borderColor: style.border,
          backgroundColor: style.background,
          pointBackgroundColor: style.point,
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: style.border,
          borderWidth: index === 0 ? 2.4 : 1.8,
          pointRadius: 3,
          pointHoverRadius: 5,
        }
      }),
    }
  }, [models])

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#6b7280',
            usePointStyle: true,
            boxWidth: 10,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          callbacks: {
            label(context) {
              const value = Number(context.raw)
              return `${context.dataset.label}: ${Number.isFinite(value) ? value.toFixed(1) : '-'} / 100`
            },
          },
        },
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            backdropColor: 'transparent',
            color: '#94a3b8',
            callback: (value) => `${value}`,
          },
          pointLabels: {
            color: '#374151',
            font: {
              size: 12,
              weight: '700',
            },
          },
          angleLines: {
            color: 'rgba(148, 163, 184, 0.22)',
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.24)',
          },
        },
      },
    }),
    [],
  )

  if (!radarData.datasets.length) {
    return (
      <section className="ml-chart-card ml-chart-card--full">
        <h3>Comparaison radar des modeles</h3>
        <div className="ml-chart-empty">Aucune comparaison modele disponible.</div>
      </section>
    )
  }

  return (
    <section className="ml-chart-card ml-chart-card--full">
      <h3>Comparaison radar des modeles</h3>
      <p className="ml-chart-subtitle">
        Scores normalises sur 100 : plus la surface est grande, plus le modele est performant.
      </p>
      <div className="ml-chart-wrap ml-chart-wrap--radar">
        <Radar data={radarData} options={options} />
      </div>
    </section>
  )
}

export default ModelRadarChart
