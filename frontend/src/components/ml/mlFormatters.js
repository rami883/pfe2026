export function formatCurrency(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return '-'
  }

  return `${parsed.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} \u20AC`
}

export function formatPercent(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return '-'
  }

  return `${parsed.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`
}

export function formatInteger(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return '-'
  }

  return parsed.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}
