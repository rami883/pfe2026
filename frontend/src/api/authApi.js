const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const AUTH_TOKEN_STORAGE_KEY = 'pfe_auth_token'

function getStoredToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ''
}

function setStoredToken(token) {
  if (typeof window === 'undefined') {
    return
  }

  if (!token) {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

function normalizeUserPayload(payload) {
  if (!payload) {
    return null
  }

  if (payload.user && typeof payload.user === 'object') {
    return payload.user
  }

  return payload
}

function mapRoleToBackend(role) {
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase()

  if (normalizedRole === 'directeur' || normalizedRole === 'administrateur') {
    return 'directeur'
  }

  if (
    normalizedRole === 'gestionnaire' ||
    normalizedRole === 'gestionnaire-stock' ||
    normalizedRole === 'gestionnaire_stock' ||
    normalizedRole === 'gestionnaire de stock'
  ) {
    return 'gestionnaire'
  }

  return normalizedRole
}

function buildRegisterPayload(payload = {}) {
  const firstName = String(payload.prenom || '').trim()
  const lastName = String(payload.nom || '').trim()
  const computedUsername = `${firstName} ${lastName}`.trim()

  return {
    username: String(payload.username || computedUsername).trim(),
    email: String(payload.email || '')
      .trim()
      .toLowerCase(),
    password: payload.password || '',
    role: mapRoleToBackend(payload.role),
  }
}

function buildLoginPayload(payload = {}) {
  const email = String(payload.email || payload.identifier || '')
    .trim()
    .toLowerCase()

  return {
    email,
    password: payload.password || '',
  }
}

async function apiRequest(path, options = {}) {
  const token = getStoredToken()
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config)
  const isJsonResponse =
    response.headers.get('content-type')?.includes('application/json') ?? false
  const data = isJsonResponse ? await response.json() : null

  if (!response.ok) {
    const error = new Error(
      data?.message || 'Une erreur est survenue pendant la requete.',
    )
    error.status = response.status
    error.details = data?.errors || null
    throw error
  }

  return data
}

export function loginRequest(payload) {
  return apiRequest('/api/users/login', {
    method: 'POST',
    body: JSON.stringify(buildLoginPayload(payload)),
  }).then((data) => {
    const token = data?.token || data?.user?.token || ''
    const user = normalizeUserPayload(data)

    setStoredToken(token)

    if (user?.token) {
      const safeUser = { ...user }
      delete safeUser.token
      return { user: safeUser }
    }

    return { user }
  })
}

export function registerRequest(payload) {
  return apiRequest('/api/users/register', {
    method: 'POST',
    body: JSON.stringify(buildRegisterPayload(payload)),
  })
}

export function logoutRequest() {
  setStoredToken('')
  return Promise.resolve({ success: true })
}

export function getCurrentUserRequest() {
  return apiRequest('/api/users/me').then((data) => ({
    user: normalizeUserPayload(data),
  }))
}
