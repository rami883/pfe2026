const COMPANY_DOMAIN = 'yazaki-europe.com'
const ROLE_ALIASES = {
  directeur: 'directeur',
  gestionnaire: 'gestionnaire',
  'gestionnaire-stock': 'gestionnaire',
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase()
}

function isValidName(value) {
  return /^[A-Za-z][A-Za-z '-]{1,49}$/.test(value)
}

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isCompanyEmail(email) {
  const domain = email.split('@')[1]
  if (!domain) {
    return false
  }

  return domain === COMPANY_DOMAIN
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)
}

function normalizeRole(value) {
  const normalized = normalizeText(value).toLowerCase()
  return ROLE_ALIASES[normalized] || null
}

function validateRegistrationPayload(payload = {}) {
  const normalizedRole = normalizeRole(payload.role)
  const normalizedPayload = {
    nom: normalizeText(payload.nom),
    prenom: normalizeText(payload.prenom),
    email: normalizeEmail(payload.email),
    role: normalizedRole,
    password: typeof payload.password === 'string' ? payload.password : '',
    confirmPassword:
      typeof payload.confirmPassword === 'string' ? payload.confirmPassword : '',
  }

  const errors = {}

  if (!normalizedPayload.nom) {
    errors.nom = 'Le nom est requis.'
  } else if (!isValidName(normalizedPayload.nom)) {
    errors.nom = 'Le nom doit contenir uniquement des lettres et des caracteres usuels.'
  }

  if (!normalizedPayload.prenom) {
    errors.prenom = 'Le prenom est requis.'
  } else if (!isValidName(normalizedPayload.prenom)) {
    errors.prenom = 'Le prenom doit contenir uniquement des lettres et des caracteres usuels.'
  }

  if (!normalizedPayload.email) {
    errors.email = "L'email professionnel est requis."
  } else if (!isValidEmailFormat(normalizedPayload.email)) {
    errors.email = "Le format de l'email est invalide."
  } else if (!isCompanyEmail(normalizedPayload.email)) {
    errors.email = `L'email doit se terminer par @${COMPANY_DOMAIN}.`
  }

  if (!payload.role) {
    errors.role = 'Le role est requis.'
  } else if (!normalizedRole) {
    errors.role = 'Le role selectionne est invalide.'
  }

  if (!normalizedPayload.password) {
    errors.password = 'Le mot de passe est requis.'
  } else if (!isStrongPassword(normalizedPayload.password)) {
    errors.password =
      'Le mot de passe doit contenir 8 caracteres minimum, avec majuscule, minuscule et chiffre.'
  }

  if (!normalizedPayload.confirmPassword) {
    errors.confirmPassword = 'La confirmation du mot de passe est requise.'
  } else if (normalizedPayload.confirmPassword !== normalizedPayload.password) {
    errors.confirmPassword = 'La confirmation du mot de passe ne correspond pas.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    values: normalizedPayload,
  }
}

function validateLoginPayload(payload = {}) {
  const normalizedRole = normalizeRole(payload.role)
  const values = {
    identifier: normalizeEmail(payload.identifier),
    password: typeof payload.password === 'string' ? payload.password : '',
    role: normalizedRole,
  }

  const errors = {}

  if (!values.identifier) {
    errors.identifier = "L'identifiant ou email est requis."
  }

  if (!values.password) {
    errors.password = 'Le mot de passe est requis.'
  }

  if (!payload.role) {
    errors.role = 'Le role est requis.'
  } else if (!normalizedRole) {
    errors.role = 'Le role selectionne est invalide.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    values,
  }
}

module.exports = {
  normalizeRole,
  validateLoginPayload,
  validateRegistrationPayload,
}
