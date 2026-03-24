import { useEffect, useState } from 'react'
import {
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
} from '../api/authApi'
import AuthContext from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      try {
        const response = await getCurrentUserRequest()

        if (isMounted) {
          setUser(response.user)
        }
      } catch (error) {
        if (isMounted && error.status !== 401) {
          console.error('Unable to restore session:', error)
        }
      } finally {
        if (isMounted) {
          setAuthReady(true)
        }
      }
    }

    loadSession()

    return () => {
      isMounted = false
    }
  }, [])

  async function login(credentials) {
    const response = await loginRequest(credentials)
    setUser(response.user)
    return response.user
  }

  async function logout() {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isAuthenticated: Boolean(user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
