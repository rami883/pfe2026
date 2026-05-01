import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock3,
  Container,
  ListChecks,
  Package,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { Line } from 'react-chartjs-2'
import '../chartSetup'
import KPIBox from '../components/KPIBox'
import ChartCard from '../components/ChartCard'
import SectionCard from '../components/SectionCard'
import { getExecutiveOverview } from '../../api/dashboardApi'

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function downloadChartAsPng(chartRef, fileName) {
  const chartInstance = chartRef?.current
  if (!chartInstance) {
    return
  }

  const link = document.createElement('a')
  link.href = chartInstance.toBase64Image()
  link.download = fileName
  link.click()
}

function ExecutiveOverviewPage({ filters, refreshTick = 0 }) {
  const [payload, setPayload] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedWeek, setSelectedWeek] = useState('')
  const trailersChartRef = useRef(null)
  const palletsChartRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function loadExecutiveData() {
      setIsLoading(true)
      setError('')
      setSelectedWeek('')

      try {
        const response = await getExecutiveOverview(filters)
        if (mounted) {
          setPayload(response)
        }
      } catch (requestError) {
        if (mounted) {
          setError(requestError?.message || 'Impossible de charger la vue executive.')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadExecutiveData()
    return () => {
      mounted = false
    }
  }, [filters, refreshTick])

  const kpis = payload?.kpis || {
    totalPallets: 0,
    totalReceptions: 0,
    totalTrailers: 0,
    palletsPerTrailer: 0,
    averageWaitingDays: 0,
    onTimeUnloadingRate: 0,
    delayRate: 0,
    topSupplier: '-',
    topSupplierPallets: 0,
  }

  const trailersByWeek = payload?.trailersByWeek || []
  const palletsPerTrailerByWeek = payload?.palletsPerTrailerByWeek || []

  const selectedWeekInsights = useMemo(() => {
    if (!selectedWeek) {
      return null
    }

    const trailersItem = trailersByWeek.find((item) => item.week === selectedWeek)
    const palletsItem = palletsPerTrailerByWeek.find((item) => item.week === selectedWeek)

    if (!trailersItem && !palletsItem) {
      return null
    }

    return {
      week: selectedWeek,
      trailers: trailersItem?.trailers || 0,
      palletsPerTrailer: palletsItem?.palletsPerTrailer || 0,
      estimatedPallets: Number(
        ((trailersItem?.trailers || 0) * (palletsItem?.palletsPerTrailer || 0)).toFixed(2),
      ),
    }
  }, [selectedWeek, trailersByWeek, palletsPerTrailerByWeek])

  const trailersLineData = useMemo(
    () => ({
      labels: trailersByWeek.map((item) => item.week),
      datasets: [
        {
          label: 'Remorques',
          data: trailersByWeek.map((item) => item.trailers),
          borderColor: '#d71920',
          backgroundColor: 'rgba(215, 25, 32, 0.14)',
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.3,
        },
      ],
    }),
    [trailersByWeek],
  )

  const palletsLineData = useMemo(
    () => ({
      labels: palletsPerTrailerByWeek.map((item) => item.week),
      datasets: [
        {
          label: 'Palettes / remorque',
          data: palletsPerTrailerByWeek.map((item) => item.palletsPerTrailer),
          borderColor: '#b51218',
          backgroundColor: 'rgba(181, 18, 24, 0.1)',
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.35,
        },
      ],
    }),
    [palletsPerTrailerByWeek],
  )

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#ffffff',
          bodyColor: '#e5e7eb',
          padding: 10,
          cornerRadius: 8,
        },
      },
      onClick(_event, elements, chart) {
        if (!elements?.length) {
          return
        }
        const index = elements[0].index
        const label = chart?.data?.labels?.[index]
        if (label) {
          setSelectedWeek(String(label))
        }
      },
      scales: {
        x: {
          ticks: { color: '#6b7280' },
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#6b7280' },
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
        },
      },
    }),
    [],
  )

  if (isLoading) {
    return (
      <SectionCard title="Vue executive">
        <p className="dashboard-muted">Chargement des indicateurs...</p>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard title="Vue executive">
        <p className="dashboard-error">{error}</p>
      </SectionCard>
    )
  }

  if (!trailersByWeek.length && !palletsPerTrailerByWeek.length) {
    return (
      <SectionCard title="Vue executive">
        <p className="dashboard-muted">Aucune donnee disponible pour cette periode.</p>
      </SectionCard>
    )
  }

  return (
    <>
      <section className="kpi-grid kpi-grid--six">
        <KPIBox
          icon={Package}
          label="Total palettes"
          value={formatNumber(kpis.totalPallets)}
          helper="Pallets recues sur la periode"
        />
        <KPIBox
          icon={ListChecks}
          label="Total Receptions"
          value={formatNumber(kpis.totalReceptions)}
          helper="Enregistrements receptions"
        />
        <KPIBox
          icon={Container}
          label="Total remorques"
          value={formatNumber(kpis.totalTrailers)}
          helper="Remorques enregistrees"
        />
        <KPIBox
          icon={TrendingUp}
          label="Palettes par remorque"
          value={kpis.palletsPerTrailer}
          helper="Moyenne de chargement"
        />
        <KPIBox
          icon={Clock3}
          label="Moyenne jours attente"
          value={kpis.averageWaitingDays}
          helper="Delai moyen avant dechargement"
        />
        <KPIBox
          icon={Target}
          label="Taux de dechargement a temps"
          value={`${kpis.onTimeUnloadingRate}%`}
          helper="Attente <= 1 jour"
        />
        <KPIBox
          icon={TrendingDown}
          label="Taux de retard"
          value={`${kpis.delayRate}%`}
          helper="Attente > 2 jours"
        />
      </section>

      <section className="kpi-grid kpi-grid--two">
        <KPIBox
          icon={Trophy}
          label="Top fournisseur"
          value={kpis.topSupplier}
          helper={`${formatNumber(kpis.topSupplierPallets)} palettes`}
        />
      </section>

      <section className="chart-grid chart-grid--two">
        <ChartCard
          title="Remorques par semaine"
          subtitle="Evolution hebdomadaire des receptions"
          actions={
            <button
              type="button"
              className="dashboard-chart-btn"
              onClick={() =>
                downloadChartAsPng(trailersChartRef, 'executive-trailers-by-week.png')
              }
            >
              Export PNG
            </button>
          }
        >
          <div className="chart-canvas-wrap">
            <Line ref={trailersChartRef} data={trailersLineData} options={lineOptions} />
          </div>
        </ChartCard>

        <ChartCard
          title="Palettes par remorque par semaine"
          subtitle="Suivi de l'efficacite de remplissage"
          actions={
            <button
              type="button"
              className="dashboard-chart-btn"
              onClick={() =>
                downloadChartAsPng(
                  palletsChartRef,
                  'executive-pallets-per-trailer-by-week.png',
                )
              }
            >
              Export PNG
            </button>
          }
        >
          <div className="chart-canvas-wrap">
            <Line ref={palletsChartRef} data={palletsLineData} options={lineOptions} />
          </div>
        </ChartCard>
      </section>

      {selectedWeekInsights ? (
        <SectionCard title={`Drill-down semaine ${selectedWeekInsights.week}`}>
          <div className="drilldown-grid">
            <p>
              <strong>Remorques:</strong> {formatNumber(selectedWeekInsights.trailers)}
            </p>
            <p>
              <strong>Palettes/remorque:</strong> {selectedWeekInsights.palletsPerTrailer}
            </p>
            <p>
              <strong>Pallets estimes:</strong>{' '}
              {formatNumber(selectedWeekInsights.estimatedPallets)}
            </p>
          </div>
        </SectionCard>
      ) : null}
    </>
  )
}

export default ExecutiveOverviewPage
