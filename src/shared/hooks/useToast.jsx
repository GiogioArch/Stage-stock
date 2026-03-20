import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ToastContext = createContext(null)

/**
 * ToastProvider — Gère les toasts de notification
 * Remplace le prop drilling de onToast à travers tous les composants.
 *
 * Usage: const toast = useToast()
 *        toast('Profil enregistré')
 *        toast('Erreur !', '#D4648A')
 */
export function ToastProvider({ children }) {
  const [current, setCurrent] = useState(null)

  const showToast = useCallback((message, color) => {
    setCurrent({ message, color: color || '#5DAB8B' })
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {current && <ToastBubble message={current.message} color={current.color} onDone={() => setCurrent(null)} />}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

function ToastBubble({ message, color, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])

  return <div className="toast" style={{ background: color }}>{message}</div>
}
