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

export async function getSupplierStats(days = 365) {
  return dashboardGet('/api/dashboard/supplier', { days })
}
