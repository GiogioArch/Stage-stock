import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { MODULES, getActiveModuleIds, setActiveModuleIds, getRequiredTables, getActiveTabs, TAB_GROUPS } from './modules/registry'
import { useToast, useAuth, usePersonalData, useProjectData, ProjectProvider } from './shared/hooks'

// ─── Critical components (loaded immediately) ───
import Landing from './components/Landing'
import RolePicker, { ROLE_CONF } from './components/RolePicker'

// ─── Previously critical, now lazy-loaded for bundle size ───
const MelodieChat = lazy(() => import('./components/MelodieChat'))
const Board = lazy(() => import('./components/Board'))
const MovementModal = lazy(() => import('./components/MovementModal'))
const Scanner = lazy(() => import('./components/Scanner'))

// ─── Lazy-loaded components (loaded on demand) ───
const Melodie = lazy(() => import('./components/Melodie'))
const Products = lazy(() => import('./components/Products'))
const Stocks = lazy(() => import('./components/Stocks'))
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
const StockHub = lazy(() => import('./components/StockHub'))
const Settings = lazy(() => import('./modules/Settings'))
const ProfilePage = lazy(() => import('./components/ProfilePage'))
const PersonalDashboard = lazy(() => import('./components/PersonalDashboard'))
const MyProjects = lazy(() => import('./components/MyProjects'))
const Feedback = lazy(() => import('./components/Feedback'))
const CGU = lazy(() => import('./components/Legal').then(m => ({ default: m.CGU })))
const Privacy = lazy(() => import('./components/Legal').then(m => ({ default: m.Privacy })))
import { Home, FolderOpen, Calendar, User, LogOut, Camera, AlertTriangle, ChevronLeft, Settings as SettingsIcon, WifiOff, Box, Package, Warehouse, ClipboardList, Users, Coins, Bell, TrendingUp, ShoppingCart, ShoppingBag, ClipboardCheck, Truck, BarChart3, Clock, MoreHorizontal, X as XIcon, Music, ScanLine, Radio } from 'lucide-react'

// ─── EK LIVE (fan-facing, no auth) ───
const LiveApp = lazy(() => import('./live/LiveApp'))
const LiveDisplay = lazy(() => import('./live/LiveDisplay'))

// Icon map for module tabs (replaces emojis from registry)
const TAB_ICONS = {
  dashboard: BarChart3, board: BarChart3, tournee: Calendar, articles: Package,
  depots: Warehouse, stock: ClipboardList, stock_hub: Package, equipe: Users, finance: Coins,
  alertes: Bell, forecast: TrendingUp, ventes: ShoppingCart,
  achats: ShoppingBag, inventaire: ClipboardCheck, transport: Truck,
  timeline: Clock, settings: SettingsIcon, reglages: SettingsIcon, 'stock-group': Package,
  more: MoreHorizontal,
}

// Bottom sheet "Plus" menu items
const MORE_ITEMS = [
  { id: 'finance', label: 'Finance', icon: Coins, color: '#E8935A' },
  { id: 'forecast', label: 'Prévisions', icon: TrendingUp, color: '#E8935A' },
  { id: 'ventes', label: 'Ventes', icon: ShoppingCart, color: '#5DAB8B' },
  { id: 'transport', label: 'Transport', icon: Truck, color: '#E8735A' },
  { id: 'live', label: 'EK LIVE', icon: Radio, color: '#C5A55A' },
  { id: 'settings', label: 'Réglages', icon: SettingsIcon, color: '#64748B' },
]

// Personal layer tabs
const PERSONAL_TABS = [
  { id: 'home', label: 'Accueil', Icon: Home },
  { id: 'projects', label: 'Projets', Icon: FolderOpen },
  { id: 'calendar', label: 'Calendrier', Icon: Calendar },
  { id: 'profile', label: 'Profil', Icon: User },
]

