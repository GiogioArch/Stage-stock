import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { auth, db, safe } from './lib/supabase'
import { MODULES, getActiveModuleIds, setActiveModuleIds, getRequiredTables, getActiveTabs, TAB_GROUPS } from './modules/registry'

// ─── Components ───
import Auth from './components/Auth'
import Board from './components/Board'
import Products from './components/Products'
import Stocks from './components/Stocks'
import Checklists from './components/Checklists'
import Movements from './components/Movements'
import Alerts from './components/Alerts'
import Scanner from './components/Scanner'
import MovementModal from './components/MovementModal'
import RolePicker, { ROLE_CONF } from './components/RolePicker'
import Tour from './components/Tour'
import Depots from './components/Depots'
import Equipe from './components/Equipe'
import Finance from './components/Finance'
import Forecast from './components/Forecast'
import Transport from './components/Transport'
import ConcertMode from './components/ConcertMode'
import Achats from './components/Achats'
import Inventaire from './components/Inventaire'
import Settings from './modules/Settings'
import ProfilePage from './components/ProfilePage'
import PersonalDashboard from './components/PersonalDashboard'
import MyProjects from './components/MyProjects'
import Landing from './components/Landing'
import { CGU, Privacy } from './components/Legal'
import { Toast } from './components/UI'

// ─── EK LIVE (fan-facing, no auth) ───
import LiveApp from './live/LiveApp'
import LiveDisplay from './live/LiveDisplay'

// Admin role codes that see everything
const ADMIN_CODES = ['TM', 'PM', 'LOG', 'PA']

