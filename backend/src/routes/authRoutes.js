const express = require('express')
const {
  register,
  login,
  getCurrentUser,
  logout,
} = require('../controllers/authController')
const { requireAuth } = require('../middlewares/authMiddleware')

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', requireAuth, getCurrentUser)
router.post('/logout', requireAuth, logout)

module.exports = router
