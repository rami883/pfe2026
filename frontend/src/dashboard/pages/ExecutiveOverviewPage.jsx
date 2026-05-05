import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock3,
  Container,
  ListChecks,
  Package,
  Target,
  TrendingDown,
  Trophy,
} from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import '../chartSetup'
import KPIBox from '../components/KPIBox'
import ChartCard from '../components/ChartCard'
import SectionCard from '../components/SectionCard'
import DataTable from '../components/DataTable'
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

function isoWeekToDate(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = (jan4.getUTCDay() + 6) % 7
  const mondayWeek1 = new Date(jan4)
  mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day)

  const result = new Date(mondayWeek1)
  result.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7)
  return result
}

function normalizeIsoWeekLabel(value) {
  const match = String(value || '').trim().match(/^(\d{4})-W(\d{1,2})$/i)
  if (!match) {
    return String(value || '').trim()
  }

  const year = Number(match[1])
  const week = Number(match[2])
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) {
    return String(value || '').trim()
  }

  const isoWeek = String(week).padStart(2, '0')
  return `${year}-W${isoWeek}`
}

function getIsoWeekSortValue(value) {
  const match = String(value || '').trim().match(/^(\d{4})-W(\d{2})$/i)
  if (!match) {
    return Number.MAX_SAFE_INTEGER
  }
  const year = Number(match[1])
  const week = Number(match[2])
  return isoWeekToDate(year, week).getTime()
}

function dateToIsoWeekLabel(dateRaw) {
  const date = new Date(dateRaw)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = (utcDate.getUTCDay() + 6) % 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 3 - day)
  const isoYear = utcDate.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4))
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - firstThursdayDay)
  const week = 1 + Math.round((utcDate.getTime() - firstThursday.getTime()) / 604800000)
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

