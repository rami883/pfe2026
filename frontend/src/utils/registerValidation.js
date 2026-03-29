import {
  getYazakiIdentifierErrorMessage,
  normalizeYazakiIdentifierInput,
} from './yazakiEmail'
const ALLOWED_ROLES = new Set(['directeur', 'gestionnaire'])

function normalizeText(value) {
  return value?.trim() || ''
}

function isValidName(value) {
  return /^[A-Za-z][A-Za-z '-]{1,49}$/.test(value)
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)
}

export function validateRegisterForm(values = {}) {
  const normalizedValues = {
    nom: normalizeText(values.nom),
    prenom: normalizeText(values.prenom),
    identifier: normalizeText(values.identifier).toLowerCase(),
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

  const normalizedIdentifier = normalizeYazakiIdentifierInput(
    normalizedValues.identifier,
    { allowFullEmail: false },
  )
  if (!normalizedIdentifier.ok) {
    errors.identifier = getYazakiIdentifierErrorMessage(normalizedIdentifier.code, {
      allowFullEmail: false,
    })
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
    values: {
      ...normalizedValues,
      identifier: normalizedIdentifier.ok ? normalizedIdentifier.identifier : '',
      email: normalizedIdentifier.ok ? normalizedIdentifier.email : '',
    },
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}
