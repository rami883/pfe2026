import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Activity,
  AlertTriangle,
  BadgeEuro,
  Brain,
  Calendar,
  Hash,
  Percent,
  RefreshCw,
  Trophy,
  Zap,
} from 'lucide-react'
import SectionCard from '../dashboard/components/SectionCard'
import ErrorChart from '../components/ml/ErrorChart'
import MLFilters from '../components/ml/MLFilters'
import MLKpiCard from '../components/ml/MLKpiCard'
import ModelRadarChart from '../components/ml/ModelRadarChart'
import PredictionsTable from '../components/ml/PredictionsTable'
import RealVsPredictedChart from '../components/ml/RealVsPredictedChart'
import StatusDistributionChart from '../components/ml/StatusDistributionChart'
import TransporteurErrorChart from '../components/ml/TransporteurErrorChart'
import { formatCurrency, formatInteger, formatPercent } from '../components/ml/mlFormatters'
import {
  getMLByCarrier,
  getMLFilterOptions,
  getMLModelComparison,
  getMLMetrics,
  getMLPredictions,
  getStatusDistribution,
  getTopErrors,
} from '../services/mlApi'
import '../dashboard/chartSetup'
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

class PredictionsTableErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Predictions table render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="dashboard-error" role="alert">
          Impossible d'afficher le tableau de predictions pour une ou plusieurs lignes invalides.
        </p>
      )
    }

    return this.props.children
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────
const MODEL_COMPARISON_FALLBACK = [
  {
    model: 'Random Forest Regressor',
    mae: 466.7062,
    rmse: 771.728,
    r2: 0.7265,
    cvR2Mean: 0.7104,
    cvR2Std: 0.0635,
  },
  {
    model: 'Gradient Boosting Regressor',
    mae: 490.4203,
    rmse: 786.2349,
    r2: 0.7161,
    cvR2Mean: 0.7253,
    cvR2Std: 0.0323,
  },
  {
    model: 'Linear Regression',
    mae: 634.8609,
    rmse: 942.5999,
    r2: 0.5919,
    cvR2Mean: -0.1048,
    cvR2Std: 1.1379,
  },
]

