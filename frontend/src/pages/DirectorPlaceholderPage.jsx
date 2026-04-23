import { useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { useAuth } from '../auth/useAuth'
import { getSupplierStats } from '../api/dashboardApi'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title)

function DirectorPlaceholderPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const [days, setDays] = useState(365)
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadSupplierData() {
      setIsLoading(true)
      setError('')

      try {
        const supplierData = await getSupplierStats(days)

        if (mounted) {
          setRows(Array.isArray(supplierData) ? supplierData : [])
        }
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError?.message ||
              'Impossible de charger les donnees dashboard.',
          )
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadSupplierData()

    return () => {
      mounted = false
    }
  }, [days])

  const topRows = useMemo(() => {
    return [...rows]
      .map((row) => ({
        supplier: String(row?.supplier || '-').trim() || '-',
        totalPallets: Number(row?.totalPallets) || 0,
        records: Number(row?.records) || 0,
      }))
      .sort((a, b) => b.totalPallets - a.totalPallets)
      .slice(0, 10)
  }, [rows])

  const chartData = useMemo(
    () => ({
      labels: topRows.map((row) => row.supplier),
      datasets: [
        {
          label: 'Nombre de palettes',
          data: topRows.map((row) => row.totalPallets),
          backgroundColor: '#c81e1e',
          borderRadius: 8,
          barThickness: 18,
        },
      ],
    }),
    [topRows],
  )

  const supplierChartOptions = useMemo(
    () => ({
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Top 10 fournisseurs par nombre de palettes',
          color: '#0f172a',
          font: {
            size: 15,
            weight: '700',
          },
          padding: {
            top: 4,
            bottom: 16,
          },
        },
        tooltip: {
          callbacks: {
            title(tooltipItems) {
              const index = tooltipItems?.[0]?.dataIndex ?? 0
              return topRows[index]?.supplier || '-'
            },
            label(context) {
              const palettes = Number(context.parsed.x || 0)
              return `Palettes: ${palettes}`
            },
            afterLabel(context) {
              const index = context?.dataIndex ?? 0
              const records = topRows[index]?.records || 0
              return `Enregistrements: ${records}`
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: '#475569',
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.25)',
          },
        },
        y: {
          ticks: {
            autoSkip: false,
            color: '#0f172a',
            callback(_value, index) {
              const label = topRows[index]?.supplier || ''
              if (label.length <= 26) {
                return label
              }

              return `${label.slice(0, 26)}...`
            },
          },
          grid: { display: false },
        },
      },
    }),
    [topRows],
  )

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <main className="portal-shell">
      <section className="portal-hero">
        <span className="portal-badge">
          <LayoutDashboard size={16} aria-hidden="true" />
          Espace direction
        </span>
        <h1>Dashboard Directeur</h1>
        <p>
          Bienvenue {user?.email || 'Directeur'}. Nombre de pallets par
          fournisseur sur la periode selectionnee.
        </p>
      </section>

      <section className="portal-card approval-card">
        <div className="approval-header">
          <label className="director-filter">
            <span>Periode</span>
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              <option value={7}>7 jours</option>
              <option value={30}>30 jours</option>
              <option value={90}>90 jours</option>
              <option value={365}>365 jours</option>
            </select>
          </label>

          <button
            type="button"
            className="primary-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <span className="button-content">
              <LogOut size={16} aria-hidden="true" />
              {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
            </span>
          </button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {isLoading ? <p className="field-hint">Chargement...</p> : null}

        {!isLoading && !error && !topRows.length ? (
          <p className="field-hint">
            Aucune donnee fournisseur trouvee pour cette periode.
          </p>
        ) : null}

        {!isLoading && !error && topRows.length ? (
          <div className="supplier-chart-wrap">
            <Bar data={chartData} options={supplierChartOptions} />
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default DirectorPlaceholderPage
