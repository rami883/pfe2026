import { useEffect, useMemo, useRef, useState } from 'react'
import { Award, Building2, Gauge } from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import '../chartSetup'
import KPIBox from '../components/KPIBox'
import ChartCard from '../components/ChartCard'
import SectionCard from '../components/SectionCard'
import { getSupplierPerformance } from '../../api/dashboardApi'

function createHorizontalBarOptions(valueLabel, onBarClick) {
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#ffffff',
        bodyColor: '#e5e7eb',
        callbacks: {
          label(context) {
            const value = Number(context.parsed.x || 0)
            return `${valueLabel}: ${value}`
          },
        },
      },
    },
    onClick(_event, elements, chart) {
      if (!elements?.length || typeof onBarClick !== 'function') {
        return
      }

      const index = elements[0].index
      const supplier = chart?.data?.labels?.[index]
      onBarClick(String(supplier || ''))
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#6b7280', precision: 0 },
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
      },
      y: {
        ticks: { color: '#1f2937', autoSkip: false },
        grid: { display: false },
      },
    },
  }
}

function toChartData(series, label) {
  return {
    labels: series.map((item) => item.supplier),
    datasets: [
      {
        label,
        data: series.map((item) => item.value),
        backgroundColor: '#d71920',
        borderRadius: 10,
      },
    ],
  }
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

function pickTopByMetric(rows, metricKey, topN, sortOrder) {
  const sortedRows = [...rows].sort((a, b) => {
    const first = Number(a[metricKey] || 0)
    const second = Number(b[metricKey] || 0)
    return sortOrder === 'asc' ? first - second : second - first
  })

  return sortedRows.slice(0, topN).map((item) => ({
    supplier: item.supplier,
    value: Number(item[metricKey] || 0),
    records: Number(item.records || 0),
  }))
}

function PerformanceFournisseursPage({ filters, refreshTick = 0 }) {
  const [payload, setPayload] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [topN, setTopN] = useState(10)
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const palletsChartRef = useRef(null)
  const trailersChartRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function loadSupplierPerformance() {
      setIsLoading(true)
      setError('')
      setSelectedSupplier('')

      try {
        const response = await getSupplierPerformance(filters)
        if (mounted) {
          setPayload(response)
        }
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError?.message || 'Impossible de charger la performance des fournisseurs.',
          )
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadSupplierPerformance()
    return () => {
      mounted = false
    }
  }, [filters, refreshTick])

  const summary = payload?.summary || {
    totalSuppliers: 0,
    topSupplier: '-',
    avgSupplierEfficiency: 0,
  }
  const suppliers = payload?.suppliers || []
  const supplierCount = suppliers.length
  const topNChoices = [5, 10, 15, 20].filter((value) => value <= supplierCount)
  const effectiveTopNChoices = topNChoices.length ? topNChoices : [Math.max(supplierCount, 1)]

  useEffect(() => {
    if (!effectiveTopNChoices.includes(topN)) {
      setTopN(effectiveTopNChoices[effectiveTopNChoices.length - 1])
    }
  }, [effectiveTopNChoices, topN])

  const topSuppliersByPallets = useMemo(
    () => pickTopByMetric(suppliers, 'totalPallets', topN, sortOrder),
    [sortOrder, suppliers, topN],
  )

  const topSuppliersByTrailers = useMemo(
    () => pickTopByMetric(suppliers, 'totalTrailers', topN, sortOrder),
    [sortOrder, suppliers, topN],
  )

  const selectedSupplierDetails = useMemo(
    () => suppliers.find((item) => item.supplier === selectedSupplier) || null,
    [selectedSupplier, suppliers],
  )

  const palletsChartData = useMemo(
    () => toChartData(topSuppliersByPallets, 'Palettes'),
    [topSuppliersByPallets],
  )

  const trailersChartData = useMemo(
    () => toChartData(topSuppliersByTrailers, 'Remorques'),
    [topSuppliersByTrailers],
  )

  const palletsOptions = useMemo(
    () => createHorizontalBarOptions('Palettes', setSelectedSupplier),
    [],
  )
  const trailersOptions = useMemo(
    () => createHorizontalBarOptions('Remorques', setSelectedSupplier),
    [],
  )
  if (isLoading) {
    return (
      <SectionCard title="Performance des fournisseurs">
        <p className="dashboard-muted">Chargement des donnees fournisseurs...</p>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard title="Performance des fournisseurs">
        <p className="dashboard-error">{error}</p>
      </SectionCard>
    )
  }

  if (
    !topSuppliersByPallets.length &&
    !topSuppliersByTrailers.length
  ) {
    return (
      <SectionCard title="Performance des fournisseurs">
        <p className="dashboard-muted">Aucune donnee fournisseur disponible.</p>
      </SectionCard>
    )
  }

  return (
    <>
      <section className="kpi-grid kpi-grid--three">
        <KPIBox
          icon={Building2}
          label="Total fournisseurs"
          value={summary.totalSuppliers}
          helper="Fournisseurs actifs"
        />
        <KPIBox
          icon={Award}
          label="Top fournisseur"
          value={summary.topSupplier}
          helper="Classe par total palettes"
        />
        <KPIBox
          icon={Gauge}
          label="Efficacite moyenne fournisseur"
          value={summary.avgSupplierEfficiency}
          helper="Pallets par remorque"
        />
      </section>

      <SectionCard title="Parametres de tri graphique">
        <div className="dashboard-inline-controls">
          <label className="dashboard-filter dashboard-filter--inline">
            <span>Tri</span>
            <div className="dashboard-filter__control">
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              >
                <option value="desc">Descendant</option>
                <option value="asc">Ascendant</option>
              </select>
            </div>
          </label>

          <label className="dashboard-filter dashboard-filter--inline">
            <span>Top N</span>
            <div className="dashboard-filter__control">
              <select
                value={topN}
                onChange={(event) => setTopN(Number(event.target.value))}
              >
                {effectiveTopNChoices.map((value) => (
                  <option key={value} value={value}>
                    {`Top ${value}`}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>
      </SectionCard>

      <section className="chart-grid chart-grid--stacked">
        <ChartCard
          title="Top fournisseurs par palettes"
          subtitle="Clique sur une barre pour drill-down"
          actions={
            <button
              type="button"
              className="dashboard-chart-btn"
              onClick={() =>
                downloadChartAsPng(
                  palletsChartRef,
                  'supplier-performance-pallets-chart.png',
                )
              }
            >
              Export PNG
            </button>
          }
        >
          <div className="chart-canvas-wrap chart-canvas-wrap--bar">
            <Bar
              key={`pallets-${sortOrder}-${topN}`}
              redraw
              ref={palletsChartRef}
              data={palletsChartData}
              options={palletsOptions}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Top fournisseurs par remorques"
          subtitle="Clique sur une barre pour drill-down"
          actions={
            <button
              type="button"
              className="dashboard-chart-btn"
              onClick={() =>
                downloadChartAsPng(
                  trailersChartRef,
                  'supplier-performance-trailers-chart.png',
                )
              }
            >
              Export PNG
            </button>
          }
        >
          <div className="chart-canvas-wrap chart-canvas-wrap--bar">
            <Bar
              key={`trailers-${sortOrder}-${topN}`}
              redraw
              ref={trailersChartRef}
              data={trailersChartData}
              options={trailersOptions}
            />
          </div>
        </ChartCard>

      </section>

      {selectedSupplierDetails ? (
        <SectionCard title={`Drill-down fournisseur: ${selectedSupplierDetails.supplier}`}>
          <div className="drilldown-grid">
            <p>
              <strong>Total palettes:</strong> {selectedSupplierDetails.totalPallets}
            </p>
            <p>
              <strong>Total remorques:</strong> {selectedSupplierDetails.totalTrailers}
            </p>
            <p>
              <strong>Moy. palettes/remorque:</strong>{' '}
              {selectedSupplierDetails.avgPalletsPerTrailer}
            </p>
            <p>
              <strong>Moyenne jours attente:</strong>{' '}
              {selectedSupplierDetails.averageWaitingDays}
            </p>
            <p>
              <strong>Enregistrements:</strong> {selectedSupplierDetails.records}
            </p>
          </div>
        </SectionCard>
      ) : null}
    </>
  )
}

export default PerformanceFournisseursPage
