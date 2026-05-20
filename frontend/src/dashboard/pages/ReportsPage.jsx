import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { utils, writeFile } from 'xlsx'
import { getOperationsMonitoring } from '../../api/dashboardApi'
import DataTable from '../components/DataTable'
import SectionCard from '../components/SectionCard'

function ReportsPage({ filters, refreshTick = 0 }) {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadRows() {
      setIsLoading(true)
      setError('')
      try {
        const payload = await getOperationsMonitoring(filters)
        if (mounted) {
          setRows(Array.isArray(payload?.recentShipments) ? payload.recentShipments : [])
        }
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError?.message || 'Impossible de charger les receptions recentes.',
          )
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadRows()
    return () => {
      mounted = false
    }
  }, [filters, refreshTick])

  const tableColumns = useMemo(
    () => [
      { key: 'arrivalDate', header: "Date d'arrivee" },
      { key: 'supplier', header: 'Fournisseur' },
      { key: 'arrivalTime', header: "Heure d'arrivee" },
      { key: 'pallets', header: 'Palettes' },
      { key: 'vehicleType', header: 'Type de vehicule' },
      { key: 'origin', header: 'Origine' },
      { key: 'waitingDays', header: "Jours d'attente" },
      {
        key: 'status',
        header: 'Statut',
        render(value) {
          const normalizedStatus = String(value || '').trim()
          const frenchStatus =
            normalizedStatus === 'In Progress'
              ? 'En cours'
              : normalizedStatus === 'Unloaded'
                ? 'Decharge'
                : normalizedStatus

          return (
            <span
              className={`status-pill status-pill--${frenchStatus
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
            >
              {frenchStatus}
            </span>
          )
        },
      },
    ],
    [],
  )

  const handleExportToExcel = () => {
    if (!rows.length) {
      alert('Aucune donnée à exporter.')
      return
    }

    // Préparer les données pour l'export
    const exportData = rows.map((row) => ({
      "Date d'arrivee": row.arrivalDate || '-',
      'Fournisseur': row.supplier || '-',
      "Heure d'arrivee": row.arrivalTime || '-',
      'Palettes': row.pallets || '-',
      'Type de vehicule': row.vehicleType || '-',
      'Origine': row.origin || '-',
      "Jours d'attente": row.waitingDays || '-',
      'Statut': row.status || '-',
    }))

    // Créer un workbook et ajouter les données
    const worksheet = utils.json_to_sheet(exportData)
    const workbook = utils.book_new()
    utils.book_append_sheet(workbook, worksheet, 'Receptions')

    // Ajuster la largeur des colonnes
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
    ]

    // Télécharger le fichier
    const timestamp = new Date().toISOString().slice(0, 10)
    writeFile(workbook, `receptions_${timestamp}.xlsx`)
  }

  return (
    <>
      <SectionCard title="Rapports">
        {isLoading ? <p className="dashboard-muted">Chargement des rapports...</p> : null}
        {error ? <p className="dashboard-error">{error}</p> : null}
      </SectionCard>

      <SectionCard title="Table des receptions recentes">
        <div className="reports-actions">
          <button
            className="btn-export"
            onClick={handleExportToExcel}
            disabled={isLoading}
          >
            <Download size={18} />
            Télécharger XLS
          </button>
        </div>
        <DataTable
          columns={tableColumns}
          rows={rows}
          emptyMessage="Aucune reception recente disponible."
        />
      </SectionCard>
    </>
  )
}

export default ReportsPage
