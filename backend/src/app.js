const express = require('express')
const cors = require('cors')
const session = require('express-session')
const authRoutes = require('./routes/authRoutes')
const testRoutes = require('./routes/testRoutes')

const app = express()
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
const isProduction = process.env.NODE_ENV === 'production'
const sessionSecret = process.env.SESSION_SECRET

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required in .env.')
}

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
)
app.use(express.json())
app.use(
  session({
    name: 'pfe.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
)

app.use('/api/auth', authRoutes)
app.use('/api', testRoutes)

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

module.exports = app
