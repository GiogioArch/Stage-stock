import React, { createContext, useContext } from 'react'

const ProjectContext = createContext(null)

/**
 * ProjectProvider — Expose les données projet transversales
 *
 * Élimine le prop drilling de: orgId, selectedOrg, reload, userRole, isAdmin, membership
 *
 * Usage dans un composant enfant:
 *   const { orgId, reload, userRole, isAdmin } = useProject()
 */
export function ProjectProvider({ value, children }) {
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within <ProjectProvider>')
  return ctx
}
