import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { auth, db, safe } from './lib/supabase'
import { MODULES, getActiveModuleIds, setActiveModuleIds, getRequiredTables, getActiveTabs, TAB_GROUPS } from './modules/registry'

// ─── Critical components (loaded immediately) ───
import MelodieChat from './components/MelodieChat'
import Board from './components/Board'
import Landing from './components/Landing'
import { Toast } from './components/UI'
import RolePicker, { ROLE_CONF } from './components/RolePicker'
import MovementModal from './components/MovementModal'
import Scanner from './components/Scanner'

// ─── Lazy-loaded components (loaded on demand) ───
const Melodie = lazy(() => import('./components/Melodie'))
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
const EventTimeline = lazy(() => import('./components/EventTimeline'))
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
import { Home, FolderOpen, Calendar, User, LogOut, Camera, AlertTriangle, ChevronLeft, Settings as SettingsIcon, WifiOff, Box, Package, Warehouse, ClipboardList, Users, Coins, Bell, TrendingUp, ShoppingCart, ShoppingBag, ClipboardCheck, Truck, BarChart3, Clock } from 'lucide-react'

// ─── EK LIVE (fan-facing, no auth) ───
const LiveApp = lazy(() => import('./live/LiveApp'))
const LiveDisplay = lazy(() => import('./live/LiveDisplay'))

// Admin role codes that see everything
const ADMIN_CODES = ['TM', 'PM', 'LOG', 'PA']