// Personal layer tabs
const PERSONAL_TABS = [
  { id: 'home', label: 'Accueil', icon: '🏠' },
  { id: 'projects', label: 'Projets', icon: '📁' },
  { id: 'calendar', label: 'Calendrier', icon: '📅' },
  { id: 'profile', label: 'Profil', icon: '👤' },
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
      result.push({ id: 'settings', label: 'Config', icon: '⚙️', moduleId: 'settings' })
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
    setLayer('personal')
    setPersonalTab('home')
  }, [])

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
  // COUCHE 2 — Espace personnel
  // ═══════════════════════════════════════════════
  if (layer === 'personal') {
    return (
      <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)', paddingBottom: 80 }}>
        {/* Header */}
        <header style={{ padding: '16px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: 'linear-gradient(135deg, #F7A072, #E8735A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: '0 4px 16px rgba(232,115,90,0.25)',
            }}>🎪</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#E8735A', letterSpacing: 0.5 }}>STAGE STOCK</div>
              <div style={{ fontSize: 10, color: '#C4A8B6', letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>
                Mon espace
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {offline && (
              <span style={{
                padding: '5px 10px', borderRadius: 10, background: '#FEF3CD',
                border: '1.5px solid #F0D78C', color: '#856404', fontSize: 11, fontWeight: 800,
              }}>Hors ligne</span>
            )}
            <button onClick={handleLogout} style={{
              width: 36, height: 36, borderRadius: 10, background: '#FDF0F4',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer',
              border: '1.5px solid #D4648A30',
            }}>🚪</button>
          </div>
        </header>

        {/* Personal tab content */}
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
            <div className="card" style={{ padding: '32px 20px', textAlign: 'center', opacity: 0.6 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042', marginBottom: 6 }}>Mon calendrier</div>
              <div style={{ fontSize: 13, color: '#9A8B94', lineHeight: 1.5, marginBottom: 12 }}>
                Toutes tes dates de concert, tous projets confondus.
              </div>
              <span style={{
                display: 'inline-block', padding: '4px 14px', borderRadius: 8,
                background: '#E8DED8', color: '#9A8B94', fontSize: 11, fontWeight: 800,
              }}>Bientôt disponible</span>
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
            roles={data.roles}
            userGear={userGear}
            userAvailability={userAvailability}
            userIncome={userIncome}
            allEvents={data.events}
            onClose={() => setPersonalTab('home')}
            onToast={showToast}
            onReload={loadPersonalData}
            onLogout={handleLogout}
            onSwitchProject={() => setPersonalTab('projects')}
          />
        )}

        {/* Personal bottom nav */}
        {personalTab !== 'profile' && (
          <nav className="bottom-nav">
            {PERSONAL_TABS.map(t => (
              <button key={t.id} className={`nav-tab ${personalTab === t.id ? 'active' : ''}`} onClick={() => setPersonalTab(t.id)}>
                <span className="nav-icon">{t.icon}</span>
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ color: '#D4648A', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Erreur de connexion</div>
        <div style={{ color: '#9A8B94', fontSize: 13, marginBottom: 20 }}>{error}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ maxWidth: 200 }} onClick={loadAll}>Réessayer</button>
          <button onClick={backToPersonal} style={{
            padding: '10px 20px', borderRadius: 14, fontSize: 13, fontWeight: 700,
            background: '#EEF4FA', border: '1.5px solid #5B8DB830', color: '#5B8DB8', cursor: 'pointer',
          }}>← Mon Espace</button>
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

  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { icon: '📋', color: '#9A8B94', label: userRole.name }) : null

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)', paddingBottom: 80 }}>
      {/* ─── Header (Couche 3) ─── */}
      <header style={{ padding: '16px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          {/* Back to personal layer */}
          <button onClick={backToPersonal} style={{
            padding: '8px 12px', borderRadius: 12, fontSize: 12, fontWeight: 800,
            background: '#EEF4FA', border: '1.5px solid #5B8DB830', color: '#5B8DB8', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ← Mon Espace
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042', letterSpacing: 0.3 }}>
              {selectedOrg?.name || 'Projet'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {offline && (
            <span style={{
              padding: '5px 10px', borderRadius: 10, background: '#FEF3CD',
              border: '1.5px solid #F0D78C', color: '#856404', fontSize: 11, fontWeight: 800,
            }}>Hors ligne</span>
          )}
          {isModuleActive('stock') && (
            <button onClick={() => setShowScanner(true)} style={{
              width: 36, height: 36, borderRadius: 10, background: '#EEF4FA',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              border: '1.5px solid #5B8DB830', cursor: 'pointer',
            }}>📷</button>
          )}
          {alerts.filter(a => a.level === 'rupture').length > 0 && isModuleActive('alertes') && (
            <button onClick={() => handleTabChange('alertes')} style={{
              padding: '5px 12px', borderRadius: 10, background: '#FDF0F4',
              border: '1.5px solid #F5C4BC', color: '#D4648A', fontSize: 11, fontWeight: 800,
              animation: 'pulse 2s infinite',
            }}>
              {alerts.filter(a => a.level === 'rupture').length} 🚨
            </button>
          )}
          {roleConf && (
            <span style={{
              padding: '5px 10px', borderRadius: 10,
              background: `${roleConf.color}12`, border: `1.5px solid ${roleConf.color}30`,
              color: roleConf.color, fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 14 }}>{roleConf.icon}</span>
              {userRole.code}
            </span>
          )}
        </div>
      </header>

      {/* ─── Sub-tab bar (when group has multiple tabs) ─── */}
      {currentGroup && currentGroup.groupTabs.length > 1 && (
        <div style={{
          display: 'flex', gap: 6, padding: '0 16px 12px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {currentGroup.groupTabs.map(t => {
            const mod = MODULES[t.moduleId]
            const color = mod?.color || '#9A8B94'
            const isActive = tab === t.id
            return (
              <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
                padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: isActive ? `${color}15` : 'white',
                color: isActive ? color : '#9A8B94',
                border: `1.5px solid ${isActive ? color + '40' : '#E8DED8'}`,
              }}>
                {t.icon} {t.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ─── Tab Content (module-driven) ─── */}
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

      {/* ─── Bottom Nav (Couche 3 — grouped) ─── */}
      <nav className="bottom-nav">
        {activeGroups.map(g => {
          const isActive = currentGroup?.id === g.id
          return (
            <button key={g.id}
              className={`nav-tab ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (!isActive) handleTabChange(g.groupTabs[0].id)
              }}>
              <span className="nav-icon">{g.icon}</span>
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
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
        {[
          { id: 'stock', label: 'Niveaux de stock', color: '#5DAB8B' },
          { id: 'mouvements', label: 'Mouvements', color: '#5B8DB8' },
        ].map(s => (
          <button key={s.id} onClick={() => setSubTab(s.id)} style={{
            flex: 1, padding: '8px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: subTab === s.id ? `${s.color}15` : 'white',
            color: subTab === s.id ? s.color : '#9A8B94',
            border: `1.5px solid ${subTab === s.id ? s.color + '40' : '#E8DED8'}`,
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
          background: 'linear-gradient(180deg, #1a1520 0%, #2a1f30 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16, padding: 32, textAlign: 'center',
          fontFamily: "'Nunito', sans-serif",
        }}>
          <div style={{ fontSize: 64 }}>🎤</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#F0ECE2' }}>
            Oups, petit souci technique !
          </div>
          <div style={{ fontSize: 14, color: 'rgba(240,236,226,0.5)', lineHeight: 1.6, maxWidth: 300 }}>
            Recharge la page pour revenir au concert.
          </div>
          <button onClick={() => window.location.reload()} style={{
            marginTop: 8, padding: '12px 28px', borderRadius: 14,
            background: '#E8735A', color: 'white', fontSize: 14, fontWeight: 800,
            border: 'none', cursor: 'pointer',
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
      background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 22,
        background: 'linear-gradient(135deg, #F7A072, #E8735A)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, boxShadow: '0 8px 32px rgba(232,115,90,0.25)',
      }}>🎪</div>
      <div className="loader" />
      <div style={{ color: '#E8735A', fontWeight: 900, fontSize: 20 }}>STAGE STOCK</div>
      <div style={{ color: '#B8A0AE', fontSize: 13 }}>{text}</div>
    </div>
  )
}
