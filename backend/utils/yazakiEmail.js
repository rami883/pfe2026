export const YAZAKI_EMAIL_DOMAIN = 'yazaki-europe.com'
export const YAZAKI_EMAIL_SUFFIX = `@${YAZAKI_EMAIL_DOMAIN}`

const LOCAL_PART_PATTERN = /^(?=.{1,64}$)[a-z0-9]+(?:[._-][a-z0-9]+)*$/

function normalizeRawValue(value) {
  return String(value ?? '')
}

export function normalizeYazakiIdentifierInput(
  value,
  { allowFullEmail = true } = {},
) {
  const rawValue = normalizeRawValue(value)
  const trimmedValue = rawValue.trim()
  const normalizedValue = trimmedValue.toLowerCase()

  if (!trimmedValue) {
    return { ok: false, code: 'empty' }
  }

  if (rawValue !== trimmedValue) {
    return { ok: false, code: 'outer_spaces' }
  }

  if (/\s/.test(trimmedValue)) {
    return { ok: false, code: 'spaces' }
  }

  if (normalizedValue.includes('@')) {
    if (!allowFullEmail) {
      return { ok: false, code: 'contains_at' }
    }

    const parts = normalizedValue.split('@')
    if (parts.length !== 2) {
      return { ok: false, code: 'invalid_format' }
    }

    const [localPart, domain] = parts

    if (!localPart) {
      return { ok: false, code: 'missing_local' }
    }

    if (domain !== YAZAKI_EMAIL_DOMAIN) {
      return { ok: false, code: 'invalid_domain' }
    }

    if (!LOCAL_PART_PATTERN.test(localPart)) {
      return { ok: false, code: 'invalid_local' }
    }

    return {
      ok: true,
      identifier: localPart,
      email: `${localPart}${YAZAKI_EMAIL_SUFFIX}`,
    }
  }

  if (!LOCAL_PART_PATTERN.test(normalizedValue)) {
    return { ok: false, code: 'invalid_local' }
  }

  return {
    ok: true,
    identifier: normalizedValue,
    email: `${normalizedValue}${YAZAKI_EMAIL_SUFFIX}`,
  }
}

export function getYazakiIdentifierErrorMessage(
  code,
  { allowFullEmail = true } = {},
) {
  if (code === 'empty') {
    return "L'identifiant professionnel est requis."
  }

  if (code === 'outer_spaces') {
    return "Supprimez les espaces au debut et a la fin de l'identifiant."
  }

  if (code === 'spaces') {
    return "L'identifiant professionnel ne doit pas contenir d'espaces."
  }

  if (code === 'contains_at') {
    return "Saisissez uniquement la partie avant @. Le domaine est ajoute automatiquement."
  }

  if (code === 'invalid_domain') {
    return "Seules les adresses @yazaki-europe.com sont autorisees."
  }

  if (code === 'missing_local') {
    return 'La partie avant @ est obligatoire.'
  }

  if (code === 'invalid_format') {
    return "Le format de l'identifiant est invalide."
  }

  if (code === 'invalid_local') {
    return "L'identifiant contient des caracteres invalides (utilisez lettres, chiffres, point, tiret ou underscore)."
  }

  if (allowFullEmail) {
    return "Saisissez un identifiant valide (ex: rami.bhk) ou une adresse @yazaki-europe.com."
  }

  return "Saisissez un identifiant professionnel valide (ex: rami.bhk)."
}
