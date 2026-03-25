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

const ROLE_ALIASES = {
  directeur: 'directeur',
  gestionnaire: 'gestionnaire',
  'gestionnaire-stock': 'gestionnaire',
  gestionnaire_stock: 'gestionnaire',
}

export function normalizeRole(role) {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()

  return ROLE_ALIASES[normalized] || normalized
}

export function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role)

  if (normalizedRole === 'directeur') {
    return 'Directeur'
  }

  if (normalizedRole === 'gestionnaire') {
    return 'Gestionnaire de stock'
  }

  return 'Role inconnu'
}

export const roleHomePaths = {
  directeur: '/directeur/dashboard',
  gestionnaire: '/gestionnaire-stock/dashboard',
  'gestionnaire-stock': '/gestionnaire-stock/dashboard',
  gestionnaire_stock: '/gestionnaire-stock/dashboard',
}
