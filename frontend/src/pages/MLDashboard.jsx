import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BadgeEuro,
  Brain,
  Calendar,
  Hash,
  Percent,
  RefreshCw,
  Zap,
} from 'lucide-react'
import SectionCard from '../dashboard/components/SectionCard'
import ErrorChart from '../components/ml/ErrorChart'
import MLFilters from '../components/ml/MLFilters'
import MLKpiCard from '../components/ml/MLKpiCard'
import PredictionsTable from '../components/ml/PredictionsTable'
import RealVsPredictedChart from '../components/ml/RealVsPredictedChart'
import StatusDistributionChart from '../components/ml/StatusDistributionChart'
import TransporteurErrorChart from '../components/ml/TransporteurErrorChart'
import TrendChart from '../components/ml/TrendChart'
import { formatCurrency, formatInteger, formatPercent } from '../components/ml/mlFormatters'
import {
  getMLByCarrier,
  getMLFilterOptions,
  getMLMetrics,
  getMLPredictions,
  getMLTrend,
  getStatusDistribution,
  getTopErrors,
} from '../services/mlApi'
import '../components/ml/ml-dashboard.css'

// ─── État initial ─────────────────────────────────────────────────────────────
function createDefaultFilters() {
  return {
    transporteur: '',
    fournisseur: '',
    statut: '',
    typeTransport: '',
    search: '',
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────
function MLDashboard() {
  // KPIs + données graphiques globaux
  const [metrics, setMetrics] = useState(null)
  const [topErrors, setTopErrors] = useState([])
  const [statusDistribution, setStatusDistribution] = useState([])
  const [trend, setTrend] = useState([])
  const [carriers, setCarriers] = useState([])

  // Options dropdowns (depuis API — toutes les valeurs, pas juste la page courante)
  const [filterOptions, setFilterOptions] = useState({
    transporteurs: [],
    fournisseurs: [],
    types: [],
    statuts: [],
  })

  // Prédictions filtrées + pagination
  const [predictionsPayload, setPredictionsPayload] = useState(null)
  const [filters, setFilters] = useState(createDefaultFilters)
  const [page, setPage] = useState(1)

  // États de chargement
  const [isLoadingKpis, setIsLoadingKpis] = useState(true)
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(true)
  const [kpiError, setKpiError] = useState('')
  const [predictionsError, setPredictionsError] = useState('')

  const lastRefreshRef = useRef(null)

  // ── Chargement initial : KPIs, graphiques globaux, options filtres ──────────
  const loadGlobalData = useCallback(async () => {
    setIsLoadingKpis(true)
    setKpiError('')
    try {
      const [metricsData, errorsData, statusData, trendData, carriersData, optionsData] =
        await Promise.all([
          getMLMetrics(),
          getTopErrors(20),
          getStatusDistribution(),
          getMLTrend(),
          getMLByCarrier(),
          getMLFilterOptions(),
        ])

      setMetrics(metricsData)
      setTopErrors(Array.isArray(errorsData?.items) ? errorsData.items : [])
      setStatusDistribution(Array.isArray(statusData?.items) ? statusData.items : [])
      setTrend(Array.isArray(trendData?.items) ? trendData.items : [])
      setCarriers(Array.isArray(carriersData?.items) ? carriersData.items : [])
      setFilterOptions({
        transporteurs: optionsData?.transporteurs || [],
        fournisseurs: optionsData?.fournisseurs || [],
        types: optionsData?.types || [],
        statuts: optionsData?.statuts || [],
      })
      lastRefreshRef.current = new Date()
    } catch (error) {
      setKpiError(error?.message || 'Impossible de charger les indicateurs ML.')
    } finally {
      setIsLoadingKpis(false)
    }
  }, [])

  useEffect(() => {
    loadGlobalData()
  }, [loadGlobalData])

  // ── Chargement paginé des prédictions (réagit aux filtres et à la page) ─────
  useEffect(() => {
    let mounted = true

    async function loadPredictions() {
      setIsLoadingPredictions(true)
      setPredictionsError('')
      try {
        const response = await getMLPredictions({ ...filters, page, pageSize: 100 })
        if (mounted) setPredictionsPayload(response)
      } catch (error) {
        if (mounted) {
          setPredictionsError(error?.message || 'Impossible de charger les prédictions.')
          setPredictionsPayload(null)
        }
      } finally {
        if (mounted) setIsLoadingPredictions(false)
      }
    }

    loadPredictions()
    return () => { mounted = false }
  }, [filters, page])

  // ── Données dérivées ──────────────────────────────────────────────────────
  const predictions = useMemo(
    () => (Array.isArray(predictionsPayload?.items) ? predictionsPayload.items : []),
    [predictionsPayload?.items],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function handleResetFilters() {
    setFilters(createDefaultFilters())
    setPage(1)
  }

  // ── Formatage date d'entraînement ─────────────────────────────────────────
  const trainedAtLabel = useMemo(() => {
    if (!metrics?.trainedAt) return '-'
    return new Date(metrics.trainedAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }, [metrics?.trainedAt])

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="ml-dashboard-root">

      {/* ─── Bandeau d'en-tête ML ────────────────────────────────────────── */}
      <div className="ml-header-band">
        <div className="ml-header-band__content">
          <span className="ml-header-band__badge">
            <Zap size={12} aria-hidden="true" />
            Machine Learning
          </span>
          <p>
            Prédiction des coûts d'importation par le modèle{' '}
            <strong>{metrics?.bestModel || '—'}</strong>.
            Les erreurs permettent d'identifier les opérations nécessitant une vérification.
          </p>
        </div>
        <button
          type="button"
          className="ml-refresh-btn"
          onClick={loadGlobalData}
          disabled={isLoadingKpis}
          title="Rafraîchir les données ML"
        >
          <RefreshCw size={14} className={isLoadingKpis ? 'ml-spin' : ''} aria-hidden="true" />
          {isLoadingKpis ? 'Chargement…' : 'Rafraîchir'}
        </button>
      </div>

      {kpiError ? (
        <p className="dashboard-error" role="alert">{kpiError}</p>
      ) : null}

      {/* ─── Ligne 1 KPIs : Modèle + métriques de base ───────────────────── */}
      <section className="kpi-grid kpi-grid--four" aria-label="Métriques du modèle ML">
        <MLKpiCard
          icon={Brain}
          label="Meilleur modèle"
          value={metrics?.bestModel || '-'}
          helper="Sélectionné par RMSE minimal"
          accent="blue"
          loading={isLoadingKpis}
        />
        <MLKpiCard
          icon={BadgeEuro}
          label="MAE"
          value={formatCurrency(metrics?.mae)}
          helper="Erreur absolue moyenne par opération"
          loading={isLoadingKpis}
        />
        <MLKpiCard
          icon={Activity}
          label="RMSE"
          value={formatCurrency(metrics?.rmse)}
          helper="Erreur quadratique moyenne (pénalise les grands écarts)"
          loading={isLoadingKpis}
        />
        <MLKpiCard
          icon={Zap}
          label="R² Score"
          value={Number.isFinite(Number(metrics?.r2)) ? Number(metrics.r2).toFixed(4) : '-'}
          helper={`Variance expliquée: ${Number.isFinite(Number(metrics?.r2)) ? (Number(metrics.r2) * 100).toFixed(1) + ' %' : '-'}`}
          accent={Number(metrics?.r2) >= 0.7 ? 'green' : Number(metrics?.r2) >= 0.5 ? 'orange' : 'red'}
          loading={isLoadingKpis}
        />
      </section>

      {/* ─── Ligne 2 KPIs : Statistiques opérationnelles ──────────────────── */}
      <section className="kpi-grid kpi-grid--four" aria-label="Statistiques opérationnelles">
        <MLKpiCard
          icon={Hash}
          label="Total prédictions"
          value={formatInteger(metrics?.totalPredictions)}
          helper="Opérations évaluées par le modèle"
          loading={isLoadingKpis}
        />
        <MLKpiCard
          icon={Percent}
          label="Erreur moyenne %"
          value={formatPercent(metrics?.averageErrorPercent)}
          helper="Erreur relative moyenne sur toutes les prédictions"
          accent={Number(metrics?.averageErrorPercent) < 15 ? 'green' : Number(metrics?.averageErrorPercent) <= 25 ? 'orange' : 'red'}
          loading={isLoadingKpis}
        />
        <MLKpiCard
          icon={AlertTriangle}
          label="À vérifier"
          value={formatInteger(metrics?.toCheckCount)}
          helper="Prédictions avec erreur > 25%"
          accent={metrics?.toCheckCount > 0 ? 'red' : 'green'}
          loading={isLoadingKpis}
        />
        <MLKpiCard
          icon={Calendar}
          label="Modèle entraîné le"
          value={trainedAtLabel}
          helper="Date du dernier entraînement ML"
          accent="blue"
          loading={isLoadingKpis}
        />
      </section>

      {/* ─── Filtres ─────────────────────────────────────────────────────── */}
      <SectionCard title="Filtres des prédictions">
        <MLFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          transporteurOptions={filterOptions.transporteurs}
          fournisseurOptions={filterOptions.fournisseurs}
          typeTransportOptions={filterOptions.types}
          statusOptions={filterOptions.statuts}
        />
      </SectionCard>

      {predictionsError ? (
        <p className="dashboard-error" role="alert">{predictionsError}</p>
      ) : null}

      {/* ─── Graphiques — Ligne 1 : Scatter + Donut ──────────────────────── */}
      <section className="ml-charts-grid ml-charts-grid--2col" aria-label="Graphiques principaux">
        {/* Scatter plot : nécessite les prédictions filtrées pour les couleurs par statut */}
        <RealVsPredictedChart predictions={isLoadingPredictions ? [] : predictions} />
        <StatusDistributionChart distribution={statusDistribution} />
      </section>

      {/* ─── Graphiques — Ligne 2 : Top erreurs + MAE par transporteur ──── */}
      <section className="ml-charts-grid ml-charts-grid--2col" aria-label="Analyse des erreurs">
        <ErrorChart rows={topErrors} />
        <TransporteurErrorChart carriers={carriers} />
      </section>

      {/* ─── Graphique — Tendance temporelle (pleine largeur) ────────────── */}
      <TrendChart trend={trend} />

      {/* ─── Tableau des prédictions ─────────────────────────────────────── */}
      {isLoadingPredictions ? (
        <SectionCard title="Chargement">
          <p className="dashboard-muted">Chargement des prédictions…</p>
        </SectionCard>
      ) : (
        <PredictionsTable
          rows={predictions}
          page={Number(predictionsPayload?.page || 1)}
          totalPages={Number(predictionsPayload?.totalPages || 1)}
          total={Number(predictionsPayload?.total || 0)}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

export default MLDashboard