function AnalysePredictivePage() {
  // KPIs + données graphiques globaux
  const [metrics, setMetrics] = useState(null)
  const [topErrors, setTopErrors] = useState([])
  const [statusDistribution, setStatusDistribution] = useState([])
  const [carriers, setCarriers] = useState([])
  const [modelComparison, setModelComparison] = useState(MODEL_COMPARISON_FALLBACK)

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
  const [isPredictionsTableOpen, setIsPredictionsTableOpen] = useState(false)

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
      const [
        metricsResult,
        errorsResult,
        statusResult,
        carriersResult,
        optionsResult,
        modelComparisonResult,
      ] = await Promise.allSettled([
        getMLMetrics(),
        getTopErrors(20),
        getStatusDistribution(),
        getMLByCarrier(),
        getMLFilterOptions(),
        getMLModelComparison(),
      ])

      const metricsData = metricsResult.status === 'fulfilled' ? metricsResult.value : null
      const errorsData = errorsResult.status === 'fulfilled' ? errorsResult.value : null
      const statusData = statusResult.status === 'fulfilled' ? statusResult.value : null
      const carriersData = carriersResult.status === 'fulfilled' ? carriersResult.value : null
      const optionsData = optionsResult.status === 'fulfilled' ? optionsResult.value : null
      const modelComparisonData =
        modelComparisonResult.status === 'fulfilled' ? modelComparisonResult.value : null

      if (metricsData) setMetrics(metricsData)
      if (errorsData) setTopErrors(Array.isArray(errorsData?.items) ? errorsData.items : [])
      if (statusData) setStatusDistribution(Array.isArray(statusData?.items) ? statusData.items : [])
      if (carriersData) setCarriers(Array.isArray(carriersData?.items) ? carriersData.items : [])
      if (modelComparisonData) {
        const comparisonItems = Array.isArray(modelComparisonData?.items)
          ? modelComparisonData.items
          : []
        setModelComparison(comparisonItems.length ? comparisonItems : MODEL_COMPARISON_FALLBACK)
      }
      if (optionsData) {
        setFilterOptions({
          transporteurs: optionsData?.transporteurs || [],
          fournisseurs: optionsData?.fournisseurs || [],
          types: optionsData?.types || [],
          statuts: optionsData?.statuts || [],
        })
      }

      if (!metricsData && !modelComparisonData) {
        const failedRequest = [
          metricsResult,
          errorsResult,
          statusResult,
          carriersResult,
          optionsResult,
          modelComparisonResult,
        ].find((result) => result.status === 'rejected')

        setKpiError(failedRequest?.reason?.message || 'Impossible de charger les indicateurs ML.')
      }
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
        const response = await getMLPredictions({
          ...filters,
          all: 'true',
          page: 1,
          pageSize: 10000,
        })
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

  function handleTogglePredictionsTable() {
    setIsPredictionsTableOpen((prev) => !prev)
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

  function formatScore(value, digits = 4) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return '-'
    return parsed.toFixed(digits)
  }

  function getModelName(row) {
    return String(row?.model || row?.MODEL || row?.name || row?.bestModel || '').trim()
  }

  function getModelRmse(row) {
    return row?.rmse ?? row?.RMSE
  }

  function getModelCvR2Std(row) {
    return row?.cvR2Std ?? row?.CV_R2_STD ?? row?.cvStd
  }

  const bestModelByRmse = useMemo(() => {
    if (modelComparison.length) {
      return [...modelComparison].sort(
        (a, b) => Number(getModelRmse(a)) - Number(getModelRmse(b)),
      )[0]
    }

    if (metrics?.bestModel) {
      return {
        model: metrics.bestModel,
        rmse: metrics.rmse,
      }
    }

    return null
  }, [modelComparison, metrics?.bestModel, metrics?.rmse])

  const mostStableModel = useMemo(() => {
    if (!modelComparison.length) return null
    return [...modelComparison].sort(
      (a, b) => Number(getModelCvR2Std(a)) - Number(getModelCvR2Std(b)),
    )[0]
  }, [modelComparison])

  const modelComparisonChartData = useMemo(() => {
    const labels = modelComparison.map((row) => row.model)
    return {
      labels,
      rmse: {
        labels,
        datasets: [
          {
            label: 'RMSE',
            data: modelComparison.map((row) => Number(row.rmse) || 0),
            backgroundColor: labels.map((_, index) =>
              index === 0 ? '#b51218' : 'rgba(215, 25, 32, 0.45)',
            ),
            borderRadius: 8,
          },
        ],
      },
      mae: {
        labels,
        datasets: [
          {
            label: 'MAE',
            data: modelComparison.map((row) => Number(row.mae) || 0),
            backgroundColor: labels.map((_, index) =>
              index === 0 ? '#d71920' : 'rgba(215, 25, 32, 0.30)',
            ),
            borderRadius: 8,
          },
        ],
      },
    }
  }, [modelComparison])

  const modelComparisonChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          callbacks: {
            label(context) {
              const value = Number(context.parsed.y)
              return Number.isFinite(value) ? value.toFixed(4) : '-'
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6b7280', maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.18)' },
          ticks: { color: '#6b7280' },
        },
      },
    }),
    [],
  )

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

      <SectionCard title="Comparaison des modeles">
        <div className="ml-model-summary">
          <article className="ml-model-summary-card">
            <div className="ml-model-summary-card__top">
              <span className="ml-model-summary-card__icon" aria-hidden="true">
                <Trophy size={24} />
              </span>
              <span className="ml-model-summary-card__label">Meilleur RMSE</span>
            </div>
            <strong className="ml-model-summary-card__model">
              {getModelName(bestModelByRmse) || '-'}
            </strong>
            <p className="ml-model-summary-card__score">
              {bestModelByRmse ? formatScore(getModelRmse(bestModelByRmse)) : '-'}
              <span>RMSE</span>
            </p>
          </article>

          <article className="ml-model-summary-card">
            <div className="ml-model-summary-card__top">
              <span className="ml-model-summary-card__icon" aria-hidden="true">
                <Activity size={24} />
              </span>
              <span className="ml-model-summary-card__label">Plus stable (CV)</span>
            </div>
            <strong className="ml-model-summary-card__model">
              {getModelName(mostStableModel) || '-'}
            </strong>
            <p className="ml-model-summary-card__score">
              {mostStableModel ? formatScore(getModelCvR2Std(mostStableModel)) : '-'}
              <span>écart-type R²</span>
            </p>
          </article>
        </div>

        <div className="ml-models-wrap">
          <table className="ml-models-table">
            <thead>
              <tr>
                <th>Modele</th>
                <th>MAE</th>
                <th>RMSE</th>
                <th>R2</th>
                <th>CV R2 Mean</th>
                <th>CV R2 Std</th>
              </tr>
            </thead>
            <tbody>
              {!modelComparison.length ? (
                <tr>
                  <td colSpan={6} className="ml-models-empty">
                    Aucune comparaison disponible.
                  </td>
                </tr>
              ) : null}

              {modelComparison.map((row, index) => {
                const isBest = index === 0
                return (
                  <tr key={row.model} className={isBest ? 'ml-models-row--best' : ''}>
                    <td>
                      {row.model}
                      {isBest ? <span className="ml-models-best-badge">Best</span> : null}
                    </td>
                    <td>{formatScore(row.mae)}</td>
                    <td>{formatScore(row.rmse)}</td>
                    <td>{formatScore(row.r2)}</td>
                    <td>{formatScore(row.cvR2Mean)}</td>
                    <td>{formatScore(row.cvR2Std)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <section className="ml-charts-grid ml-charts-grid--2col ml-model-charts">
          <div className="ml-chart-card">
            <h3>Comparaison RMSE</h3>
            <div className="ml-chart-wrap ml-chart-wrap--small">
              <Bar
                data={modelComparisonChartData.rmse}
                options={modelComparisonChartOptions}
              />
            </div>
          </div>

          <div className="ml-chart-card">
            <h3>Comparaison MAE</h3>
            <div className="ml-chart-wrap ml-chart-wrap--small">
              <Bar
                data={modelComparisonChartData.mae}
                options={modelComparisonChartOptions}
              />
            </div>
          </div>
        </section>
      </SectionCard>

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
      <ModelRadarChart models={modelComparison} />

      {/* ─── Tableau des prédictions ─────────────────────────────────────── */}
      <SectionCard title="Tableau detaille des predictions">
        <div className="ml-table-toggle-row">
          <p className="dashboard-muted">
            Le tableau complet peut etre affiche uniquement quand vous en avez besoin.
          </p>
          <button
            type="button"
            className="ml-table-toggle-btn"
            onClick={handleTogglePredictionsTable}
            aria-expanded={isPredictionsTableOpen}
          >
            {isPredictionsTableOpen ? (
              <>
                <span aria-hidden="true">▲</span>
                Masquer le tableau
              </>
            ) : (
              <>
                <span aria-hidden="true">▼</span>
                Afficher le tableau
              </>
            )}
          </button>
        </div>

        <div className={`ml-collapsible ${isPredictionsTableOpen ? 'is-open' : ''}`}>
          <div className="ml-collapsible__inner">
            {isPredictionsTableOpen ? (
              isLoadingPredictions ? (
                <p className="dashboard-muted">Chargement des predictions...</p>
              ) : (
                <PredictionsTableErrorBoundary>
                  <PredictionsTable
                    rows={predictions}
                    page={Number(predictionsPayload?.page || 1)}
                    totalPages={Number(predictionsPayload?.totalPages || 1)}
                    total={Number(predictionsPayload?.total || 0)}
                    onPageChange={setPage}
                  />
                </PredictionsTableErrorBoundary>
              )
            ) : null}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export default AnalysePredictivePage

