/**
 * BackStage — Hooks partagés
 *
 * import { useAuth, useToast, useOrg } from '../shared/hooks'
 */

export { AuthProvider, useAuth } from './useAuth'
export { ToastProvider, useToast } from './useToast'
export { OrgProvider, useOrg } from './useOrg'
export { ProjectProvider, useProject } from './useProject'
export { usePersonalData } from './usePersonalData'
export { useProjectData } from './useProjectData'
export { useBoardConfig } from './useBoardConfig'
