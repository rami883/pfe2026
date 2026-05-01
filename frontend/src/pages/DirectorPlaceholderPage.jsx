import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  BellRing,
  FileText,
  LayoutDashboard,
  LineChart,
  Settings,
  Trash2,
  Truck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  getOriginOptions,
  getReceptionAlerts,
  getSupplierOptions,
  getVehicleTypeOptions,
} from '../api/dashboardApi'
import DashboardLayout from '../dashboard/components/DashboardLayout'
import SectionCard from '../dashboard/components/SectionCard'
import ExecutiveOverviewPage from '../dashboard/pages/ExecutiveOverviewPage'
import OperationsMonitoringPage from '../dashboard/pages/OperationsMonitoringPage'
import ReportsPage from '../dashboard/pages/ReportsPage'
import SupplierPerformancePage from '../dashboard/pages/SupplierPerformancePage'
import '../dashboard/dashboard.css'

const BASE_NAV_ITEMS = [
  { id: 'executive', label: 'Vue executive', icon: LayoutDashboard },
  { id: 'suppliers', label: 'Fournisseurs', icon: Truck },
  { id: 'operations', label: 'Operations', icon: Activity },
  { id: 'analytics', label: 'Analytique', icon: LineChart },
  { id: 'reports', label: 'Rapports', icon: FileText },
  { id: 'alerts', label: 'Alertes', icon: BellRing },
  { id: 'settings', label: 'Parametres', icon: Settings },
]

const PERIOD_OPTIONS = [
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
  { value: 90, label: '90 jours' },
  { value: 180, label: '180 jours' },
  { value: 365, label: '365 jours' },
]

function createDefaultFilters() {
  return {
    days: 365,
    fromDate: '',
    toDate: '',
    suppliers: [],
    origin: 'All',
    vehicleType: 'All',
  }
}

const PAGE_CONTENT = {
  executive: {
    title: 'Vue executive',
    subtitle:
      'Vue globale des performances logistiques et de la productivite hebdomadaire.',
  },
  suppliers: {
    title: 'Performance fournisseurs',
    subtitle: 'Analyse comparative des fournisseurs par volume, remorques et efficacite.',
  },
  operations: {
    title: 'Suivi des operations',
    subtitle: 'Pilotage quotidien des receptions, flux horaires et dernieres operations.',
  },
  analytics: {
    title: 'Analytique',
    subtitle: "Module d'analyse avancee en cours de configuration.",
  },
  reports: {
    title: 'Rapports',
    subtitle: 'Centre de reporting corporate en preparation.',
  },
  alerts: {
    title: 'Alertes',
    subtitle: 'Nouvelles receptions envoyees par les gestionnaires.',
  },
  settings: {
    title: 'Parametres',
    subtitle: 'Parametres de la plateforme dashboard.',
  },
}

const DISMISSED_ALERTS_STORAGE_KEY = 'pfe_director_dismissed_alert_ids'

function getDismissedAlertIds() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(DISMISSED_ALERTS_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.map((value) => String(value || '').trim()).filter(Boolean)
      : []
  } catch {
    return []
  }
}

function saveDismissedAlertIds(ids = []) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    DISMISSED_ALERTS_STORAGE_KEY,
    JSON.stringify(ids.slice(-500)),
  )
}

function DirectorPlaceholderPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const [activeView, setActiveView] = useState('executive')
  const [filters, setFilters] = useState(createDefaultFilters)
  const [supplierOptions, setSupplierOptions] = useState([])
  const [originOptions, setOriginOptions] = useState(['All'])
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState(['All'])
  const [filtersError, setFiltersError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [refreshTick, setRefreshTick] = useState(0)
  const knownAlertIdsRef = useRef(new Set())
  const dismissedAlertIdsRef = useRef(new Set(getDismissedAlertIds()))

  const pageMeta = PAGE_CONTENT[activeView] || PAGE_CONTENT.executive

  useEffect(() => {
    let mounted = true

    async function loadFilterOptions() {
      setFiltersError('')
      try {
        const [suppliersFromApi, originsFromApi, vehicleTypesFromApi] =
          await Promise.all([
            getSupplierOptions(filters),
            getOriginOptions(filters),
            getVehicleTypeOptions(filters),
          ])

        if (!mounted) {
          return
        }

        const normalizedSuppliers = [
          ...new Set(
            (Array.isArray(suppliersFromApi) ? suppliersFromApi : [])
              .map((value) => String(value || '').trim())
              .filter(Boolean),
          ),
        ]
        const normalizedOrigins = [
          'All',
          ...new Set(
            (Array.isArray(originsFromApi) ? originsFromApi : [])
              .map((value) => String(value || '').trim())
              .filter(Boolean),
          ),
        ]
        const normalizedVehicleTypes = [
          'All',
          ...new Set(
            (Array.isArray(vehicleTypesFromApi) ? vehicleTypesFromApi : [])
              .map((value) => String(value || '').trim())
              .filter(Boolean),
          ),
        ]

        setSupplierOptions(normalizedSuppliers)
        setOriginOptions(normalizedOrigins)
        setVehicleTypeOptions(normalizedVehicleTypes)

        setFilters((currentFilters) => ({
          ...currentFilters,
          suppliers: currentFilters.suppliers.filter((supplier) =>
            normalizedSuppliers.includes(supplier),
          ),
          origin: normalizedOrigins.includes(currentFilters.origin)
            ? currentFilters.origin
            : 'All',
          vehicleType: normalizedVehicleTypes.includes(currentFilters.vehicleType)
            ? currentFilters.vehicleType
            : 'All',
        }))
      } catch (error) {
        if (mounted) {
          setFiltersError(error?.message || 'Impossible de charger les filtres.')
          setSupplierOptions([])
          setOriginOptions(['All'])
          setVehicleTypeOptions(['All'])
        }
      }
    }

    loadFilterOptions()
    return () => {
      mounted = false
    }
  }, [filters.days, filters.fromDate, filters.toDate, filters.origin, filters.vehicleType])

  useEffect(() => {
    let mounted = true
    let intervalId

    async function loadAlerts(isInitialLoad = false) {
      try {
        const rows = await getReceptionAlerts(30)
        if (!mounted) {
          return
        }

        const normalizedRows = (Array.isArray(rows) ? rows : []).map((row) => ({
          ...row,
          id: String(row?.id || '').trim(),
        }))
        const visibleRows = normalizedRows.filter(
          (row) => row.id && !dismissedAlertIdsRef.current.has(row.id),
        )

        if (isInitialLoad) {
          knownAlertIdsRef.current = new Set(
            visibleRows.map((row) => row.id).filter(Boolean),
          )
          setAlerts(visibleRows)
          return
        }

        const newRows = visibleRows.filter(
          (row) => row.id && !knownAlertIdsRef.current.has(row.id),
        )

        if (newRows.length) {
          setUnreadAlerts((current) => current + newRows.length)
          setRefreshTick((current) => current + 1)
        }

        setAlerts((currentAlerts) => {
          const merged = [...visibleRows, ...currentAlerts]
          const uniqueMap = new Map()
          for (const alert of merged) {
            if (alert.id && !uniqueMap.has(alert.id)) {
              uniqueMap.set(alert.id, alert)
            }
          }

          return Array.from(uniqueMap.values()).slice(0, 50)
        })

        for (const row of visibleRows) {
          if (row.id) {
            knownAlertIdsRef.current.add(row.id)
          }
        }

        if (knownAlertIdsRef.current.size > 200) {
          const trimmed = new Set(Array.from(knownAlertIdsRef.current).slice(-120))
          knownAlertIdsRef.current = trimmed
        }
      } catch {
        if (!isInitialLoad && mounted) {
          setFiltersError((current) => current || 'Erreur de synchronisation des alertes.')
        }
      }
    }

    loadAlerts(true)
    intervalId = window.setInterval(() => {
      loadAlerts(false)
    }, 5000)

    return () => {
      mounted = false
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [])

  function handleFiltersChange(field, value) {
    setFilters((currentFilters) => {
      const nextFilters = { ...currentFilters, [field]: value }

      if (field === 'days') {
        nextFilters.fromDate = ''
        nextFilters.toDate = ''
      }

      if (field === 'fromDate') {
        if (nextFilters.toDate && nextFilters.toDate < value) {
          nextFilters.toDate = value
        }
      }

      if (field === 'toDate') {
        if (nextFilters.fromDate && nextFilters.fromDate > value) {
          nextFilters.fromDate = value
        }
      }

      return nextFilters
    })
  }

  function handleResetFilters() {
    setFilters(createDefaultFilters())
  }

  function handleNavChange(nextView) {
    setActiveView(nextView)
    if (nextView === 'alerts') {
      setUnreadAlerts(0)
    }
  }

  function handleOpenAlerts() {
    setActiveView('alerts')
    setUnreadAlerts(0)
  }

  function handleDismissAlert(alertId) {
    const normalizedId = String(alertId || '').trim()
    if (!normalizedId) {
      return
    }

    dismissedAlertIdsRef.current.add(normalizedId)
    saveDismissedAlertIds(Array.from(dismissedAlertIdsRef.current))
    setAlerts((currentAlerts) =>
      currentAlerts.filter((alert) => alert.id !== normalizedId),
    )
    setUnreadAlerts((current) => Math.max(0, current - 1))
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const navItems = useMemo(
    () =>
      BASE_NAV_ITEMS.map((item) =>
        item.id === 'alerts'
          ? {
              ...item,
              badge: unreadAlerts,
            }
          : item,
      ),
    [unreadAlerts],
  )

  const renderedPage = useMemo(() => {
    if (activeView === 'executive') {
      return <ExecutiveOverviewPage filters={filters} refreshTick={refreshTick} />
    }

    if (activeView === 'suppliers') {
      return <SupplierPerformancePage filters={filters} refreshTick={refreshTick} />
    }

    if (activeView === 'operations') {
      return <OperationsMonitoringPage filters={filters} refreshTick={refreshTick} />
    }

    if (activeView === 'alerts') {
      return (
        <SectionCard title="Alertes receptions en temps reel">
          {!alerts.length ? (
            <p className="dashboard-muted">Aucune nouvelle reception detectee.</p>
          ) : (
            <div className="dashboard-alert-list">
              {alerts.map((alert) => (
                <article key={alert.id} className="dashboard-alert-item">
                  <strong>{alert.supplier || 'Fournisseur inconnu'}</strong>
                  <p>
                    Remorque: {alert.recordNo || '-'} | Origine: {alert.origin || '-'} |
                    Type: {alert.vehicleType || '-'} | Palettes: {alert.pallets || 0}
                  </p>
                  <small>
                    Arrivee: {alert.arrivalDate || '-'} {alert.arrivalTime || '-'} | Ajoutee
                    le: {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '-'}
                  </small>
                  <button
                    type="button"
                    className="ghost-button dashboard-alert-dismiss-btn"
                    onClick={() => handleDismissAlert(alert.id)}
                  >
                    <span className="button-content">
                      <Trash2 size={14} aria-hidden="true" />
                    </span>
                  </button>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      )
    }

    if (activeView === 'reports') {
      return <ReportsPage filters={filters} refreshTick={refreshTick} />
    }

    return (
      <SectionCard title={pageMeta.title}>
        <p className="dashboard-muted">
          Cette section sera activee prochainement. Le design est deja aligne
          avec le layout principal.
        </p>
      </SectionCard>
    )
  }, [activeView, alerts, filters, pageMeta.title, refreshTick])

  return (
    <DashboardLayout
      navItems={navItems}
      activeNavItem={activeView}
      onNavChange={handleNavChange}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
      userEmail={user?.email}
      title={pageMeta.title}
      subtitle={pageMeta.subtitle}
      filters={filters}
      onFiltersChange={handleFiltersChange}
      onResetFilters={handleResetFilters}
      periodOptions={PERIOD_OPTIONS}
      supplierOptions={supplierOptions}
      originOptions={originOptions}
      vehicleTypeOptions={vehicleTypeOptions}
      notificationCount={unreadAlerts}
      onOpenAlerts={handleOpenAlerts}
      showHeader={!['reports', 'alerts'].includes(activeView)}
      showFilters={!['reports', 'alerts'].includes(activeView)}
    >
      {filtersError ? <p className="dashboard-error">{filtersError}</p> : null}
      {renderedPage}
    </DashboardLayout>
  )
}

export default DirectorPlaceholderPage

