import { useState, useCallback, useEffect, useMemo } from 'react'
import { db, safe } from '../../lib/supabase'
import { ROLE_CONF } from '../../components/RolePicker'

// Admin role codes that see everything
const ADMIN_CODES = ['TM', 'PM', 'LOG', 'PA']

/**
 * useProjectData — Charge les données du projet actif (couche 3)
 *
 * Gère: chargement par tables requises, filtrage par rôle,
 * profil utilisateur, alertes stock, auto-refresh.
 */
export function useProjectData(user, selectedOrg, requiredTables) {
  const [data, setData] = useState({
    products: [], families: [], subfamilies: [],
    locations: [],
    stock: [], movements: [],
    events: [], checklists: [], event_packing: [],
    user_profiles: [], roles: [],
    product_depreciation: [],
    project_members: [],
    event_tasks: [],
    event_task_templates: [],
    user_availability: [],
    // Finance & Ventes
    expenses: [], sales: [], sale_items: [], cash_reports: [],
    // Achats
    suppliers: [], purchase_orders: [], purchase_order_lines: [], purchase_receipts: [],
    // Transport
    transport_providers: [], vehicles: [], transport_routes: [],
    transport_needs: [], transport_bookings: [], transport_manifests: [], transport_costs: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Role state
  const [userRole, setUserRole] = useState(undefined)
  const [userProfile, setUserProfile] = useState(null)
  const [membership, setMembership] = useState(undefined)

  // Load user profile & role
  const loadUserProfile = useCallback(async (userId, rolesData) => {
    try {
      const profiles = await db.get('user_profiles', `user_id=eq.${userId}`)
      if (profiles && profiles.length > 0) {
        const profile = profiles[0]
        setUserProfile(profile)
        if (profile.role_id && rolesData && rolesData.length > 0) {
          setUserRole(rolesData.find(r => r.id === profile.role_id) || null)
        } else {
          setUserRole(null)
        }
      } else {
        setUserProfile(null)
        setUserRole(null)
      }
    } catch {
      setUserProfile(null)
      setUserRole(null)
    }
  }, [])

  // Load project data (only tables required by active modules)
  const loadAll = useCallback(async () => {
    if (!user || !selectedOrg) return
    setLoading(true)
    setError(null)
    try {
      const tableEntries = Object.entries(requiredTables)
      const [mainResults, members] = await Promise.all([
        Promise.all(tableEntries.map(([table, query]) => {
          if (table === 'roles' || table === 'product_depreciation') return safe(table, query)
          const orgFilter = `org_id=eq.${selectedOrg.id}`
          const combined = query ? `${orgFilter}&${query}` : orgFilter
          return safe(table, combined)
        })),
        safe('project_members', `org_id=eq.${selectedOrg.id}`),
      ])
      setData(prev => {
        const next = { ...prev, project_members: members }
        tableEntries.forEach(([table], i) => { next[table] = mainResults[i] })
        return next
      })

      const myMembership = members.find(m => m.user_id === user.id)
      if (myMembership) setMembership(myMembership)

      const rolesIdx = tableEntries.findIndex(([t]) => t === 'roles')
      const rolesData = rolesIdx >= 0 ? mainResults[rolesIdx] : []
      await loadUserProfile(user.id, rolesData)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user, selectedOrg, requiredTables, loadUserProfile])

  useEffect(() => {
    if (user && selectedOrg) loadAll()
  }, [user, selectedOrg, loadAll])

  // Filtered data based on user role
  const isAdmin = useMemo(() => {
    if (!userRole) return true
    return ADMIN_CODES.includes(userRole.code)
  }, [userRole])

  const filteredProducts = useMemo(() => {
    if (isAdmin || !userRole) return data.products
    const subfamIds = userRole.subfamily_ids || []
    if (subfamIds.length === 0) return data.products
    return data.products.filter(p => p.subfamily_id && subfamIds.includes(p.subfamily_id))
  }, [data.products, userRole, isAdmin])

  const filteredStock = useMemo(() => {
    if (isAdmin || !userRole) return data.stock
    const ids = new Set(filteredProducts.map(p => p.id))
    return data.stock.filter(s => ids.has(s.product_id))
  }, [data.stock, filteredProducts, userRole, isAdmin])

  const filteredMovements = useMemo(() => {
    if (isAdmin || !userRole) return data.movements
    const ids = new Set(filteredProducts.map(p => p.id))
    return data.movements.filter(m => ids.has(m.product_id))
  }, [data.movements, filteredProducts, userRole, isAdmin])

  // Alerts
  const alerts = useMemo(() =>
    filteredProducts.map(p => {
      const totalStock = filteredStock.filter(s => s.product_id === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0)
      const minStock = p.min_stock || 5
      if (totalStock <= 0) return { ...p, currentStock: totalStock, minStock, level: 'rupture' }
      if (totalStock <= minStock) return { ...p, currentStock: totalStock, minStock, level: 'alerte' }
      return null
    }).filter(Boolean),
    [filteredProducts, filteredStock]
  )

  const reset = useCallback(() => {
    setUserRole(undefined)
    setUserProfile(null)
    setMembership(undefined)
  }, [])

  return {
    data,
    loading,
    error,
    userRole, setUserRole,
    userProfile,
    membership, setMembership,
    isAdmin,
    filteredProducts,
    filteredStock,
    filteredMovements,
    alerts,
    loadAll,
    reset,
  }
}
