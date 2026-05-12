import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const AUTH_TOKEN_STORAGE_KEY = 'pfe_auth_token'

function getAuthToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ''
}

function getRequestHeaders() {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function normalizeFilters(filters = {}) {
  return {
    days: Number(filters.days || 365),
    fromDate: String(filters.fromDate || '').trim(),
    toDate: String(filters.toDate || '').trim(),
    suppliers: Array.isArray(filters.suppliers)
      ? filters.suppliers.map((value) => String(value || '').trim()).filter(Boolean)
      : [],
    origin: String(filters.origin || 'All').trim(),
    vehicleType: String(filters.vehicleType || 'All').trim(),
  }
}

function buildDashboardParams(filters = {}) {
  const normalized = normalizeFilters(filters)
  const params = {
    days: normalized.days,
  }

  if (normalized.fromDate) {
    params.fromDate = normalized.fromDate
  }

  if (normalized.toDate) {
    params.toDate = normalized.toDate
  }

  if (normalized.suppliers.length) {
    params.suppliers = normalized.suppliers.join(',')
  }

  if (normalized.origin && normalized.origin.toLowerCase() !== 'all') {
    params.origin = normalized.origin
  }

  if (normalized.vehicleType && normalized.vehicleType.toLowerCase() !== 'all') {
    params.vehicleType = normalized.vehicleType
  }

  return params
}

async function dashboardGet(path, params = {}) {
  try {
    const response = await axios.get(`${API_BASE_URL}${path}`, {
      params,
      headers: getRequestHeaders(),
      withCredentials: true,
    })

    return response.data
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Impossible de charger les donnees dashboard.'
    throw new Error(message)
  }
}

async function dashboardPost(path, payload = {}) {
  try {
    const response = await axios.post(`${API_BASE_URL}${path}`, payload, {
      headers: getRequestHeaders(),
      withCredentials: true,
    })

    return response.data
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Impossible de charger les donnees dashboard.'
    throw new Error(message)
  }
}

export async function getSupplierStats(days = 365) {
  return dashboardGet('/api/dashboard/supplier', { days })
}

export async function getSupplierOptions(filters = {}) {
  return dashboardGet('/api/dashboard/suppliers/options', buildDashboardParams(filters))
}

export async function getOriginOptions(filters = {}) {
  return dashboardGet('/api/dashboard/origins/options', buildDashboardParams(filters))
}

export async function getVehicleTypeOptions(filters = {}) {
  return dashboardGet('/api/dashboard/vehicle-types/options', buildDashboardParams(filters))
}

export async function getExecutiveOverview(filters = {}) {
  return dashboardGet('/api/dashboard/executive', buildDashboardParams(filters))
}

export async function getSupplierPerformance(filters = {}) {
  return dashboardGet('/api/dashboard/suppliers/performance', buildDashboardParams(filters))
}

export async function getOperationsMonitoring(filters = {}) {
  return dashboardGet('/api/dashboard/operations', buildDashboardParams(filters))
}

export async function createReception(payload = {}) {
  return dashboardPost('/api/dashboard/receptions', payload)
}

export async function getReceptionAlerts(limit = 30) {
  return dashboardGet('/api/dashboard/alerts/receptions', { limit })
}

export async function getImportCostAnalytics(limit = 500) {
  return dashboardGet('/api/dashboard/analytics/import-costs', { limit })
}
