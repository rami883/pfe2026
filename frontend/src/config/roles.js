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

export const roleHomePaths = {
  directeur: '/directeur/dashboard',
  gestionnaire: '/gestionnaire-stock/dashboard',
}
