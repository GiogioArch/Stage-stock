import { useState, useCallback, useMemo, useRef } from 'react'
import { db } from '../../lib/supabase'
import { useProject } from './useProject'
import { useToast } from './useToast'
import { buildBoardConfigFromRoles } from '../../config/boardPresets'

const DEFAULT_BOARD_KEYS = ['stock', 'tournee', 'packing', 'scanner', 'finance', 'achats']

/**
 * useBoardConfig — Gère l'ordre et la visibilité des modules Board
 *
 * Lit depuis membership.board_config (JSONB) et écrit dans project_members.
 * Fallback sur DEFAULT_BOARD_KEYS si pas de config.
 *
 * Usage:
 *   const { boardKeys, isEditing, setEditing, moveUp, moveDown, toggleModule, resetBoard } = useBoardConfig()
 */
export function useBoardConfig() {
  const { membership, reload, userRole } = useProject()
  const onToast = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Memoize config to avoid creating a new {} every render when board_config is null
  const boardConfig = membership?.board_config
  const config = useMemo(() => boardConfig || {}, [boardConfig])
  const allowedModules = membership?.module_access || []

  // Board order: use saved order, filtered by module_access
  const boardKeys = useMemo(() => {
    const order = Array.isArray(config.board_order) && config.board_order.length > 0
      ? config.board_order
      : DEFAULT_BOARD_KEYS
    const hidden = Array.isArray(config.hidden) ? config.hidden : []

    // Filter: only show modules that are in the order AND not hidden
    // Also ensure all DEFAULT keys that aren't in order get appended
    const allKeys = [...new Set([...order, ...DEFAULT_BOARD_KEYS])]
    return allKeys.filter(k =>
      !hidden.includes(k) &&
      (allowedModules.length === 0 || allowedModules.includes(k) || ['scanner', 'packing'].includes(k))
    )
  }, [config.board_order, config.hidden, allowedModules])

  // Full order including hidden (for edit mode)
  const allBoardKeys = useMemo(() => {
    const order = Array.isArray(config.board_order) && config.board_order.length > 0
      ? config.board_order
      : DEFAULT_BOARD_KEYS
    return [...new Set([...order, ...DEFAULT_BOARD_KEYS])]
  }, [config.board_order])

  const hiddenKeys = useMemo(() => {
    return Array.isArray(config.hidden) ? config.hidden : []
  }, [config.hidden])

  // Sections visibility
  const sections = useMemo(() => ({
    alerts: true,
    quick_actions: true,
    packing: true,
    upcoming: true,
    ...config.sections,
  }), [config.sections])

  // Save to Supabase
  const saveConfig = useCallback(async (newConfig) => {
    if (!membership?.id) return
    setSaving(true)
    try {
      await db.update('project_members', `id=eq.${membership.id}`, {
        board_config: { ...config, ...newConfig },
        updated_at: new Date().toISOString(),
      })
      if (reload) reload()
    } catch (e) {
      onToast?.('Erreur sauvegarde board', '#D4648A')
    } finally {
      setSaving(false)
    }
  }, [membership?.id, config, reload])

  const moveUp = useCallback((key) => {
    const order = [...allBoardKeys]
    const idx = order.indexOf(key)
    if (idx <= 0) return
    ;[order[idx - 1], order[idx]] = [order[idx], order[idx - 1]]
    saveConfig({ board_order: order })
  }, [allBoardKeys, saveConfig])

  const moveDown = useCallback((key) => {
    const order = [...allBoardKeys]
    const idx = order.indexOf(key)
    if (idx < 0 || idx >= order.length - 1) return
    ;[order[idx], order[idx + 1]] = [order[idx + 1], order[idx]]
    saveConfig({ board_order: order })
  }, [allBoardKeys, saveConfig])

  const toggleModule = useCallback((key) => {
    const hidden = [...hiddenKeys]
    const idx = hidden.indexOf(key)
    if (idx >= 0) {
      hidden.splice(idx, 1)
    } else {
      hidden.push(key)
    }
    saveConfig({ hidden })
  }, [hiddenKeys, saveConfig])

  const toggleSection = useCallback((sectionId) => {
    saveConfig({ sections: { ...sections, [sectionId]: !sections[sectionId] } })
  }, [sections, saveConfig])

  const resetBoard = useCallback(() => {
    saveConfig({ board_order: DEFAULT_BOARD_KEYS, hidden: [], sections: {} })
  }, [saveConfig])

  // ─── Applique le preset métier (recalcule depuis userRole) ───
  const applyRolePreset = useCallback(() => {
    const codes = userRole?.code ? [userRole.code] : []
    const preset = buildBoardConfigFromRoles(codes)
    saveConfig({
      board_order: preset.board_order,
      hidden: preset.hidden,
    })
  }, [userRole, saveConfig])

  return {
    boardKeys,
    allBoardKeys,
    hiddenKeys,
    sections,
    isEditing: editing,
    setEditing,
    saving,
    moveUp,
    moveDown,
    toggleModule,
    toggleSection,
    resetBoard,
    applyRolePreset,
    DEFAULT_BOARD_KEYS,
  }
}
