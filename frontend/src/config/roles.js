export const roleOptions = [
  {
    value: 'directeur',
    label: 'Directeur',
    description: 'Pilotage global, suivi de la performance et arbitrage.',
  },
  {
    value: 'gestionnaire',
    label: 'Gestionnaire de stock',
    description: 'Suivi des stocks, coordination logistique et disponibilites.',
  },
]
//
const ROLE_ALIASES = {
  directeur: 'directeur',
  gestionnaire: 'gestionnaire',
  admin: 'admin',
  administrateur: 'admin',
}
// This file will contain all the roles related functions and constants
export function normalizeRole(role) {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()

  return ROLE_ALIASES[normalized] || normalized
}

export function getRoleLabel(role) {
  // This function will return the label of the role, 
  // it will be used to display the role in the UI
  const normalizedRole = normalizeRole(role)
 if (normalizedRole === 'admin') {
    return 'admin'}
  if (normalizedRole === 'directeur') {
    return 'Directeur'
  }

  if (normalizedRole === 'gestionnaire') {
    return 'Gestionnaire de stock'
  }

  return 'Role inconnu'
}

export function isAdminRole(role) {
  return normalizeRole(role) === 'admin'
}

export const roleHomePaths = {
  admin: '/admin/dashboard',
  directeur: '/directeur/dashboard',
  gestionnaire: '/gestionnaire-stock/dashboard',
}