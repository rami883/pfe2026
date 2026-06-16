import { useEffect, useMemo, useState } from 'react'
import { Brain, Calculator, CircleAlert, Sigma } from 'lucide-react'
import { getImportCostAnalytics } from '../../api/dashboardApi'
import KPIBox from '../components/KPIBox'
import DataTable from '../components/DataTable'
import SectionCard from '../components/SectionCard'

function formatNumber(value, digits = 2) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return '-'
  }
  return parsed.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function formatInt(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return '-'
  }
  return parsed.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

function AnalysePredictiveDashboardPage({ refreshTick = 0 }) {
  const [payload, setPayload] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadAnalytics() {
      setIsLoading(true)
      setError('')

      try {
        const response = await getImportCostAnalytics(800)
        if (mounted) {
          setPayload(response)
        }
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError?.message ||
              "Impossible de charger l'analyse predictive.",
          )
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadAnalytics()
    return () => {
      mounted = false
    }
  }, [refreshTick])

  const summary = payload?.summary || {}
  const metrics = Array.isArray(summary?.metrics) ? summary.metrics : []
  const predictions = useMemo(
    () => (Array.isArray(payload?.predictions) ? payload.predictions : []),
    [payload?.predictions],
  )
  const bestModelMetrics = summary?.best_model_metrics || {}

  const modelResultsColumns = [
    { key: 'MODEL', header: 'Modele' },
    { key: 'MAE', header: 'MAE', render: (value) => formatNumber(value, 4) },
    { key: 'RMSE', header: 'RMSE', render: (value) => formatNumber(value, 4) },
    { key: 'R2', header: 'R²', render: (value) => formatNumber(value, 4) },
  ]

  const predictionsColumns = [
    { key: 'transporteur', header: 'Transporteur' },
    { key: 'fournisseur', header: 'Fournisseur' },
    { key: 'typeTransport', header: 'Type transport' },
    { key: 'designation', header: 'Designation' },
    { key: 'nbrColis', header: 'Nbr colis', render: (value) => formatInt(value) },
    {
      key: 'importDelayDays',
      header: 'Delai (jours)',
      render: (value) => (value === null ? '-' : formatInt(value)),
    },
    {
      key: 'montantReelEuro',
      header: 'Montant reel (EUR)',
      render: (value) => formatNumber(value, 2),
    },
    {
      key: 'montantPreditEuro',
      header: 'Montant predit (EUR)',
      render: (value) => formatNumber(value, 2),
    },
    {
      key: 'erreurAbsolue',
      header: 'Erreur absolue',
      render: (value) => formatNumber(value, 2),
    },
    {
      key: 'erreurPct',
      header: 'Erreur %',
      render: (value) => `${formatNumber(value, 2)}%`,
    },
  ]

  const errorStats = useMemo(() => {
    if (!predictions.length) {
      return { averageAbsError: 0, maxAbsError: 0 }
    }

    const absErrors = predictions.map((row) => Number(row.erreurAbsolue) || 0)
    const total = absErrors.reduce((sum, value) => sum + value, 0)
    return {
      averageAbsError: total / absErrors.length,
      maxAbsError: Math.max(...absErrors),
    }
  }, [predictions])

  if (isLoading) {
    return (
      <SectionCard title="Analyse Prédictive">
        <p className="dashboard-muted">Chargement des resultats de prediction...</p>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard title="Analyse Prédictive">
        <p className="dashboard-error">{error}</p>
      </SectionCard>
    )
  }

  return (
    <>
      <section className="kpi-grid kpi-grid--three">
        <KPIBox
          icon={Brain}
          label="Meilleur modele"
          value={summary?.best_model || '-'}
          helper="Selection automatique selon RMSE"
        />
        <KPIBox
          icon={Calculator}
          label="RMSE (best)"
          value={formatNumber(bestModelMetrics?.RMSE, 4)}
          helper="Erreur quadratique moyenne"
        />
        <KPIBox
          icon={Sigma}
          label="Lignes evaluees"
          value={formatInt(summary?.rows_used_for_training || predictions.length)}
          helper="Dataset utilise pour le training"
        />
      </section>

      <section className="kpi-grid kpi-grid--two">
        <KPIBox
          icon={CircleAlert}
          label="Erreur absolue moyenne"
          value={formatNumber(errorStats.averageAbsError, 2)}
          helper="Moyenne des ecarts reel vs predit"
        />
        <KPIBox
          icon={CircleAlert}
          label="Erreur absolue max"
          value={formatNumber(errorStats.maxAbsError, 2)}
          helper="Plus grand ecart observe"
        />
      </section>

      <SectionCard title="Comparatif des modeles de regression">
        <DataTable
          columns={modelResultsColumns}
          rows={metrics}
          emptyMessage="Aucun resultat modele disponible."
        />
      </SectionCard>

      <SectionCard title="Valeurs de prevision (detail complet)">
        <DataTable
          columns={predictionsColumns}
          rows={predictions}
          emptyMessage="Aucune prediction disponible."
        />
      </SectionCard>
    </>
  )
}

export default AnalysePredictiveDashboardPage
