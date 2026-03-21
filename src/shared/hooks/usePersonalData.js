import { useState, useCallback, useEffect, useMemo } from 'react'
import { db, safe } from '../../lib/supabase'

/**
 * usePersonalData — Charge les données personnelles de l'utilisateur
 * (projets, détails, matériel, disponibilités, revenus, événements)
 *
 * Extrait de App.jsx pour réduire la taille du composant principal.
 */
export function usePersonalData(user) {
  const [allProjects, setAllProjects] = useState([])
  const [userDetails, setUserDetails] = useState(null)
  const [userGear, setUserGear] = useState([])
  const [userAvailability, setUserAvailability] = useState([])
  const [userIncome, setUserIncome] = useState([])
  const [personalEvents, setPersonalEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // Load projects (memberships enriched with org)
      const memberships = await safe('project_members', `user_id=eq.${user.id}&status=neq.disabled`)
      let enriched = []
      try {
        const orgs = await db.get('organizations')
        const orgMap = {}
        ;(orgs || []).forEach(o => { orgMap[o.id] = o })
        enriched = (memberships || []).map(m => ({ ...m, org: orgMap[m.org_id] || { name: 'Projet', slug: 'default' } }))
      } catch {
        enriched = (memberships || []).map(m => ({ ...m, org: { name: 'Projet', slug: 'default' } }))
      }
      setAllProjects(enriched)

      // Load user_details + gear + availability + income
      try {
        const detailsRows = await safe('user_details', `user_id=eq.${user.id}`)
        setUserDetails(detailsRows && detailsRows.length > 0 ? detailsRows[0] : null)
      } catch { setUserDetails(null) }
      try { setUserGear(await safe('user_gear', `user_id=eq.${user.id}&order=created_at.desc`)) } catch { setUserGear([]) }
      try { setUserAvailability(await safe('user_availability', `user_id=eq.${user.id}`)) } catch { setUserAvailability([]) }
      try { setUserIncome(await safe('user_income', `user_id=eq.${user.id}&order=date.desc`)) } catch { setUserIncome([]) }

      // Load events across all user's projects for personal calendar
      try {
        const orgIds = enriched.map(m => m.org_id).filter(Boolean)
        if (orgIds.length > 0) {
          const evts = await safe('events', `org_id=in.(${orgIds.join(',')})&order=date.asc`)
          setPersonalEvents(evts || [])
        } else { setPersonalEvents([]) }
      } catch { setPersonalEvents([]) }
    } catch {
      setAllProjects([])
      setUserDetails(null)
      setUserGear([])
      setUserAvailability([])
      setUserIncome([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const reset = useCallback(() => {
    setAllProjects([])
    setUserDetails(null)
    setUserGear([])
    setUserAvailability([])
    setUserIncome([])
    setPersonalEvents([])
  }, [])

  return useMemo(() => ({
    allProjects,
    userDetails, setUserDetails,
    userGear,
    userAvailability,
    userIncome,
    personalEvents,
    loading,
    reload: load,
    reset,
  }), [allProjects, userDetails, userGear, userAvailability, userIncome,
    personalEvents, loading, load, reset])
}