function fillMissingWeeks(items, valueKey) {
  if (!items.length) {
    return items
  }

  const normalized = items
    .map((item) => ({
      ...item,
      week: normalizeIsoWeekLabel(item.week),
    }))
    .sort((a, b) => getIsoWeekSortValue(a.week) - getIsoWeekSortValue(b.week))

  const firstWeek = normalized[0]?.week
  const lastWeek = normalized[normalized.length - 1]?.week
  const firstSortValue = getIsoWeekSortValue(firstWeek)
  const lastSortValue = getIsoWeekSortValue(lastWeek)
  if (!Number.isFinite(firstSortValue) || !Number.isFinite(lastSortValue)) {
    return normalized
  }

  const byWeek = new Map(normalized.map((item) => [item.week, item]))
  const cursor = new Date(firstSortValue)
  const end = new Date(lastSortValue)
  const filled = []

  while (cursor.getTime() <= end.getTime()) {
    const weekLabel = dateToIsoWeekLabel(cursor)
    const existing = byWeek.get(weekLabel)
    if (existing) {
      filled.push(existing)
    } else {
      filled.push({
        week: weekLabel,
        [valueKey]: 0,
      })
    }
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  return filled
}

function hexToRgb(hex) {
  const normalized = String(hex || '').replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 0, g: 0, b: 0 }
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function lerpColor(startHex, endHex, t) {
  const start = hexToRgb(startHex)
  const end = hexToRgb(endHex)
  const clamped = Math.max(0, Math.min(1, t))

  const r = Math.round(start.r + (end.r - start.r) * clamped)
  const g = Math.round(start.g + (end.g - start.g) * clamped)
  const b = Math.round(start.b + (end.b - start.b) * clamped)

  return `rgb(${r}, ${g}, ${b})`
}

function parseIsoWeekLabel(value) {
  const match = String(value || '').trim().match(/^(\d{4})-W(\d{2})$/i)
  if (!match) {
    return null
  }

  return { year: Number(match[1]), week: Number(match[2]) }
}

function formatMonthLabelFr(dateRaw) {
  const date = new Date(dateRaw)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const monthNames = [
    'Janv',
    'Fevr',
    'Mars',
    'Avr',
    'Mai',
    'Juin',
    'Juil',
    'Aout',
    'Sept',
    'Oct',
    'Nov',
    'Dec',
  ]
  return monthNames[date.getUTCMonth()] || ''
}

function formatWeekWithMonth(weekLabel) {
  const parsed = parseIsoWeekLabel(weekLabel)
  if (!parsed) {
    return weekLabel
  }
  
  const monday = isoWeekToDate(parsed.year, parsed.week)
  const month = formatMonthLabelFr(monday)
  return `${weekLabel} ${month}`
}

function formatDayMonthFr(dateRaw) {
  const date = new Date(dateRaw)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${day} ${formatMonthLabelFr(date)}`
}

function formatIsoWeekRangeFr(year, week) {
  const monday = isoWeekToDate(year, week)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return `${formatDayMonthFr(monday)} - ${formatDayMonthFr(sunday)} ${year}`
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
    averageWaitingDays: 0,
    onTimeUnloadingRate: 0,
    delayRate: 0,
    topSupplier: '-',
    topSupplierPallets: 0,
  }

  const trailersTableColumns = [
    { key: 'semaine', header: 'Semaine', render: formatWeekWithMonth },
    { key: 'remorques', header: 'Remorques (xi​)', render: formatNumber },
    { key: 'cumul', header: 'Cumul Progressif', render: formatNumber },
  ]

  const palletsTableColumns = [
    { key: 'semaine', header: 'Semaine', render: formatWeekWithMonth },
    { key: 'palettes', header: 'Palettes (xi​)', render: formatNumber },
    { key: 'cumul', header: 'Cumul Progressif', render: formatNumber },
  ]

  const trailersByWeek = useMemo(
    () => fillMissingWeeks(payload?.trailersByWeek || [], 'trailers'),
    [payload?.trailersByWeek],
  )

  const palletsByWeek = useMemo(
    () => fillMissingWeeks(payload?.palletsByWeek || [], 'pallets'),
    [payload?.palletsByWeek],
  )

  const selectedWeekInsights = useMemo(() => {
    if (!selectedWeek) {
      return null
    }

    const trailersItem = trailersByWeek.find((item) => item.week === selectedWeek)
    const palletsItem = palletsByWeek.find((item) => item.week === selectedWeek)

    if (!trailersItem && !palletsItem) {
      return null
    }

    return {
      week: selectedWeek,
      trailers: trailersItem?.trailers || 0,
      pallets: palletsItem?.pallets || 0,
    }
  }, [selectedWeek, trailersByWeek, palletsByWeek])

  const trailersLineData = useMemo(
    () => {
      const count = trailersByWeek.length
      const colors = trailersByWeek.map((_item, index) => {
        const ratio = count > 1 ? index / (count - 1) : 0
        return lerpColor('#f5c2c5', '#8b0000', ratio)
      })

      return {
        labels: trailersByWeek.map((item) => item.week),
        datasets: [
          {
            label: 'Remorques',
            data: trailersByWeek.map((item) => item.trailers),
            borderColor: '#8b0000',
            backgroundColor: colors,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.78,
            categoryPercentage: 0.88,
          },
        ],
      }
    },
    [trailersByWeek],
  )

  const palletsLineData = useMemo(
    () => {
      const count = palletsByWeek.length
      const colors = palletsByWeek.map((_item, index) => {
        const ratio = count > 1 ? index / (count - 1) : 0
        return lerpColor('#f9d7d9', '#9f0f14', ratio)
      })

      return {
        labels: palletsByWeek.map((item) => item.week),
        datasets: [
          {
            label: 'Palettes',
            data: palletsByWeek.map((item) => item.pallets),
            borderColor: '#9f0f14',
            backgroundColor: colors,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.78,
            categoryPercentage: 0.88,
          },
        ],
      }
    },
    [palletsByWeek],
  )

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.98)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#ffffff',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
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

  const trailersMonthTicks = useMemo(() => {
    let previousMonth = ''
    return trailersByWeek.map((item, index) => {
      const parsed = parseIsoWeekLabel(item.week)
      if (!parsed) {
        return index === 0 ? item.week : ''
      }

      const monday = isoWeekToDate(parsed.year, parsed.week)
      const currentMonth = `${monday.getUTCFullYear()}-${monday.getUTCMonth()}`
      if (index === 0 || currentMonth !== previousMonth) {
        previousMonth = currentMonth
        return formatMonthLabelFr(monday)
      }
      previousMonth = currentMonth
      return ''
    })
  }, [trailersByWeek])

  const palletsMonthTicks = useMemo(() => {
    let previousMonth = ''
    return palletsByWeek.map((item, index) => {
      const parsed = parseIsoWeekLabel(item.week)
      if (!parsed) {
        return index === 0 ? item.week : ''
      }

      const monday = isoWeekToDate(parsed.year, parsed.week)
      const currentMonth = `${monday.getUTCFullYear()}-${monday.getUTCMonth()}`
      if (index === 0 || currentMonth !== previousMonth) {
        previousMonth = currentMonth
        return formatMonthLabelFr(monday)
      }
      previousMonth = currentMonth
      return ''
    })
  }, [palletsByWeek])

  const trailerWeekSummary = useMemo(() => {
    const totalGlobal = trailersByWeek.reduce((sum, item) => sum + (Number(item.trailers) || 0), 0)
    const nbSemaines = trailersByWeek.length
    const peak = trailersByWeek.reduce(
      (best, item) => ((item.trailers || 0) > (best?.trailers || -1) ? item : best),
      null,
    )

    let peakLabel = '-'
    if (peak?.week) {
      const parsed = parseIsoWeekLabel(peak.week)
      if (parsed) {
        peakLabel = `Sem ${parsed.week} (${formatIsoWeekRangeFr(parsed.year, parsed.week)})`
      }
    }

    return {
      totalGlobal,
      nbSemaines,
      peakLabel,
    }
  }, [trailersByWeek])

  const trailersTableData = useMemo(() => {
    let cumulative = 0
    return trailersByWeek.map((item) => {
      cumulative += Number(item.trailers) || 0
      return {
        semaine: item.week,
        remorques: item.trailers,
        cumul: cumulative,
      }
    })
  }, [trailersByWeek])

  const palletsTableData = useMemo(() => {
    let cumulative = 0
    return palletsByWeek.map((item) => {
      cumulative += Number(item.pallets) || 0
      return {
        semaine: item.week,
        palettes: item.pallets,
        cumul: cumulative,
      }
    })
  }, [palletsByWeek])

  const palletsWeekSummary = useMemo(() => {
    const totalGlobal = palletsByWeek.reduce((sum, item) => sum + (Number(item.pallets) || 0), 0)
    const nbSemaines = palletsByWeek.length
    const peak = palletsByWeek.reduce(
      (best, item) => ((item.pallets || 0) > (best?.pallets || -1) ? item : best),
      null,
    )

    let peakLabel = '-'
    if (peak?.week) {
      const parsed = parseIsoWeekLabel(peak.week)
      if (parsed) {
        peakLabel = `Sem ${parsed.week} (${formatIsoWeekRangeFr(parsed.year, parsed.week)})`
      }
    }

    return {
      totalGlobal,
      nbSemaines,
      peakLabel,
    }
  }, [palletsByWeek])

  const trailersChartOptions = useMemo(
    () => ({
      ...lineOptions,
      scales: {
        ...lineOptions.scales,
        x: {
          ...lineOptions.scales.x,
          ticks: {
            ...lineOptions.scales.x.ticks,
            callback(value, index) {
              return trailersMonthTicks[index] || ''
            },
            maxRotation: 0,
            autoSkip: false,
          },
          grid: {
            ...lineOptions.scales.x.grid,
            drawTicks: false,
          },
        },
      },
    }),
    [lineOptions, trailersMonthTicks],
  )

  const palletsChartOptions = useMemo(
    () => ({
      ...lineOptions,
      scales: {
        ...lineOptions.scales,
        x: {
          ...lineOptions.scales.x,
          ticks: {
            ...lineOptions.scales.x.ticks,
            callback(value, index) {
              return palletsMonthTicks[index] || ''
            },
            maxRotation: 0,
            autoSkip: false,
          },
          grid: {
            ...lineOptions.scales.x.grid,
            drawTicks: false,
          },
        },
      },
    }),
    [lineOptions, palletsMonthTicks],
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

  if (!trailersByWeek.length && !palletsByWeek.length) {
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

      <section className="chart-grid chart-grid--stacked">
        <ChartCard
          title={<span className="weekly-trailers-title">Nombre de remorques par semaine</span>}
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
          <section className="kpi-grid kpi-grid--three weekly-summary-grid">
            <article className="weekly-summary-card">
              <p className="weekly-summary-card__label">TOTAL GLOBAL</p>
              <strong className="weekly-summary-card__value">
                {formatNumber(trailerWeekSummary.totalGlobal)}
              </strong>
            </article>
            <article className="weekly-summary-card">
              <p className="weekly-summary-card__label">NB SEMAINES</p>
              <strong className="weekly-summary-card__value">
                {formatNumber(trailerWeekSummary.nbSemaines)}
              </strong>
            </article>
            <article className="weekly-summary-card">
              <p className="weekly-summary-card__label">SEMAINE DE POINTE</p>
              <strong className="weekly-summary-card__value">{trailerWeekSummary.peakLabel}</strong>
            </article>
          </section>
          <div className="chart-canvas-wrap">
            <Bar ref={trailersChartRef} data={trailersLineData} options={trailersChartOptions} />
          </div>
          <DataTable
            columns={trailersTableColumns}
            rows={trailersTableData}
            emptyMessage="Aucune donnée disponible"
          />
        </ChartCard>

        <ChartCard
          title={<span className="weekly-trailers-title">Nombre de palettes par semaine</span>}
          actions={
            <button
              type="button"
              className="dashboard-chart-btn"
              onClick={() =>
                downloadChartAsPng(
                  palletsChartRef,
                  'executive-pallets-by-week.png',
                )
              }
            >
              Export PNG
            </button>
          }
        >
          <section className="kpi-grid kpi-grid--three weekly-summary-grid">
            <article className="weekly-summary-card">
              <p className="weekly-summary-card__label">TOTAL GLOBAL</p>
              <strong className="weekly-summary-card__value">
                {formatNumber(palletsWeekSummary.totalGlobal)}
              </strong>
            </article>
            <article className="weekly-summary-card">
              <p className="weekly-summary-card__label">NB SEMAINES</p>
              <strong className="weekly-summary-card__value">
                {formatNumber(palletsWeekSummary.nbSemaines)}
              </strong>
            </article>
            <article className="weekly-summary-card">
              <p className="weekly-summary-card__label">SEMAINE DE POINTE</p>
              <strong className="weekly-summary-card__value">{palletsWeekSummary.peakLabel}</strong>
            </article>
          </section>
          <div className="chart-canvas-wrap">
            <Bar ref={palletsChartRef} data={palletsLineData} options={palletsChartOptions} />
          </div>
          <DataTable
            columns={palletsTableColumns}
            rows={palletsTableData}
            emptyMessage="Aucune donnée disponible"
          />
        </ChartCard>
      </section>

      {selectedWeekInsights ? (
        <SectionCard title={`Drill-down semaine ${selectedWeekInsights.week}`}>
          <div className="drilldown-grid">
            <p>
              <strong>Remorques:</strong> {formatNumber(selectedWeekInsights.trailers)}
            </p>
            <p>
              <strong>Palettes:</strong> {formatNumber(selectedWeekInsights.pallets)}
            </p>
          </div>
        </SectionCard>
      ) : null}
    </>
  )
}

export default ExecutiveOverviewPage
