const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

async function apiRequest(path, options = {}) {
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function registerRequest(payload) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function logoutRequest() {
  return apiRequest('/api/auth/logout', {
    method: 'POST',
  })
}

export function getCurrentUserRequest() {
  return apiRequest('/api/auth/me')
}
