import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import '../chartSetup'
import ChartCard from '../components/ChartCard'
import DataTable from '../components/DataTable'
import SectionCard from '../components/SectionCard'
import { getOperationsMonitoring } from '../../api/dashboardApi'

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

function baseAxisOptions(onChartClick) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#ffffff',
        bodyColor: '#e5e7eb',
      },
    },
    onClick(_event, elements, chart) {
      if (!elements?.length || typeof onChartClick !== 'function') {
        return
      }

      const index = elements[0].index
      const label = chart?.data?.labels?.[index]
      onChartClick(String(label || ''))
    },
    scales: {
      x: {
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0 },
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
      },
    },
  }
}

function doughnutOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#374151',
          usePointStyle: true,
          boxWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#ffffff',
        bodyColor: '#e5e7eb',
      },
    },
    cutout: '62%',
  }
}

function OperationsMonitoringPage({ filters, refreshTick = 0 }) {
  const [payload, setPayload] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const receptionsDayRef = useRef(null)
  const receptionsWeekRef = useRef(null)
  const arrivalsHourRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function loadOperationsData() {
      setIsLoading(true)
      setError('')
      setSelectedDay('')

      try {
        const response = await getOperationsMonitoring(filters)
        if (mounted) {
          setPayload(response)
        }
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError?.message || 'Impossible de charger Operations Monitoring.',
          )
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadOperationsData()
    return () => {
      mounted = false
    }
  }, [filters, refreshTick])

  const receptionsByDay = payload?.receptionsByDay || []
  const receptionsByWeek = payload?.receptionsByWeek || []
  const arrivalsByHour = payload?.arrivalsByHour || []
  const vehicleTypeDistribution = payload?.vehicleTypeDistribution || []
  const originDistribution = payload?.originDistribution || []
  const recentShipments = payload?.recentShipments || []

  const visibleShipments = useMemo(() => {
    if (!selectedDay) {
      return recentShipments
    }

    return recentShipments.filter((item) => item.arrivalDate === selectedDay)
  }, [recentShipments, selectedDay])

  const receptionsByDayData = useMemo(
    () => ({
      labels: receptionsByDay.map((item) => item.day),
      datasets: [
        {
          label: 'Receptions',
          data: receptionsByDay.map((item) => item.count),
          borderColor: '#d71920',
          backgroundColor: 'rgba(215, 25, 32, 0.14)',
          fill: true,
          tension: 0.3,
        },
      ],
    }),
    [receptionsByDay],
  )

  const receptionsByWeekData = useMemo(
    () => ({
      labels: receptionsByWeek.map((item) => item.week),
      datasets: [
        {
          label: 'Receptions',
          data: receptionsByWeek.map((item) => item.count),
          borderColor: '#b51218',
          backgroundColor: 'rgba(181, 18, 24, 0.1)',
          fill: true,
          tension: 0.28,
        },
      ],
    }),
    [receptionsByWeek],
  )

  const arrivalsByHourData = useMemo(
    () => ({
      labels: arrivalsByHour.map((item) => item.hour),
      datasets: [
        {
          label: 'Arrivals',
          data: arrivalsByHour.map((item) => item.count),
          backgroundColor: '#d71920',
          borderRadius: 8,
        },
      ],
    }),
    [arrivalsByHour],
  )

  const vehicleTypeData = useMemo(
    () => ({
      labels: vehicleTypeDistribution.map((item) => item.label),
      datasets: [
        {
          data: vehicleTypeDistribution.map((item) => item.value),
          backgroundColor: ['#d71920', '#f59ca0'],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    }),
    [vehicleTypeDistribution],
  )

  const originData = useMemo(
    () => ({
      labels: originDistribution.map((item) => item.label),
      datasets: [
        {
          data: originDistribution.map((item) => item.value),
          backgroundColor: ['#b51218', '#f26d73'],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    }),
    [originDistribution],
  )

  const tableColumns = useMemo(
    () => [
      { key: 'recordNo', header: 'Record No' },
      { key: 'supplier', header: 'Supplier' },
      { key: 'arrivalDate', header: 'Arrival Date' },
      { key: 'arrivalTime', header: 'Arrival Time' },
      { key: 'pallets', header: 'Pallets' },
      { key: 'vehicleType', header: 'Vehicle Type' },
      { key: 'origin', header: 'Origin' },
      { key: 'waitingDays', header: 'Waiting Days' },
      {
        key: 'status',
        header: 'Status',
        render(value) {
          return (
            <span
              className={`status-pill status-pill--${value
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
            >
              {value}
            </span>
          )
        },
      },
    ],
    [],
  )

  if (isLoading) {
    return (
      <SectionCard title="Operations Monitoring">
        <p className="dashboard-muted">Chargement des donnees operations...</p>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard title="Operations Monitoring">
        <p className="dashboard-error">{error}</p>
      </SectionCard>
    )
  }

  if (
    !receptionsByDay.length &&
    !receptionsByWeek.length &&
    !arrivalsByHour.length &&
    !recentShipments.length
  ) {
    return (
      <SectionCard title="Operations Monitoring">
        <p className="dashboard-muted">Aucune donnee operationnelle disponible.</p>
      </SectionCard>
    )
  }

  return (
    <>
      <section className="chart-grid chart-grid--operations">
        <ChartCard
          title="Trailer Receptions by Day"
          subtitle="Clique sur un point pour filtrer la table"
          actions={
            <button
              type="button"
              className="dashboard-chart-btn"
              onClick={() =>
                downloadChartAsPng(receptionsDayRef, 'operations-receptions-by-day.png')
              }
            >
              Export PNG
            </button>
          }
        >
          <div className="chart-canvas-wrap">
            <Line
              ref={receptionsDayRef}
              data={receptionsByDayData}
              options={baseAxisOptions(setSelectedDay)}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Trailer Receptions by Week"
          actions={
            <button
              type="button"
              className="dashboard-chart-btn"
              onClick={() =>
                downloadChartAsPng(receptionsWeekRef, 'operations-receptions-by-week.png')
              }
            >
              Export PNG
            </button>
          }
        >
          <div className="chart-canvas-wrap">
            <Line
              ref={receptionsWeekRef}
              data={receptionsByWeekData}
              options={baseAxisOptions()}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Trailer Arrivals by Hour"
          actions={
            <button
              type="button"
              className="dashboard-chart-btn"
              onClick={() =>
                downloadChartAsPng(arrivalsHourRef, 'operations-arrivals-by-hour.png')
              }
            >
              Export PNG
            </button>
          }
        >
          <div className="chart-canvas-wrap">
            <Bar ref={arrivalsHourRef} data={arrivalsByHourData} options={baseAxisOptions()} />
          </div>
        </ChartCard>

        <ChartCard title="Vehicle Type Distribution">
          <div className="chart-canvas-wrap chart-canvas-wrap--doughnut">
            <Doughnut data={vehicleTypeData} options={doughnutOptions()} />
          </div>
        </ChartCard>

        <ChartCard title="Origin Distribution">
          <div className="chart-canvas-wrap chart-canvas-wrap--doughnut">
            <Doughnut data={originData} options={doughnutOptions()} />
          </div>
        </ChartCard>
      </section>

      <SectionCard title="Recent Shipment / Reception Table">
        {selectedDay ? (
          <div className="dashboard-inline-controls">
            <p className="dashboard-muted">
              Drill-down actif sur la date: <strong>{selectedDay}</strong>
            </p>
            <button
              type="button"
              className="dashboard-clear-btn dashboard-clear-btn--small"
              onClick={() => setSelectedDay('')}
            >
              Retirer le drill-down
            </button>
          </div>
        ) : null}
        <DataTable
          columns={tableColumns}
          rows={visibleShipments}
          emptyMessage="Aucune reception recente disponible."
        />
      </SectionCard>
    </>
  )
}

export default OperationsMonitoringPage
