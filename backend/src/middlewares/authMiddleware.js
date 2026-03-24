function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      message: 'Authentification requise.',
    })
  }

  return next()
}

module.exports = {
  requireAuth,
}
