import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react'
import { auth, db, safe } from './lib/supabase'
import { MODULES, getActiveModuleIds, setActiveModuleIds, getRequiredTables, getActiveTabs, TAB_GROUPS } from './modules/registry'

// ─── Essential components (always loaded) ───
import Auth from './components/Auth'
import Scanner from './components/Scanner'
import MovementModal from './components/MovementModal'
import RolePicker, { ROLE_CONF } from './components/RolePicker'
import Landing from './components/Landing'
import Onboarding from './components/Onboarding'
import MelodieWelcome from './components/MelodieWelcome'
import { Toast } from './components/UI'
import { ModuleBoundary } from './components/ErrorBoundary'
import { AppProvider } from './contexts/AppContext'

// ─── Lazy-loaded modules (code-split) ───
const Board = lazy(() => import('./components/Board'))
const Products = lazy(() => import('./components/Products'))
const Stocks = lazy(() => import('./components/Stocks'))
const Checklists = lazy(() => import('./components/Checklists'))
const Movements = lazy(() => import('./components/Movements'))
const Alerts = lazy(() => import('./components/Alerts'))
const Tour = lazy(() => import('./components/Tour'))
const Depots = lazy(() => import('./components/Depots'))
const Equipe = lazy(() => import('./components/Equipe'))
const Finance = lazy(() => import('./components/Finance'))
const Forecast = lazy(() => import('./components/Forecast'))
const Transport = lazy(() => import('./components/Transport'))
const ConcertMode = lazy(() => import('./components/ConcertMode'))
const Achats = lazy(() => import('./components/Achats'))
const Inventaire = lazy(() => import('./components/Inventaire'))
const Settings = lazy(() => import('./modules/Settings'))
const ProfilePage = lazy(() => import('./components/ProfilePage'))
const PersonalDashboard = lazy(() => import('./components/PersonalDashboard'))
const MyProjects = lazy(() => import('./components/MyProjects'))
const Feedback = lazy(() => import('./components/Feedback'))
const CGU = lazy(() => import('./components/Legal').then(m => ({ default: m.CGU })))
const Privacy = lazy(() => import('./components/Legal').then(m => ({ default: m.Privacy })))
import { Home, FolderOpen, Calendar, User, LogOut, Camera, AlertTriangle, ChevronLeft, Settings as SettingsIcon, WifiOff, Box, Package, Warehouse, ClipboardList, Users, Coins, Bell, TrendingUp, ShoppingCart, ShoppingBag, ClipboardCheck, Truck, BarChart3 } from 'lucide-react'

// ─── EK LIVE (fan-facing, no auth) ───
import LiveApp from './live/LiveApp'
import LiveDisplay from './live/LiveDisplay'

// Lazy loading fallback
function LazyFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <div className="loader" />
    </div>
  )
}

// Admin role codes that see everything
const ADMIN_CODES = ['TM', 'PM', 'LOG', 'PA']

// Icon map for module tabs (replaces emojis from registry)
const TAB_ICONS = {
  dashboard: BarChart3, board: BarChart3, tournee: Calendar, articles: Package,
  depots: Warehouse, stock: ClipboardList, equipe: Users, finance: Coins,
  alertes: Bell, forecast: TrendingUp, ventes: ShoppingCart,
  achats: ShoppingBag, inventaire: ClipboardCheck, transport: Truck,
  settings: SettingsIcon, reglages: SettingsIcon, 'stock-group': Package,
}

// Personal layer tabs
const PERSONAL_TABS = [
  { id: 'home', label: 'Accueil', Icon: Home },
  { id: 'projects', label: 'Projets', Icon: FolderOpen },
  { id: 'calendar', label: 'Calendrier', Icon: Calendar },
  { id: 'profile', label: 'Profil', Icon: User },
]

