const {
  authenticateUser,
  registerUser,
  serializeUserForSession,
} = require('../services/authService')
const {
  validateLoginPayload,
  validateRegistrationPayload,
} = require('../utils/authValidation')

async function login(req, res) {
  const validation = validateLoginPayload(req.body)
  if (!validation.isValid) {
    return res.status(400).json({
      message: 'Veuillez corriger les erreurs du formulaire.',
      errors: validation.errors,
    })
  }

  let user

  try {
    user = await authenticateUser({
      identifier: validation.values.identifier,
      password: validation.values.password,
      role: validation.values.role,
    })
  } catch (error) {
    return res.status(503).json({
      message: "Le service d'authentification est indisponible. Verifiez MongoDB.",
    })
  }

  if (!user) {
    return res.status(401).json({
      message: 'Identifiants invalides ou role incorrect.',
    })
  }

  req.session.user = serializeUserForSession(user)

  return res.status(200).json({
    message: 'Connexion reussie.',
    user: req.session.user,
  })
}

function getCurrentUser(req, res) {
  return res.status(200).json({
    user: req.session.user,
  })
}

function logout(req, res) {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: 'La deconnexion a echoue. Veuillez reessayer.',
      })
    }

    res.clearCookie('pfe.sid')

    return res.status(200).json({
      message: 'Deconnexion reussie.',
    })
  })
}

async function register(req, res) {
  const validation = validateRegistrationPayload(req.body)

  if (!validation.isValid) {
    return res.status(400).json({
      message: 'Veuillez corriger les erreurs du formulaire.',
      errors: validation.errors,
    })
  }

  try {
    const result = await registerUser(validation.values)

    if (result.errorCode === 'EMAIL_ALREADY_EXISTS') {
      return res.status(409).json({
        message: 'Un compte existe deja avec cet email.',
        errors: {
          email: 'Un compte existe deja avec cet email professionnel.',
        },
      })
    }

    return res.status(201).json({
      message: 'Compte cree avec succes. Vous pouvez maintenant vous connecter.',
      user: serializeUserForSession(result.user),
    })
  } catch (error) {
    return res.status(503).json({
      message: "Le service d'inscription est indisponible. Verifiez MongoDB.",
    })
  }
}

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
}
