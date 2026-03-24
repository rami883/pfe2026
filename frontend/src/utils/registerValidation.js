const COMPANY_DOMAIN = 'yazaki-europe.com'
const ALLOWED_ROLES = new Set(['directeur', 'gestionnaire'])

function normalizeText(value) {
  return value?.trim() || ''
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase()
}

function isValidName(value) {
  return /^[A-Za-z][A-Za-z '-]{1,49}$/.test(value)
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isProfessionalEmail(email) {
  const domain = email.split('@')[1]
  if (!domain) {
    return false
  }

  return domain === COMPANY_DOMAIN
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)
}

export function validateRegisterForm(values = {}) {
  const normalizedValues = {
    nom: normalizeText(values.nom),
    prenom: normalizeText(values.prenom),
    email: normalizeEmail(values.email),
    role: normalizeText(values.role).toLowerCase(),
    password: values.password || '',
    confirmPassword: values.confirmPassword || '',
  }

  const errors = {}

  if (!normalizedValues.nom) {
    errors.nom = 'Le nom est requis.'
  } else if (!isValidName(normalizedValues.nom)) {
    errors.nom = 'Le nom est invalide.'
  }

  if (!normalizedValues.prenom) {
    errors.prenom = 'Le prenom est requis.'
  } else if (!isValidName(normalizedValues.prenom)) {
    errors.prenom = 'Le prenom est invalide.'
  }

  if (!normalizedValues.email) {
    errors.email = "L'email professionnel est requis."
  } else if (!isValidEmail(normalizedValues.email)) {
    errors.email = "Le format de l'email est invalide."
  } else if (!isProfessionalEmail(normalizedValues.email)) {
    errors.email = "L'email doit se terminer par @yazaki-europe.com."
  }

  if (!normalizedValues.role) {
    errors.role = 'Le role est requis.'
  } else if (!ALLOWED_ROLES.has(normalizedValues.role)) {
    errors.role = 'Le role selectionne est invalide.'
  }

  if (!normalizedValues.password) {
    errors.password = 'Le mot de passe est requis.'
  } else if (!isStrongPassword(normalizedValues.password)) {
    errors.password =
      '8 caracteres min, avec majuscule, minuscule et chiffre.'
  }

  if (!normalizedValues.confirmPassword) {
    errors.confirmPassword = 'La confirmation est requise.'
  } else if (normalizedValues.confirmPassword !== normalizedValues.password) {
    errors.confirmPassword = 'Les mots de passe ne correspondent pas.'
  }

  return {
    values: normalizedValues,
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}