export default function App() {
  // ─── Auth (from context) ───
  const { user, setUser, logout: authLogout } = useAuth()
  const showToast = useToast()
  const [legalPage, setLegalPage] = useState(null) // 'cgu' | 'privacy' | null

  // ─── Layer navigation: 'personal' (couche 2) | 'project' (couche 3) ───
  const [layer, setLayer] = useState('personal')
  const [personalTab, setPersonalTab] = useState('home')

  // ─── Personal layer data (from hook) ───
  const personal = usePersonalData(user)

  // ─── Module state ───
  const [activeModuleIds, setActiveModules] = useState(getActiveModuleIds)
  const [tab, setTab] = useState('board')

  // ─── Required tables based on active modules ───
  const requiredTables = useMemo(() =>
    getRequiredTables(activeModuleIds),
    [activeModuleIds]
  )

  // ─── Project state (couche 3) ───
  const [selectedOrg, setSelectedOrg] = useState(null)

  // ─── Project data (from hook) ───
  const project = useProjectData(user, selectedOrg, requiredTables)

  // ─── Scanner & modal state ───
  const [showScanner, setShowScanner] = useState(false)
  const [moveModal, setMoveModal] = useState(null)
  const [showMore, setShowMore] = useState(false)

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


  // Auth check handled by AuthProvider in main.jsx

  // ═══════════════════════════════════════════════
  // COUCHE 3 — Project layer (tabs, groups, navigation)
  // ═══════════════════════════════════════════════

  // Destructure hooks for convenience
  const { data, loading, error, userRole, userProfile, membership, isAdmin,
    filteredProducts, filteredStock, filteredMovements, alerts, loadAll } = project
  const { allProjects, userDetails, userGear, userAvailability, userIncome,
    personalEvents, loading: personalLoading, reload: loadPersonalData } = personal

  // ─── Active tabs from registry (filtered by user's module_access) ───
  const tabs = useMemo(() => {
    const moduleTabs = getActiveTabs(activeModuleIds)
    const allowedModules = membership?.module_access
    const filtered = allowedModules
      ? moduleTabs.filter(t => allowedModules.includes(t.moduleId || t.id))
      : moduleTabs
    const result = [...filtered]
    if (!result.find(t => t.id === 'settings')) {
      result.push({ id: 'settings', label: 'Config', icon: 'settings', moduleId: 'settings' })
    }
    return result
  }, [activeModuleIds, membership])

  // ─── Tab groups for bottom nav ───
  const activeGroups = useMemo(() => {
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

  // Auto-refresh every 30 seconds (project layer only)
  useEffect(() => {
    if (!user || layer !== 'project') return
    const interval = setInterval(() => {
      if (!moveModal && !showScanner) loadAll()
    }, 30000)
    return () => clearInterval(interval)
  }, [user, layer, loadAll, moveModal, showScanner])

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
    project.setMembership(projectMembership)
    setSelectedOrg(projectMembership.org)
    setLayer('project')
    setTab('board')
    project.setUserRole(undefined) // will be loaded by loadAll
  }, [project])

  // ─── Return to personal layer (couche 3 → couche 2) ───
  const backToPersonal = useCallback(() => {
    setLayer('personal')
    setSelectedOrg(null)
    project.reset()
    setShowScanner(false)
    setMoveModal(null)
    window.scrollTo(0, 0)
    loadPersonalData()
  }, [loadPersonalData, project])

  // ─── Logout ───
  const handleLogout = useCallback(() => {
    authLogout()
    project.reset()
    personal.reset()
    setSelectedOrg(null)
    setLayer('personal')
    setPersonalTab('home')
  }, [authLogout, project, personal])

  // ═══════════════════════════════════════════════
  // ROUTING
  // ═══════════════════════════════════════════════

  // ─── EK LIVE routing (no auth required) ───
  const pathname = window.location.pathname
  if (pathname.startsWith('/live')) return <LiveErrorBoundary><Suspense fallback={<SplashScreen text="Chargement..." />}><LiveApp /></Suspense></LiveErrorBoundary>
  if (pathname.startsWith('/display')) return <LiveErrorBoundary><Suspense fallback={<SplashScreen text="Chargement..." />}><LiveDisplay /></Suspense></LiveErrorBoundary>

  if (user === undefined) return <SplashScreen text="Vérification..." />

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
            <button onClick={handleLogout} aria-label="Déconnexion" style={{
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
              }}>Bientôt disponible</span>
            </div>
          </div>
        )}
        {personalTab === 'profile' && (
          <ProfilePage
            user={user}
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
        onRoleSelected={(role) => project.setUserRole(role)}
        onToast={showToast}
      />
    )
  }

  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { icon: null, color: '#94A3B8', label: userRole.name }) : null

  const projectCtx = useMemo(() => ({
    orgId: selectedOrg?.id, selectedOrg, reload: loadAll,
    userRole, isAdmin, membership,
  }), [selectedOrg, loadAll, userRole, isAdmin, membership])

  return (
    <ProjectProvider value={projectCtx}>
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
            <button onClick={() => setShowScanner(true)} aria-label="Scanner" style={{
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
            const modColor = MODULES[t.moduleId]?.color || '#5B8DB8'
            return (
              <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: isActive ? 700 : 500,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: isActive ? modColor : '#F1F5F9',
                color: isActive ? '#FFFFFF' : '#64748B',
                border: 'none',
                boxShadow: isActive ? `0 2px 8px ${modColor}40` : 'none',
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
        onNavigate={handleTabChange}
        onToast={showToast}
        onQuickAction={(type) => setMoveModal({ type })}
        onMovement={(type, locId) => setMoveModal({ type, preselectedLocation: locId })}
        onModulesChanged={handleModulesChanged}
        onOpenScanner={() => setShowScanner(true)}
      />
      </Suspense>

      {/* ─── Bottom Nav (Couche 3 — 5 onglets) ─── */}
      <nav className="bottom-nav">
        {/* 1. Board */}
        <button className={`nav-tab ${tab === 'board' ? 'active' : ''}`}
          style={tab === 'board' ? { color: '#E8735A' } : undefined}
          onClick={() => handleTabChange('board')}
          aria-label="Board">
          <span className="nav-icon"><BarChart3 size={18} /></span>
          <span>Board</span>
        </button>
        {/* 2. Concert */}
        <button className={`nav-tab ${['tournee', 'timeline'].includes(tab) ? 'active' : ''}`}
          style={['tournee', 'timeline'].includes(tab) ? { color: '#E8735A' } : undefined}
          onClick={() => handleTabChange('tournee')}
          aria-label="Concert">
          <span className="nav-icon"><Music size={18} /></span>
          <span>Concert</span>
        </button>
        {/* 3. Stock */}
        <button className={`nav-tab ${['stock_hub', 'articles', 'depots', 'stock', 'inventaire', 'achats', 'alertes'].includes(tab) ? 'active' : ''}`}
          style={['stock_hub', 'articles', 'depots', 'stock', 'inventaire', 'achats', 'alertes'].includes(tab) ? { color: '#5B8DB8' } : undefined}
          onClick={() => handleTabChange('stock_hub')}
          aria-label="Stock">
          <span className="nav-icon"><Package size={18} /></span>
          <span>Stock</span>
          {alerts.length > 0 && <span className="nav-badge">{alerts.length}</span>}
        </button>
        {/* 4. Équipe */}
        <button className={`nav-tab ${tab === 'equipe' ? 'active' : ''}`}
          style={tab === 'equipe' ? { color: '#E8735A' } : undefined}
          onClick={() => handleTabChange('equipe')}
          aria-label="Équipe">
          <span className="nav-icon"><Users size={18} /></span>
          <span>Équipe</span>
        </button>
        {/* 5. Plus */}
        <button className={`nav-tab ${showMore || ['finance', 'forecast', 'ventes', 'transport', 'settings'].includes(tab) ? 'active' : ''}`}
          style={showMore || ['finance', 'forecast', 'ventes', 'transport', 'settings'].includes(tab) ? { color: '#5B8DB8' } : undefined}
          onClick={() => setShowMore(!showMore)}
          aria-label="Plus de modules">
          <span className="nav-icon"><MoreHorizontal size={18} /></span>
          <span>Plus</span>
        </button>
      </nav>

      {/* ─── Bottom Sheet "Plus" ─── */}
      {showMore && (
        <div onClick={() => setShowMore(false)} style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.15s ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'white', borderRadius: '20px 20px 0 0',
            padding: '12px 16px max(20px, env(safe-area-inset-bottom))',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
            animation: 'slideUp 0.2s ease',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2E8F0', margin: '0 auto 16px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {MORE_ITEMS.map(item => {
                const isActive = tab === item.id
                return (
                  <button key={item.id} onClick={() => {
                    if (item.id === 'live') {
                      window.open('/live', '_blank')
                    } else {
                      handleTabChange(item.id)
                    }
                    setShowMore(false)
                  }} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 6, padding: '16px 8px', borderRadius: 12,
                    background: isActive ? `${item.color}15` : '#F8FAFC',
                    border: `1px solid ${isActive ? `${item.color}30` : '#E2E8F0'}`,
                    cursor: 'pointer',
                  }}>
                    <item.icon size={22} color={item.color} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? item.color : '#64748B' }}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Scanner Overlay ─── */}
      {showScanner && (
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader" /></div>}>
        <Scanner
          products={filteredProducts}
          locations={data.locations}
          stock={filteredStock}
          onMovement={(type) => { setShowScanner(false); setMoveModal({ type }) }}
          onClose={() => setShowScanner(false)}
          onToast={showToast}
        />
        </Suspense>
      )}

      {/* ─── Movement Modal ─── */}
      {moveModal && (
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader" /></div>}>
        <MovementModal
          type={moveModal.type}
          products={filteredProducts}
          locations={data.locations}
          stock={filteredStock}
          preselectedLocation={moveModal.preselectedLocation}
          onClose={() => setMoveModal(null)}
          onDone={() => { setMoveModal(null); loadAll() }}
          onToast={showToast}
        />
        </Suspense>
      )}

      {/* ─── Melodie Chatbot ─── */}
      <Suspense fallback={null}>
      <MelodieChat
        user={user}
        userRole={userRole}
        orgName={selectedOrg?.name}
        events={data.events}
        data={data}
      />
      </Suspense>

      {/* ─── Feedback widget (terrain) ─── */}
      <Suspense fallback={null}><Feedback context={tab} /></Suspense>
    </div>
    </ProjectProvider>
  )
}

// ─── Tab Content Router (module-driven) ───
function TabContent({
  tab, activeModuleIds, data,
  filteredProducts, filteredStock, filteredMovements, alerts,
  onNavigate, onToast, onQuickAction, onMovement, onModulesChanged,
  onOpenScanner,
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
          onQuickAction={onQuickAction}
          onNavigate={onNavigate}
          onToast={onToast}
          onOpenScanner={onOpenScanner}
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
          onToast={onToast}
        />
      )
    case 'stock_hub':
      return (
        <StockHub
          locations={data.locations}
          stock={filteredStock}
          products={filteredProducts}
          movements={filteredMovements}
          families={data.families}
          subfamilies={data.subfamilies}
          alerts={alerts}
          events={data.events}
          onToast={onToast}
          onMovement={onMovement}
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
          onToast={onToast}
        />
      )
    case 'inventaire':
      return (
        <Inventaire
          products={filteredProducts}
          stock={filteredStock}
          locations={data.locations}
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
          onClose={() => onNavigate('board')}
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
          onToast={onToast}
        />
      )
    case 'settings':
      return (
        <Settings
          activeModuleIds={activeModuleIds}
          onModulesChanged={onModulesChanged}
          onToast={onToast}
          roles={data.roles}
          userProfiles={data.project_members}
        />
      )
    default:
      return null
  }
}

// ─── Stock Module (combines Stock view + Movements with sub-tabs) ───
function StockModule({ products, locations, stock, movements, onToast, onMovement }) {
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
