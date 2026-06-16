import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import '../chartSetup'
import ChartCard from '../components/ChartCard'
import SectionCard from '../components/SectionCard'
import { getOperationsMonitoring } from '../../api/dashboardApi'
//downlload PNG
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

function SuiviReceptionsPage({ filters, refreshTick = 0 }) {
  const [payload, setPayload] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const receptionsDayRef = useRef(null)
  const receptionsWeekRef = useRef(null)
  const arrivalsHourRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function loadOperationsData() {
      setIsLoading(true)
      setError('')

      try {
        const response = await getOperationsMonitoring(filters)
        if (mounted) {
          setPayload(response)
        }
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError?.message || 'Impossible de charger le suivi des receptions.',
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

  const receptionsAndPalletsByDayData = useMemo(
    () => ({
      labels: receptionsByDay.map((item) => item.day),
      datasets: [
        {
          type: 'bar',
          label: 'Receptions',
          data: receptionsByDay.map((item) => item.count),
          backgroundColor: 'rgba(127, 11, 16, 0.32)',
          borderColor: '#7f0b10',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'Palettes',
          data: receptionsByDay.map((item) => Number(item.pallets || 0)),
          borderColor: '#9f0f14',
          backgroundColor: 'rgba(159, 15, 20, 0.18)',
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    }),
    [receptionsByDay],
  )

  const receptionsAndPalletsByDayOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#ffffff',
          bodyColor: '#e5e7eb',
        },
      },
      scales: {
        x: {
          ticks: { color: '#6b7280' },
          grid: { color: 'rgba(148, 163, 184, 0.18)' },
        },
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          ticks: { color: '#6b7280', precision: 0 },
          grid: { color: 'rgba(148, 163, 184, 0.18)' },
          title: { display: true, text: 'Receptions' },
        },
        y1: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          ticks: { color: '#6b7280', precision: 0 },
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Palettes' },
        },
      },
    }),
    [],
  )

  const receptionsByWeekData = useMemo(
    () => ({
      labels: receptionsByWeek.map((item) => item.week),
      datasets: [
        {
          label: 'Receptions',
          data: receptionsByWeek.map((item) => item.count),
          borderColor: '#7f0b10',
          backgroundColor: 'rgba(127, 11, 16, 0.32)',
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
          label: 'Arrivees',
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

  const latestArrivalDay = useMemo(() => {
    const firstWithDate = recentShipments.find((item) => String(item?.arrivalDate || '').trim())
    return firstWithDate ? String(firstWithDate.arrivalDate).trim() : ''
  }, [recentShipments])

  const lastDayReceptions = useMemo(
    () =>
      recentShipments.filter(
        (item) => String(item?.arrivalDate || '').trim() === latestArrivalDay,
      ),
    [recentShipments, latestArrivalDay],
  )

  const receptionsTimelineData = useMemo(
    () => ({
      labels: lastDayReceptions.map(() => latestArrivalDay || '-'),
      datasets: [
        {
          label: 'Palettes',
          data: lastDayReceptions.map((item) => Number(item.pallets || 0)),
          receptionTimes: lastDayReceptions.map((item) => String(item.arrivalTime || '-').trim()),
          backgroundColor: 'rgba(127, 11, 16, 0.32)',
          borderColor: '#7f0b10',
          borderWidth: 1,
        },
      ],
    }),
    [lastDayReceptions, latestArrivalDay],
  )

  const receptionsTimelineOptions = useMemo(() => {
    const options = baseAxisOptions()
    options.plugins = {
      ...(options.plugins || {}),
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#ffffff',
        bodyColor: '#e5e7eb',
        callbacks: {
          title(items) {
            return items?.[0]?.label || latestArrivalDay || '-'
          },
          label(context) {
            const value = Number(context?.raw || 0)
            const time =
              context?.dataset?.receptionTimes?.[context?.dataIndex] || '-'
            return `Heure: ${time} | Palettes: ${value}`
          },
        },
      },
    }
    return options
  }, [latestArrivalDay])

  if (isLoading) {
    return (
      <SectionCard title="Suivi des réceptions">
        <p className="dashboard-muted">Chargement des donnees operations...</p>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard title="Suivi des réceptions">
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
      <SectionCard title="Suivi des réceptions">
        <p className="dashboard-muted">Aucune donnee operationnelle disponible.</p>
      </SectionCard>
    )
  }

  return (
    <>  
      <section className="chart-grid chart-grid--operations">
        <ChartCard
          title="Receptions et palettes par date d'arrivee"
          subtitle="Vue combinee par jour"
          actions={
            <button
              type="button"
              className="dashboard-chart-btn"
              onClick={() =>
                downloadChartAsPng(
                  receptionsDayRef,
                  'operations-receptions-and-pallets-by-day.png',
                )
              }
            >
              Export PNG
            </button>
          }
        >
          <div className="chart-canvas-wrap">
            <Bar
              ref={receptionsDayRef}
              data={receptionsAndPalletsByDayData}
              options={receptionsAndPalletsByDayOptions}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Nouvelles receptions: palettes et heure d'arrivee"
          subtitle="Dernier jour d'arrivee uniquement"
        >
          <div className="chart-canvas-wrap">
            <Bar data={receptionsTimelineData} options={receptionsTimelineOptions} />
          </div>
        </ChartCard>

        <ChartCard
          title="Arrivees de remorques par heure"
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

        <ChartCard title="Repartition type de vehicule">
          <div className="chart-canvas-wrap chart-canvas-wrap--doughnut">
            <Doughnut data={vehicleTypeData} options={doughnutOptions()} />
          </div>
        </ChartCard>

        <ChartCard title="Repartition origine">
          <div className="chart-canvas-wrap chart-canvas-wrap--doughnut">
            <Doughnut data={originData} options={doughnutOptions()} />
          </div>
        </ChartCard>
      </section>
    </>
  )
}

export default SuiviReceptionsPage
