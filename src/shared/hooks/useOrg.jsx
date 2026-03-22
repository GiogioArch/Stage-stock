import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

const OrgContext = createContext(null)

/**
 * OrgProvider — Gère le projet/organisation actif
 * Remplace le prop drilling de selectedOrg/membership à travers tous les composants.
 *
 * Usage: const { org, membership, enterProject, backToPersonal } = useOrg()
 */
export function OrgProvider({ children, onLayerChange }) {
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [membership, setMembership] = useState(undefined)
  const [layer, setLayer] = useState('personal') // 'personal' | 'project'

  const enterProject = useCallback((projectMembership) => {
    setMembership(projectMembership)
    setSelectedOrg(projectMembership.org)
    setLayer('project')
    if (onLayerChange) onLayerChange('project')
  }, [onLayerChange])

  const backToPersonal = useCallback(() => {
    setLayer('personal')
    setSelectedOrg(null)
    setMembership(undefined)
    window.scrollTo(0, 0)
    if (onLayerChange) onLayerChange('personal')
  }, [onLayerChange])

  const updateMembership = useCallback((m) => setMembership(m), [])

  const value = useMemo(() => ({
    org: selectedOrg,
    membership,
    layer,
    enterProject,
    backToPersonal,
    updateMembership,
    setSelectedOrg,
  }), [selectedOrg, membership, layer, enterProject, backToPersonal, updateMembership])

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within <OrgProvider>')
  return ctx
}
