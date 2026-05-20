import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const AUTH_TOKEN_STORAGE_KEY = 'pfe_auth_token'

// ─── Auth ─────────────────────────────────────────────────────────────────────
function getAuthToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ''
}

function getRequestConfig(params = {}) {
  const token = getAuthToken()
  return {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  }
}

// ─── Couche HTTP générique ────────────────────────────────────────────────────
async function mlGet(path, params = {}) {
  try {
    const response = await axios.get(`${API_BASE_URL}${path}`, getRequestConfig(params))
    return response.data
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Impossible de charger les données ML.'
    throw new Error(message)
  }
}

// ─── Normalisation des filtres ────────────────────────────────────────────────
function normalizeFilters(filters = {}) {
  return {
    transporteur: String(filters.transporteur || '').trim(),
    fournisseur: String(filters.fournisseur || '').trim(),
    statut: String(filters.statut || '').trim(),
    type_transport: String(filters.typeTransport || filters.type_transport || '').trim(),
    q: String(filters.search || '').trim(),
    all: String(filters.all || '').trim(),
    page: Number(filters.page || 1),
    pageSize: Number(filters.pageSize || 100),
  }
}

// ─── API publique ─────────────────────────────────────────────────────────────

/** KPIs du modèle (MAE, RMSE, R², bestModel, trainedAt, ...) */
export async function getMLMetrics() {
  return mlGet('/api/ml/metrics')
}

/** Comparaison detaillee des modeles testes (MAE/RMSE/R2/CV) */
export async function getMLModelComparison() {
  return mlGet('/api/ml/model-comparison')
}

/** Valeurs distinctes pour tous les dropdowns de filtres */
export async function getMLFilterOptions() {
  return mlGet('/api/ml/filter-options')
}

/** Liste paginée et filtrée des prédictions */
export async function getMLPredictions(filters = {}) {
  return mlGet('/api/ml/predictions', normalizeFilters(filters))
}

/** Top N prédictions avec les plus grandes erreurs absolues */
export async function getTopErrors(limit = 20) {
  return mlGet('/api/ml/top-errors', { limit })
}

/** Répartition par statut (pour donut chart) */
export async function getStatusDistribution() {
  return mlGet('/api/ml/status-distribution')
}

/** Tendance mensuelle de l'erreur % et MAE (pour trend chart) */
export async function getMLTrend() {
  return mlGet('/api/ml/trend')
}

/** MAE moyen par transporteur (pour carrier error chart) */
export async function getMLByCarrier() {
  return mlGet('/api/ml/by-carrier')
}
