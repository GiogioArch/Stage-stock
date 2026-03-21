import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { auth } from '../../lib/supabase'

const AuthContext = createContext(null)

/**
 * AuthProvider — Gère l'état d'authentification
 * Remplace le prop drilling de user/onLogout à travers tous les composants.
 *
 * Usage: const { user, logout, setUser } = useAuth()
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = not logged in

  useEffect(() => {
    auth.getUser().then(u => setUser(u || null))
  }, [])

  const logout = useCallback(() => {
    auth.signOut()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, setUser, logout }), [user, setUser, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