// Icon map for module tabs (replaces emojis from registry)
const TAB_ICONS = {
  dashboard: BarChart3, board: BarChart3, tournee: Calendar, articles: Package,
  depots: Warehouse, stock: ClipboardList, equipe: Users, finance: Coins,
  alertes: Bell, forecast: TrendingUp, ventes: ShoppingCart,
  achats: ShoppingBag, inventaire: ClipboardCheck, transport: Truck,
  timeline: Clock, settings: SettingsIcon, reglages: SettingsIcon, 'stock-group': Package,
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
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    }
  }, [user, selectedOrg, requiredTables, loadUserProfile])

  useEffect(() => {
    if (user && selectedOrg) loadAll()
  }, [user, selectedOrg, loadAll])

  // Auto-refresh every 30 seconds (project layer only)
  useEffect(() => {
    if (!user || layer !== 'project') return
    const interval = setInterval(() => {
      if (!moveModal && !showScanner) loadAll()
    }, 30000)
    return () => clearInterval(interval)
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
    filteredProducts.map(p => {
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
  const enterProject = useCallback((projectMembership) => {
    setMembership(projectMembership)
    setSelectedOrg(projectMembership.org)
    setLayer('project')
    setTab('board')
    setUserRole(undefined) // will be loaded by loadAll
  }, [])

  // ─── Return to personal layer (couche 3 → couche 2) ───
  const backToPersonal = useCallback(() => {
    setLayer('personal')
    setSelectedOrg(null)
    setMembership(undefined)
    setShowScanner(false)
    setMoveModal(null)
    window.scrollTo(0, 0)
    // Refresh personal data
    loadPersonalData()
  }, [loadPersonalData])

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
    setLayer('personal')
    setPersonalTab('home')
  }, [])

  // ═══════════════════════════════════════════════
  // ROUTING
  // ═══════════════════════════════════════════════

  // ─── EK LIVE routing (no auth required) ───
  const pathname = window.location.pathname
  if (pathname.startsWith('/live')) return <LiveErrorBoundary><Suspense fallback={<SplashScreen text="Chargement..." />}><LiveApp /></Suspense></LiveErrorBoundary>
  if (pathname.startsWith('/display')) return <LiveErrorBoundary><Suspense fallback={<SplashScreen text="Chargement..." />}><LiveDisplay /></Suspense></LiveErrorBoundary>

  if (user === undefined) return <SplashScreen text="Verification..." />

  // Legal pages (accessible from landing)
  if (legalPage === 'cgu') return <Suspense fallback={<SplashScreen text="Chargement..." />}><CGU onClose={() => setLegalPage(null)} /></Suspense>
  if (legalPage === 'privacy') return <Suspense fallback={<SplashScreen text="Chargement..." />}><Privacy onClose={() => setLegalPage(null)} /></Suspense>

  // Not logged in → Mélodie handles splash + welcome + auth + onboarding
  if (user === null) {
    return (
      <>
        <Suspense fallback={<SplashScreen text="Chargement..." />}>
        <Melodie
          roles={data.roles}
          onAuth={(u) => setUser(u)}
          onComplete={(membership) => {
            if (membership) enterProject(membership)
            loadPersonalData()
          }}
          onToast={(msg, color) => showToast(msg, color)}
        />
        </Suspense>
        {toast && <Toast message={toast.message} color={toast.color} />}
      </>
    )
  }

  // Loading personal data
  if (personalLoading && allProjects.length === 0) return <SplashScreen text="Chargement..." />

  // Onboarding for users who logged in but never completed setup
  const needsOnboarding = !personalLoading
    && allProjects.length === 0
    && !localStorage.getItem('onboarding_complete')
    && layer === 'personal'

  if (needsOnboarding) {
    return (
      <>
        <Suspense fallback={<SplashScreen text="Chargement..." />}>
        <Melodie
          existingUser={user}
          startStep="select_roles"
          roles={data.roles}
          onAuth={(u) => setUser(u)}
          onComplete={(membership) => {
            if (membership) enterProject(membership)
            loadPersonalData()
          }}
          onToast={(msg, color) => showToast(msg, color)}
        />
        </Suspense>
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
        {/* Header */}
        <header style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: '#5B8DB8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Box size={20} color="#fff" /></div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B' }}>BackStage</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>Mon espace</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {offline && (
              <span style={{
                padding: '4px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.2)', color: '#E8935A', fontSize: 11, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4,
              }}><WifiOff size={12} /> Hors ligne</span>
            )}
            <button onClick={handleLogout} style={{
              width: 36, height: 36, borderRadius: 8, background: 'rgba(212,100,138,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              border: '1px solid rgba(212,100,138,0.15)',
            }}><LogOut size={16} color="#D4648A" /></button>
          </div>
        </header>

        {/* Personal tab content */}
        <Suspense fallback={<div style={{ padding: 32, textAlign: 'center' }}><div className="loader" /></div>}>
        {personalTab === 'home' && (
          <PersonalDashboard
            user={user}
            userDetails={userDetails}
            allProjects={allProjects}
            onOpenProject={enterProject}
            onNavigate={setPersonalTab}
            onToast={showToast}
          />
        )}
        {personalTab === 'projects' && (
          <MyProjects
            userId={user.id}
            allProjects={allProjects}
            onOpenProject={enterProject}
            onProjectsChanged={loadPersonalData}
            onToast={showToast}
          />
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
        )}
        </Suspense>

        {/* Personal bottom nav */}
        {personalTab !== 'profile' && (
          <nav className="bottom-nav">
            {PERSONAL_TABS.map(t => (
              <button key={t.id} className={`nav-tab ${personalTab === t.id ? 'active' : ''}`} onClick={() => setPersonalTab(t.id)}>
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

  if (loading && data.products.length === 0) return <SplashScreen text="Chargement des modules..." />

  if (error && data.products.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 24, textAlign: 'center', background: '#FFFFFF' }}>
        <AlertTriangle size={32} color="#D4648A" style={{ marginBottom: 16 }} />
        <div style={{ color: '#D4648A', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Erreur de connexion</div>
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

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFFFF', paddingBottom: 72 }}>
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
              border: '1px solid rgba(245,158,11,0.2)', color: '#E8935A', fontSize: 11, fontWeight: 500,
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
              padding: '4px 10px', borderRadius: 6, background: 'rgba(212,100,138,0.12)',
              border: '1px solid rgba(212,100,138,0.15)', color: '#D4648A', fontSize: 11, fontWeight: 500,
              animation: 'pulse 2s infinite', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <AlertTriangle size={12} /> {alerts.filter(a => a.level === 'rupture').length}
            </button>
          )}
          {roleConf && (
            <span style={{
              padding: '4px 8px', borderRadius: 6,
              background: 'rgba(91,141,184,0.12)', border: '1px solid rgba(91,141,184,0.2)',
              color: '#8BB8D8', fontSize: 11, fontWeight: 500,
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
          display: 'flex', gap: 6, padding: '8px 16px 12px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {currentGroup.groupTabs.map(t => {
            const isActive = tab === t.id
            return (
              <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: isActive ? 700 : 500,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: isActive ? '#5B8DB8' : '#F1F5F9',
                color: isActive ? '#FFFFFF' : '#64748B',
                border: 'none',
                boxShadow: isActive ? '0 2px 8px rgba(91,141,184,0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}>
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ─── Tab Content (module-driven) ─── */}
      <Suspense fallback={<div style={{ padding: 32, textAlign: 'center' }}><div className="loader" /></div>}>
      <TabContent
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
      </Suspense>

      {/* ─── Bottom Nav (Couche 3 — grouped) ─── */}
      <nav className="bottom-nav">
        {activeGroups.map(g => {
          const isActive = currentGroup?.id === g.id
          const IconComp = TAB_ICONS[g.id] || Box
          return (
            <button key={g.id}
              className={`nav-tab ${isActive ? 'active' : ''}`}
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

      {/* ─── Melodie Chatbot ─── */}
      <MelodieChat
        user={user}
        userRole={userRole}
        orgName={selectedOrg?.name}
        events={data.events}
        data={data}
      />

      {/* ─── Feedback widget (terrain) ─── */}
      <Suspense fallback={null}><Feedback user={user} orgId={selectedOrg?.id} context={tab} /></Suspense>

      {/* ─── Toast ─── */}
      {toast && <Toast message={toast.message} color={toast.color} onDone={() => setToast(null)} />}
    </div>
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
          eventTasks={data.event_tasks}
          checklists={data.checklists}
          userAvailability={data.user_availability}
          userRole={userRole}
          user={user}
          orgId={orgId}
          onReload={onReload}
          onToast={onToast}
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
    case 'timeline':
      return (
        <EventTimeline
          event={data.events?.find(e => e.date >= new Date().toISOString().split('T')[0]) || data.events?.[data.events.length - 1]}
          events={data.events}
          eventTasks={data.event_tasks}
          roles={data.roles}
          userProfiles={data.user_profiles}
          orgId={orgId}
          user={user}
          onReload={onReload}
          onToast={onToast}
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
function StockModule({ products, locations, stock, movements, orgId, onReload, onToast, onMovement }) {
  const [subTab, setSubTab] = useState('stock') // stock | mouvements

  return (
    <div>
      {/* Sub-tab switcher */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px' }}>
        {[
          { id: 'stock', label: 'Niveaux de stock' },
          { id: 'mouvements', label: 'Mouvements' },
        ].map(s => (
          <button key={s.id} onClick={() => setSubTab(s.id)} style={{
            flex: 1, padding: '8px', borderRadius: 20, fontSize: 13, fontWeight: subTab === s.id ? 700 : 500,
            cursor: 'pointer', textAlign: 'center',
            background: subTab === s.id ? '#5B8DB8' : '#F1F5F9',
            color: subTab === s.id ? '#FFFFFF' : '#64748B',
            border: 'none',
            boxShadow: subTab === s.id ? '0 2px 8px rgba(91,141,184,0.3)' : 'none',
            transition: 'all 0.2s ease',
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
          products={products}
          locations={locations}
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
          <AlertTriangle size={40} color="#D4648A" />
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
        background: '#5B8DB8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Box size={28} color="#fff" /></div>
      <div className="loader" />
      <div style={{ color: '#1E293B', fontWeight: 600, fontSize: 18 }}>BackStage</div>
      <div style={{ color: '#94A3B8', fontSize: 13 }}>{text}</div>
    </div>
  )
}