export default function App() {
  // ─── Auth state ───
  const [user, setUser] = useState(undefined)
  const [toast, setToast] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [legalPage, setLegalPage] = useState(null) // 'cgu' | 'privacy' | null

  // ─── Layer navigation: 'personal' (couche 2) | 'project' (couche 3) ───
  const [layer, setLayer] = useState('personal')
  const [personalTab, setPersonalTab] = useState('home')

  // ─── Personal layer data ───
  const [allProjects, setAllProjects] = useState([])
  const [userDetails, setUserDetails] = useState(null)
  const [userGear, setUserGear] = useState([])
  const [userAvailability, setUserAvailability] = useState([])
  const [userIncome, setUserIncome] = useState([])
  const [personalEvents, setPersonalEvents] = useState([])
  const [personalLoading, setPersonalLoading] = useState(true)
  const [pendingInvitation, setPendingInvitation] = useState(null)

  // ─── Module state ───
  const [activeModuleIds, setActiveModules] = useState(getActiveModuleIds)
  const [tab, setTab] = useState('board')

  // ─── Project state (couche 3) ───
  const [membership, setMembership] = useState(undefined)
  const [selectedOrg, setSelectedOrg] = useState(null)

  // ─── Role state ───
  const [userRole, setUserRole] = useState(undefined)
  const [userProfile, setUserProfile] = useState(null)

  // ─── Data state (flat store — modules pull what they need) ───
  // Empty shape used for initial state AND for resets on project switch
  // (P0-9: data leak — without reset, loadAll() merges new projet onto old)
  const EMPTY_DATA = useMemo(() => ({
    products: [], families: [], subfamilies: [],
    locations: [],
    stock: [], movements: [],
    events: [], checklists: [], event_packing: [],
    user_profiles: [], roles: [],
    product_depreciation: [],
    project_members: [],
    suppliers: [], purchase_orders: [], purchase_order_lines: [],
    expenses: [], sales: [],
    transport_providers: [], vehicles: [], transport_routes: [],
    transport_needs: [], transport_bookings: [], transport_manifests: [],
    transport_costs: [],
  }), [])
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Switching flag: true while we're transitioning between projects.
  // Prevents the previous project's data from flashing through before loadAll() resolves.
  const [switching, setSwitching] = useState(false)

  // ─── Scanner & modal state ───
  const [showScanner, setShowScanner] = useState(false)
  const [moveModal, setMoveModal] = useState(null)

  // ─── Offline ───
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // ─── Legal page listener (from Landing) ───
  useEffect(() => {
    const handler = (e) => setLegalPage(e.detail)
    window.addEventListener('show-legal', handler)
    return () => window.removeEventListener('show-legal', handler)
  }, [])

  // ─── Scroll position per tab (BUG-009) ───
  const scrollPositions = useRef({})
  const handleTabChange = useCallback((newTab) => {
    scrollPositions.current[tab] = window.scrollY
    setTab(newTab)
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositions.current[newTab] || 0)
    })
  }, [tab])

  // ─── Toast helper ───
  const showToast = useCallback((message, color) => {
    setToast({ message, color: color || '#5DAB8B' })
  }, [])

  // ─── Auth check ───
  useEffect(() => {
    auth.getUser().then(u => setUser(u || null))
  }, [])

  // ═══════════════════════════════════════════════
  // COUCHE 2 — Personal layer data loading
  // ═══════════════════════════════════════════════

  const loadPersonalData = useCallback(async () => {
    if (!user) return
    setPersonalLoading(true)
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

      // Check for pending invitations by email (for newly registered users)
      if (enriched.length === 0 && user.email) {
        try {
          const invites = await safe('project_members', `email=eq.${user.email}&status=eq.invited`)
          if (invites && invites.length > 0) {
            const inv = invites[0]
            // Fetch org name and inviter name
            let orgName = 'Projet'
            let inviterName = ''
            try {
              const orgsData = await db.get('organizations', `id=eq.${inv.org_id}`)
              if (orgsData && orgsData[0]) orgName = orgsData[0].name
            } catch { /* silent */ }
            try {
              if (inv.invited_by) {
                const profiles = await safe('user_details', `user_id=eq.${inv.invited_by}`)
                if (profiles && profiles[0]?.first_name) inviterName = profiles[0].first_name
              }
            } catch { /* silent */ }
            setPendingInvitation({
              id: inv.id,
              org_id: inv.org_id,
              org_name: orgName,
              invited_by_name: inviterName,
              module_access: inv.module_access,
            })
          } else {
            setPendingInvitation(null)
          }
        } catch { setPendingInvitation(null) }
      } else {
        setPendingInvitation(null)
      }

      // Load user_details + gear + availability + income + events in parallel
      const orgIds = enriched.map(m => m.org_id).filter(Boolean)
      const [detailsRes, gearRes, availRes, incomeRes, eventsRes] = await Promise.allSettled([
        safe('user_details', `user_id=eq.${user.id}`),
        safe('user_gear', `user_id=eq.${user.id}&order=created_at.desc`),
        safe('user_availability', `user_id=eq.${user.id}`),
        safe('user_income', `user_id=eq.${user.id}&order=date.desc`),
        orgIds.length > 0 ? safe('events', `org_id=in.(${orgIds.join(',')})&order=date.asc`) : Promise.resolve([]),
      ])
      const val = (r, fallback) => r.status === 'fulfilled' ? r.value : fallback
      setUserDetails(val(detailsRes, null)?.[0] || null)
      setUserGear(val(gearRes, []) || [])
      setUserAvailability(val(availRes, []) || [])
      setUserIncome(val(incomeRes, []) || [])
      setPersonalEvents(val(eventsRes, []) || [])
    } catch {
      setAllProjects([])
      setUserDetails(null)
      setUserGear([])
      setUserAvailability([])
      setUserIncome([])
    } finally {
      setPersonalLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) loadPersonalData()
  }, [user, loadPersonalData])

  // ═══════════════════════════════════════════════
  // COUCHE 3 — Project layer
  // ═══════════════════════════════════════════════

  // ─── Active tabs from registry (filtered by user's module_access) ───
  const tabs = useMemo(() => {
    const moduleTabs = getActiveTabs(activeModuleIds)
    const allowedModules = membership?.module_access
    const filtered = allowedModules
      ? moduleTabs.filter(t => allowedModules.includes(t.moduleId || t.id))
      : moduleTabs
    const result = [...filtered]
    // Settings tab is ALWAYS visible at the end, regardless of config
    if (!result.find(t => t.id === 'settings')) {
      result.push({ id: 'settings', label: 'Config', icon: 'settings', moduleId: 'settings' })
    }
    return result
  }, [activeModuleIds, membership])

  // ─── Tab groups for bottom nav ───
  const activeGroups = useMemo(() => {
    const activeTabIds = new Set(tabs.map(t => t.id))
    return TAB_GROUPS
      .map(group => {
        const groupTabs = group.tabIds
          .map(id => tabs.find(t => t.id === id))
          .filter(Boolean)
        if (groupTabs.length === 0) return null
        return { ...group, groupTabs }
      })
      .filter(Boolean)
  }, [tabs])

  const currentGroup = useMemo(() =>
    activeGroups.find(g => g.groupTabs.some(t => t.id === tab)) || activeGroups[0],
    [activeGroups, tab]
  )

  // ─── Ensure current tab is valid when modules change ───
  useEffect(() => {
    if (layer === 'project' && !tabs.find(t => t.id === tab)) {
      setTab('board')
    }
  }, [tabs, tab, layer])

  // ─── Required tables based on active modules ───
  const requiredTables = useMemo(() =>
    getRequiredTables(activeModuleIds),
    [activeModuleIds]
  )

  // ─── Load user profile & role ───
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

  // ─── Load project data (only tables required by active modules) ───
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

      // Also refresh user_details
      try {
        const detailsRows = await safe('user_details', `user_id=eq.${user.id}`)
        setUserDetails(detailsRows && detailsRows.length > 0 ? detailsRows[0] : null)
      } catch { setUserDetails(null) }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setSwitching(false)
    }
  }, [user, selectedOrg, requiredTables, loadUserProfile])

  useEffect(() => {
    if (user && selectedOrg) loadAll()
  }, [user, selectedOrg, loadAll])

  // Smart refresh: reload data when user returns to the app (focus/visibility)
  // Replaces dumb 30s polling — saves bandwidth, avoids overlapping requests
  useEffect(() => {
    if (!user || layer !== 'project') return
    let lastRefresh = Date.now()
    const REFRESH_COOLDOWN = 30000 // min 30s between refreshes

    const handleRefresh = () => {
      if (moveModal || showScanner) return
      if (Date.now() - lastRefresh < REFRESH_COOLDOWN) return
      lastRefresh = Date.now()
      loadAll()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleRefresh()
    }
    const onFocus = () => handleRefresh()

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [user, layer, loadAll, moveModal, showScanner])

  // ─── Filtered data based on user role ───
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

  // ─── Alerts ───
  const alerts = useMemo(() =>
    filteredProducts.filter(p => p.active !== false).map(p => {
      const totalStock = filteredStock.filter(s => s.product_id === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0)
      const minStock = p.min_stock || 5
      if (totalStock <= 0) return { ...p, currentStock: totalStock, minStock, level: 'rupture' }
      if (totalStock <= minStock) return { ...p, currentStock: totalStock, minStock, level: 'alerte' }
      return null
    }).filter(Boolean),
    [filteredProducts, filteredStock]
  )

  // ─── Module change handler ───
  const handleModulesChanged = useCallback((newIds) => {
    setActiveModules(newIds)
  }, [])

  // ─── Check if a module is active ───
  const isModuleActive = useCallback((moduleId) =>
    activeModuleIds.includes(moduleId),
    [activeModuleIds]
  )

  // ─── Enter a project (couche 2 → couche 3) ───
  // P0-9 fix: reset `data` to empty BEFORE switching selectedOrg, otherwise the
  // previous project's products/events/stock flash through until loadAll() resolves,
  // and modules disabled in the new project keep showing stale data indefinitely.
  const enterProject = useCallback((projectMembership) => {
    setSwitching(true)
    setData(EMPTY_DATA)
    setError(null)
    setUserProfile(null)
    setMembership(projectMembership)
    setSelectedOrg(projectMembership.org)
    setLayer('project')
    setTab('board')
    setUserRole(undefined) // will be loaded by loadAll
    scrollPositions.current = {}
  }, [EMPTY_DATA])

  // ─── Return to personal layer (couche 3 → couche 2) ───
  const backToPersonal = useCallback(() => {
    // P0-9 fix: clear project data so a future project switch doesn't inherit it
    setData(EMPTY_DATA)
    setError(null)
    setUserProfile(null)
    setUserRole(undefined)
    setLayer('personal')
    setSelectedOrg(null)
    setMembership(undefined)
    setShowScanner(false)
    setMoveModal(null)
    scrollPositions.current = {}
    window.scrollTo(0, 0)
    // Refresh personal data
    loadPersonalData()
  }, [loadPersonalData, EMPTY_DATA])

  // ─── Logout ───
  const handleLogout = useCallback(() => {
    auth.signOut()
    setUser(null)
    setUserRole(undefined)
    setUserProfile(null)
    setUserDetails(null)
    setMembership(undefined)
    setSelectedOrg(null)
    setAllProjects([])
    setPersonalEvents([])
    setData(EMPTY_DATA)
    setLayer('personal')
    setPersonalTab('home')
  }, [EMPTY_DATA])

  // ═══════════════════════════════════════════════
  // ROUTING
  // ═══════════════════════════════════════════════

  // ─── EK LIVE routing (no auth required) ───
  const pathname = window.location.pathname
  if (pathname.startsWith('/live')) return <LiveErrorBoundary><LiveApp /></LiveErrorBoundary>
  if (pathname.startsWith('/display')) return <LiveErrorBoundary><LiveDisplay /></LiveErrorBoundary>

  if (user === undefined) return <SplashScreen text="Vérification..." />

  // Legal pages (accessible from landing)
  if (legalPage === 'cgu') return <CGU onClose={() => setLegalPage(null)} />
  if (legalPage === 'privacy') return <Privacy onClose={() => setLegalPage(null)} />

  // Not logged in: show landing or auth
  if (user === null) {
    if (showAuth) return <Auth onAuth={(u) => setUser(u)} onBack={() => setShowAuth(false)} />
    return <Landing onGetStarted={() => setShowAuth(true)} />
  }

  // Loading personal data
  if (personalLoading && allProjects.length === 0) return <SplashScreen text="Chargement..." />

  // ═══════════════════════════════════════════════
  // MÉLODIE WELCOME — First-time users + invited users
  // ═══════════════════════════════════════════════
  const needsOnboarding = !personalLoading
    && allProjects.length === 0
    && !localStorage.getItem('onboarding_complete')
    && layer === 'personal'

  if (needsOnboarding) {
    return (
      <>
        <MelodieWelcome
          user={user}
          pendingInvitation={pendingInvitation}
          onComplete={(membership) => {
            if (membership) {
              enterProject(membership)
            }
            loadPersonalData()
          }}
          onToast={(msg, color) => showToast(msg, color)}
        />
        {toast && <Toast message={toast.message} color={toast.color} />}
      </>
    )
  }

  // ═══════════════════════════════════════════════
  // COUCHE 2 — Espace personnel
  // ═══════════════════════════════════════════════
  if (layer === 'personal') {
    return (
      <div style={{ minHeight: '100dvh', background: '#FFFFFF', paddingBottom: 72 }}>
        <a href="#main-content" className="sr-only-focusable">Aller au contenu</a>
        {/* Header */}
        <header style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: '#6366F1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Box size={20} color="#fff" /></div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B' }}>Stage Stock</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>Mon espace</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {offline && (
              <span style={{
                padding: '4px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.2)', color: '#D97706', fontSize: 11, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4,
              }}><WifiOff size={12} /> Hors ligne</span>
            )}
            <button onClick={handleLogout} style={{
              width: 36, height: 36, borderRadius: 8, background: 'rgba(239,68,68,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              border: '1px solid rgba(239,68,68,0.15)',
            }}><LogOut size={16} color="#DC2626" /></button>
          </div>
        </header>

        {/* Personal tab content */}
        <main id="main-content">
        <Suspense fallback={<LazyFallback />}>
        {personalTab === 'home' && (
          <ModuleBoundary name="Accueil" resetKey="home">
            <PersonalDashboard
              user={user}
              userDetails={userDetails}
              allProjects={allProjects}
              onOpenProject={enterProject}
              onNavigate={setPersonalTab}
              onToast={showToast}
            />
          </ModuleBoundary>
        )}
        {personalTab === 'projects' && (
          <ModuleBoundary name="Projets" resetKey="projects">
            <MyProjects
              userId={user.id}
              allProjects={allProjects}
              onOpenProject={enterProject}
              onProjectsChanged={loadPersonalData}
              onToast={showToast}
            />
          </ModuleBoundary>
        )}
        {personalTab === 'calendar' && (
          <div style={{ padding: '0 16px' }}>
            <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <Calendar size={32} color="#CBD5E1" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>Mon calendrier</div>
              <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5, marginBottom: 12 }}>
                Toutes tes dates de concert, tous projets confondus.
              </div>
              <span style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: 6,
                background: '#F1F5F9', color: '#94A3B8', fontSize: 11, fontWeight: 500,
              }}>Bientot disponible</span>
            </div>
          </div>
        )}
        {personalTab === 'profile' && (
          <AppProvider value={{
            user, userRole, userProfile, isAdmin,
            membership, selectedOrg,
            showToast, loadAll: loadPersonalData,
          }}>
          <ModuleBoundary name="Profil" resetKey="profile">
          <ProfilePage
            user={user}
            userProfile={userProfile}
            userRole={userRole}
            userDetails={userDetails}
            membership={membership}
            selectedOrg={selectedOrg}
            allProjects={allProjects}
            roles={data.roles}
            userGear={userGear}
            userAvailability={userAvailability}
            userIncome={userIncome}
            allEvents={personalEvents.length > 0 ? personalEvents : data.events}
            onClose={() => setPersonalTab('home')}
            onToast={showToast}
            onReload={loadPersonalData}
            onLogout={handleLogout}
            onSwitchProject={() => setPersonalTab('projects')}
            onOpenProject={enterProject}
          />
          </ModuleBoundary>
          </AppProvider>
        )}
        </Suspense>
        </main>

        {/* Personal bottom nav */}
        {personalTab !== 'profile' && (
          <nav className="bottom-nav">
            {PERSONAL_TABS.map(t => (
              <button key={t.id} className={`nav-tab ${personalTab === t.id ? 'active' : ''}`} onClick={() => setPersonalTab(t.id)} aria-label={t.label} aria-current={personalTab === t.id ? 'page' : undefined}>
                <span className="nav-icon"><t.Icon size={18} /></span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        )}

        {/* Toast */}
        {toast && <Toast message={toast.message} color={toast.color} onDone={() => setToast(null)} />}
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  // COUCHE 3 — Projet
  // ═══════════════════════════════════════════════

  // Show splash during initial load OR during a project switch (P0-9: prevents
  // the previous project's UI from flashing with stale data before loadAll resolves)
  if (switching || (loading && data.products.length === 0)) return <SplashScreen text="Chargement des modules..." />

  if (error && data.products.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 24, textAlign: 'center', background: '#FFFFFF' }}>
        <AlertTriangle size={32} color="#DC2626" style={{ marginBottom: 16 }} />
        <div style={{ color: '#DC2626', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Erreur de connexion</div>
        <div style={{ color: '#94A3B8', fontSize: 13, marginBottom: 20 }}>{error}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ maxWidth: 200 }} onClick={loadAll}>Réessayer</button>
          <button onClick={backToPersonal} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> Mon Espace
          </button>
        </div>
      </div>
    )
  }

  if (userRole === null && data.roles.length > 0) {
    return (
      <RolePicker
        roles={data.roles}
        userId={user.id}
        orgId={selectedOrg?.id}
        onRoleSelected={(role) => setUserRole(role)}
        onToast={showToast}
      />
    )
  }

  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { icon: null, color: '#94A3B8', label: userRole.name }) : null

  const appContextValue = {
    user, userRole, userProfile, isAdmin,
    membership, selectedOrg,
    showToast, loadAll,
  }

  return (
    <AppProvider value={appContextValue}>
    <div style={{ minHeight: '100dvh', background: '#FFFFFF', paddingBottom: 72 }}>
      <a href="#main-content" className="sr-only-focusable">Aller au contenu</a>
      {/* ─── Header (Couche 3) ─── */}
      <header style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={backToPersonal} style={{
            padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <ChevronLeft size={14} /> Retour
          </button>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B' }}>
            {selectedOrg?.name || 'Projet'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {offline && (
            <span style={{
              padding: '4px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.2)', color: '#D97706', fontSize: 11, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 4,
            }}><WifiOff size={12} /> Hors ligne</span>
          )}
          {isModuleActive('stock') && (
            <button onClick={() => setShowScanner(true)} style={{
              width: 36, height: 36, borderRadius: 8, background: '#F8FAFC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #E2E8F0', cursor: 'pointer',
            }}><Camera size={16} color="#64748B" /></button>
          )}
          {alerts.filter(a => a.level === 'rupture').length > 0 && isModuleActive('alertes') && (
            <button onClick={() => handleTabChange('alertes')} style={{
              padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.15)', color: '#DC2626', fontSize: 11, fontWeight: 500,
              animation: 'pulse 2s infinite', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <AlertTriangle size={12} /> {alerts.filter(a => a.level === 'rupture').length}
            </button>
          )}
          {roleConf && (
            <span style={{
              padding: '4px 8px', borderRadius: 6,
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
              color: '#A5B4FC', fontSize: 11, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {roleConf.icon && React.createElement(roleConf.icon, { size: 12 })}
              {userRole.code}
            </span>
          )}
        </div>
      </header>

      {/* ─── Sub-tab bar (when group has multiple tabs) ─── */}
      {currentGroup && currentGroup.groupTabs.length > 1 && (
        <div style={{
          display: 'flex', gap: 4, padding: '8px 16px 12px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {currentGroup.groupTabs.map(t => {
            const isActive = tab === t.id
            return (
              <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: isActive ? '#A5B4FC' : '#94A3B8',
                border: `1px solid ${isActive ? 'rgba(99,102,241,0.2)' : '#E2E8F0'}`,
              }}>
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ─── Tab Content (module-driven) ─── */}
      <main id="main-content">
      <Suspense fallback={<LazyFallback />}>
      <ModuleBoundary name={tab} resetKey={`${selectedOrg?.id || 'none'}:${tab}`}>
        <TabContent
          key={`${selectedOrg?.id || 'none'}:${tab}`}
          tab={tab}
          activeModuleIds={activeModuleIds}
          data={data}
          filteredProducts={filteredProducts}
          filteredStock={filteredStock}
          filteredMovements={filteredMovements}
          alerts={alerts}
          user={user}
          userRole={userRole}
          userProfile={userProfile}
          isAdmin={isAdmin}
          membership={membership}
          orgId={selectedOrg?.id}
          selectedOrg={selectedOrg}
          onNavigate={handleTabChange}
          onReload={loadAll}
          onToast={showToast}
          onQuickAction={(type) => setMoveModal({ type })}
          onMovement={(type, locId) => setMoveModal({ type, preselectedLocation: locId })}
          onModulesChanged={handleModulesChanged}
        />
      </ModuleBoundary>
      </Suspense>
      </main>

      {/* ─── Bottom Nav (Couche 3 — grouped) ─── */}
      <nav className="bottom-nav">
        {activeGroups.map(g => {
          const isActive = currentGroup?.id === g.id
          const IconComp = TAB_ICONS[g.id] || Box
          return (
            <button key={g.id}
              className={`nav-tab ${isActive ? 'active' : ''}`}
              aria-label={g.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                if (!isActive) handleTabChange(g.groupTabs[0].id)
              }}>
              <span className="nav-icon"><IconComp size={18} /></span>
              <span>{g.label}</span>
              {g.id === 'stock-group' && alerts.length > 0 && (
                <span className="nav-badge">{alerts.length}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* ─── Scanner Overlay ─── */}
      {showScanner && (
        <Scanner
          products={filteredProducts}
          locations={data.locations}
          stock={filteredStock}
          onMovement={(type) => { setShowScanner(false); setMoveModal({ type }) }}
          onClose={() => setShowScanner(false)}
          onToast={showToast}
        />
      )}

      {/* ─── Movement Modal ─── */}
      {moveModal && (
        <MovementModal
          type={moveModal.type}
          products={filteredProducts}
          locations={data.locations}
          stock={filteredStock}
          preselectedLocation={moveModal.preselectedLocation}
          orgId={selectedOrg?.id}
          onClose={() => setMoveModal(null)}
          onDone={() => { setMoveModal(null); loadAll() }}
          onToast={showToast}
        />
      )}

      {/* ─── Feedback widget (terrain) ─── */}
      <Feedback user={user} orgId={selectedOrg?.id} context={tab} />

      {/* ─── Toast ─── */}
      {toast && <Toast message={toast.message} color={toast.color} onDone={() => setToast(null)} />}
    </div>
    </AppProvider>
  )
}

// ─── Tab Content Router (module-driven) ───
function TabContent({
  tab, activeModuleIds, data,
  filteredProducts, filteredStock, filteredMovements, alerts,
  user, userRole, userProfile, isAdmin, membership, orgId, selectedOrg,
  onNavigate, onReload, onToast, onQuickAction, onMovement, onModulesChanged,
}) {
  switch (tab) {
    case 'board':
      return (
        <Board
          products={filteredProducts}
          locations={data.locations}
          stock={filteredStock}
          movements={filteredMovements}
          alerts={alerts}
          events={data.events}
          families={data.families}
          subfamilies={data.subfamilies}
          checklists={data.checklists}
          roles={data.roles}
          eventPacking={data.event_packing}
          userProfiles={data.user_profiles}
          userRole={userRole}
          onQuickAction={onQuickAction}
          onNavigate={onNavigate}
          onReload={onReload}
          onToast={onToast}
        />
      )
    case 'tournee':
      return (
        <Tour
          events={data.events}
          products={filteredProducts}
          stock={filteredStock}
          locations={data.locations}
          families={data.families}
          subfamilies={data.subfamilies}
          checklists={data.checklists}
          roles={data.roles}
          eventPacking={data.event_packing}
          userProfiles={data.user_profiles}
          userRole={userRole}
          orgId={orgId}
          orgName={selectedOrg?.name}
          onReload={onReload}
          onToast={onToast}
        />
      )
    case 'articles':
      return (
        <Products
          products={filteredProducts}
          families={data.families}
          subfamilies={data.subfamilies}
          stock={filteredStock}
          locations={data.locations}
          movements={filteredMovements}
          events={data.events}
          eventPacking={data.event_packing}
          userRole={userRole}
          orgId={orgId}
          onReload={onReload}
          onToast={onToast}
        />
      )
    case 'depots':
      return (
        <Depots
          locations={data.locations}
          stock={filteredStock}
          products={filteredProducts}
          movements={filteredMovements}
          families={data.families}
          subfamilies={data.subfamilies}
          orgId={orgId}
          onReload={onReload}
          onToast={onToast}
          onMovement={onMovement}
        />
      )
    case 'stock':
      return (
        <StockModule
          products={filteredProducts}
          locations={data.locations}
          stock={filteredStock}
          movements={filteredMovements}
          setMovements={newMoves => setData(prev => ({ ...prev, movements: typeof newMoves === 'function' ? newMoves(prev.movements) : newMoves }))}
          orgId={orgId}
          onReload={onReload}
          onToast={onToast}
          onMovement={onMovement}
        />
      )
    case 'equipe':
      return (
        <Equipe
          roles={data.roles}
          userProfiles={data.user_profiles}
          eventPacking={data.event_packing}
          events={data.events}
          userRole={userRole}
        />
      )
    case 'finance':
      return (
        <Finance
          products={filteredProducts}
          stock={filteredStock}
          events={data.events}
          locations={data.locations}
          depreciation={data.product_depreciation}
          expenses={data.expenses}
          sales={data.sales}
          orgId={orgId}
          orgName={selectedOrg?.name}
          onReload={onReload}
          onToast={onToast}
        />
      )
    case 'alertes':
      return (
        <Alerts
          alerts={alerts}
          events={data.events}
          products={filteredProducts}
          stock={filteredStock}
          locations={data.locations}
          userRole={userRole}
        />
      )
    case 'forecast':
      return (
        <Forecast
          products={filteredProducts}
          stock={filteredStock}
          events={data.events}
          locations={data.locations}
        />
      )
    case 'achats':
      return (
        <Achats
          suppliers={data.suppliers}
          purchaseOrders={data.purchase_orders}
          purchaseOrderLines={data.purchase_order_lines}
          products={filteredProducts}
          locations={data.locations}
          stock={data.stock}
          orgId={orgId}
          userId={user?.id}
          onReload={onReload}
          onToast={onToast}
        />
      )
    case 'inventaire':
      return (
        <Inventaire
          products={filteredProducts}
          stock={filteredStock}
          locations={data.locations}
          orgId={orgId}
          onReload={onReload}
          onToast={onToast}
        />
      )
    case 'ventes':
      return (
        <ConcertMode
          products={filteredProducts}
          stock={filteredStock}
          locations={data.locations}
          events={data.events}
          orgId={orgId}
          userId={user?.id}
          onClose={() => onNavigate('board')}
          onReload={onReload}
          onToast={onToast}
        />
      )
    case 'transport':
      return (
        <Transport
          events={data.events}
          transportProviders={data.transport_providers}
          vehicles={data.vehicles}
          transportRoutes={data.transport_routes}
          transportNeeds={data.transport_needs}
          transportBookings={data.transport_bookings}
          transportManifests={data.transport_manifests}
          transportCosts={data.transport_costs}
          onReload={onReload}
          onToast={onToast}
        />
      )
    case 'settings':
      return (
        <Settings
          activeModuleIds={activeModuleIds}
          onModulesChanged={onModulesChanged}
          onToast={onToast}
          membership={membership}
          roles={data.roles}
          userProfiles={data.project_members}
          onReload={onReload}
        />
      )
    default:
      return null
  }
}

// ─── Stock Module (combines Stock view + Movements with sub-tabs) ───
function StockModule({ products, locations, stock, movements, setMovements, orgId, onReload, onToast, onMovement }) {
  const [subTab, setSubTab] = useState('stock') // stock | mouvements

  return (
    <div>
      {/* Sub-tab switcher */}
      <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px' }}>
        {[
          { id: 'stock', label: 'Niveaux de stock' },
          { id: 'mouvements', label: 'Mouvements' },
        ].map(s => (
          <button key={s.id} onClick={() => setSubTab(s.id)} style={{
            flex: 1, padding: '6px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', textAlign: 'center',
            background: subTab === s.id ? 'rgba(99,102,241,0.12)' : 'transparent',
            color: subTab === s.id ? '#A5B4FC' : '#94A3B8',
            border: `1px solid ${subTab === s.id ? 'rgba(99,102,241,0.2)' : '#E2E8F0'}`,
          }}>{s.label}</button>
        ))}
      </div>

      {subTab === 'stock' && (
        <Stocks
          products={products}
          locations={locations}
          stock={stock}
          orgId={orgId}
          onReload={onReload}
          onToast={onToast}
          onMovement={onMovement}
        />
      )}
      {subTab === 'mouvements' && (
        <Movements
          movements={movements}
          setMovements={setMovements}
          products={products}
          locations={locations}
          stock={stock}
          orgId={orgId}
          onReload={onReload}
          onToast={onToast}
        />
      )}
    </div>
  )
}

// ─── EK LIVE Error Boundary ───
class LiveErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          background: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16, padding: 32, textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}>
          <AlertTriangle size={40} color="#DC2626" />
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1E293B' }}>
            Erreur technique
          </div>
          <div style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6, maxWidth: 300 }}>
            Recharge la page pour continuer.
          </div>
          <button onClick={() => window.location.reload()} className="btn-primary" style={{
            marginTop: 8, maxWidth: 200,
          }}>Recharger</button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Splash Screen ───
function SplashScreen({ text }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
      background: '#FFFFFF',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: '#6366F1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Box size={28} color="#fff" /></div>
      <div className="loader" />
      <div style={{ color: '#1E293B', fontWeight: 600, fontSize: 18 }}>Stage Stock</div>
      <div style={{ color: '#94A3B8', fontSize: 13 }}>{text}</div>
    </div>
  )
}
