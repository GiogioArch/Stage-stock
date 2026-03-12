import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { auth, db, safe } from './lib/supabase'
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
import { Toast } from './components/UI'

// ─── Tab config (6 tabs now) ───
const TABS = [
  { id: 'board', icon: '📊', label: 'Board' },
  { id: 'products', icon: '📦', label: 'Produits' },
  { id: 'stocks', icon: '🏭', label: 'Stocks' },
  { id: 'movements', icon: '📋', label: 'Mouvements' },
  { id: 'alerts', icon: '🔔', label: 'Alertes' },
  { id: 'checklists', icon: '✅', label: 'Checks' },
]

// Admin role codes that see everything
const ADMIN_CODES = ['TM', 'PM', 'LOG', 'PA']

export default function App() {
  // ─── Auth state ───
  const [user, setUser] = useState(undefined) // undefined=checking, null=logged out, object=logged in
  const [tab, setTab] = useState('board')
  const [toast, setToast] = useState(null)

  // ─── Role state ───
  const [userRole, setUserRole] = useState(undefined) // undefined=loading, null=no role, object=role
  const [userProfile, setUserProfile] = useState(null)

  // ─── Data state ───
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [stock, setStock] = useState([])
  const [movements, setMovements] = useState([])
  const [events, setEvents] = useState([])
  const [families, setFamilies] = useState([])
  const [subfamilies, setSubfamilies] = useState([])
  const [checklists, setChecklists] = useState([])
  const [roles, setRoles] = useState([])
  const [eventPacking, setEventPacking] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ─── Scanner state ───
  const [showScanner, setShowScanner] = useState(false)

  // ─── Scroll position per tab (BUG-009) ───
  const scrollPositions = useRef({})
  const handleTabChange = useCallback((newTab) => {
    scrollPositions.current[tab] = window.scrollY
    setTab(newTab)
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositions.current[newTab] || 0)
    })
  }, [tab])

  // ─── Offline detection ───
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // ─── Movement modal ───
  const [moveModal, setMoveModal] = useState(null) // null | {type, preselectedLocation?}

  // ─── Toast helper ───
  const showToast = useCallback((message, color) => {
    setToast({ message, color: color || '#5DAB8B' })
  }, [])

  // ─── Auth check ───
  useEffect(() => {
    auth.getUser().then(u => {
      setUser(u || null)
    })
  }, [])

  // ─── Load user profile & role after auth ───
  const loadUserProfile = useCallback(async (userId, rolesData) => {
    try {
      const profiles = await db.get('user_profiles', `user_id=eq.${userId}`)
      if (profiles && profiles.length > 0) {
        const profile = profiles[0]
        setUserProfile(profile)
        if (profile.role_id && rolesData && rolesData.length > 0) {
          const role = rolesData.find(r => r.id === profile.role_id)
          setUserRole(role || null)
        } else {
          setUserRole(null)
        }
      } else {
        setUserProfile(null)
        setUserRole(null)
      }
    } catch {
      // If user_profiles table doesn't exist or query fails, no role
      setUserProfile(null)
      setUserRole(null)
    }
  }, [])

  // ─── Load all data ───
  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [p, l, s, m, e, f, sf, cl, ro, ep] = await Promise.all([
        safe('products', 'order=name.asc'),
        safe('locations', 'order=name.asc'),
        safe('stock'),
        safe('movements', 'order=created_at.desc&limit=200'),
        safe('events', 'order=date.asc'),
        safe('families', 'order=name.asc'),
        safe('subfamilies', 'order=name.asc'),
        safe('checklists', 'order=category.asc,item.asc'),
        safe('roles', 'order=code.asc'),
        safe('event_packing', 'order=role_code.asc,created_at.asc'),
      ])
      setProducts(p)
      setLocations(l)
      setStock(s)
      setMovements(m)
      setEvents(e)
      setFamilies(f)
      setSubfamilies(sf)
      setChecklists(cl)
      setRoles(ro)
      setEventPacking(ep)

      // Load user profile after roles are available
      await loadUserProfile(user.id, ro)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user, loadUserProfile])

  useEffect(() => {
    if (user) loadAll()
  }, [user, loadAll])

  // Auto-refresh every 30 seconds (skip if modal is open — BUG-008)
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      if (!moveModal && !showScanner) loadAll()
    }, 30000)
    return () => clearInterval(interval)
  }, [user, loadAll, moveModal, showScanner])

  // ─── Filtered data based on user role ───
  const isAdmin = useMemo(() => {
    if (!userRole) return true // No role = show all (fallback)
    return ADMIN_CODES.includes(userRole.code)
  }, [userRole])

  const filteredProducts = useMemo(() => {
    if (isAdmin || !userRole) return products
    const subfamIds = userRole.subfamily_ids || []
    if (subfamIds.length === 0) return products
    return products.filter(p => {
      if (!p.subfamily_id) return false
      return subfamIds.includes(p.subfamily_id)
    })
  }, [products, userRole, isAdmin])

  const filteredStock = useMemo(() => {
    if (isAdmin || !userRole) return stock
    const filteredProductIds = new Set(filteredProducts.map(p => p.id))
    return stock.filter(s => filteredProductIds.has(s.product_id))
  }, [stock, filteredProducts, userRole, isAdmin])

  const filteredMovements = useMemo(() => {
    if (isAdmin || !userRole) return movements
    const filteredProductIds = new Set(filteredProducts.map(p => p.id))
    return movements.filter(m => filteredProductIds.has(m.product_id))
  }, [movements, filteredProducts, userRole, isAdmin])

  // ─── Compute alerts (based on filtered products) ───
  const alerts = filteredProducts.map(p => {
    const totalStock = filteredStock.filter(s => s.product_id === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0)
    const minStock = p.min_stock || 5
    if (totalStock <= 0) return { ...p, currentStock: totalStock, minStock, level: 'rupture' }
    if (totalStock <= minStock) return { ...p, currentStock: totalStock, minStock, level: 'alerte' }
    return null
  }).filter(Boolean)

  // ─── Handle role selected from picker ───
  const handleRoleSelected = useCallback((role) => {
    setUserRole(role)
  }, [])

  // ─── Screens ───

  // Checking auth
  if (user === undefined) {
    return <SplashScreen text="Vérification..." />
  }

  // Not logged in
  if (user === null) {
    return <Auth onAuth={(u) => setUser(u)} />
  }

  // Loading data
  if (loading && products.length === 0) {
    return <SplashScreen text="Chargement des données..." />
  }

  // Error (but no data loaded)
  if (error && products.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ color: '#D4648A', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Erreur de connexion</div>
        <div style={{ color: '#9A8B94', fontSize: 13, marginBottom: 20 }}>{error}</div>
        <button className="btn-primary" style={{ maxWidth: 200 }} onClick={loadAll}>Réessayer</button>
      </div>
    )
  }

  // Role picker (no role assigned yet)
  if (userRole === null && roles.length > 0) {
    return (
      <RolePicker
        roles={roles}
        userId={user.id}
        onRoleSelected={handleRoleSelected}
        onToast={showToast}
      />
    )
  }

  // Role badge info
  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { icon: '📋', color: '#9A8B94', label: userRole.name }) : null

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)', paddingBottom: 80 }}>
      {/* ─── Header ─── */}
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
            <div style={{ fontSize: 10, color: '#C4A8B6', letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>v9.0 — EK TOUR 25 ANS</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {offline && (
            <span style={{
              padding: '5px 10px', borderRadius: 10, background: '#FEF3CD',
              border: '1.5px solid #F0D78C', color: '#856404', fontSize: 11, fontWeight: 800,
            }}>Hors ligne</span>
          )}
          {/* Scanner button */}
          <button onClick={() => setShowScanner(true)} style={{
            width: 36, height: 36, borderRadius: 10, background: '#EEF4FA',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            border: '1.5px solid #5B8DB830', cursor: 'pointer',
          }}>📷</button>
          {alerts.filter(a => a.level === 'rupture').length > 0 && (
            <button onClick={() => handleTabChange('alerts')} style={{
              padding: '5px 12px', borderRadius: 10, background: '#FDF0F4',
              border: '1.5px solid #F5C4BC', color: '#D4648A', fontSize: 11, fontWeight: 800,
              animation: 'pulse 2s infinite',
            }}>
              {alerts.filter(a => a.level === 'rupture').length} 🚨
            </button>
          )}
          {/* Role badge */}
          {roleConf && (
            <span style={{
              padding: '5px 10px', borderRadius: 10,
              background: `${roleConf.color}12`,
              border: `1.5px solid ${roleConf.color}30`,
              color: roleConf.color, fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 14 }}>{roleConf.icon}</span>
              {userRole.code}
            </span>
          )}
          <button onClick={() => { auth.signOut(); setUser(null); setUserRole(undefined); setUserProfile(null) }} style={{
            width: 36, height: 36, borderRadius: 10, background: '#F8F0FA',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🚪</button>
        </div>
      </header>

      {/* ─── Tab Content ─── */}
      {tab === 'board' && (
        <Board
          products={filteredProducts}
          locations={locations}
          stock={filteredStock}
          movements={filteredMovements}
          alerts={alerts}
          events={events}
          families={families}
          subfamilies={subfamilies}
          checklists={checklists}
          roles={roles}
          eventPacking={eventPacking}
          userRole={userRole}
          onQuickAction={(type) => setMoveModal({ type })}
          onNavigate={handleTabChange}
          onReload={loadAll}
          onToast={showToast}
        />
      )}

      {tab === 'products' && (
        <Products
          products={filteredProducts}
          families={families}
          subfamilies={subfamilies}
          stock={filteredStock}
          locations={locations}
          onReload={loadAll}
          onToast={showToast}
        />
      )}

      {tab === 'stocks' && (
        <Stocks
          products={filteredProducts}
          locations={locations}
          stock={filteredStock}
          onReload={loadAll}
          onToast={showToast}
          onMovement={(type, locId) => setMoveModal({ type, preselectedLocation: locId })}
        />
      )}

      {tab === 'movements' && (
        <Movements
          movements={filteredMovements}
          products={filteredProducts}
          locations={locations}
          onToast={showToast}
        />
      )}

      {tab === 'alerts' && (
        <Alerts
          alerts={alerts}
          events={events}
          products={filteredProducts}
          stock={filteredStock}
          locations={locations}
          userRole={userRole}
        />
      )}

      {tab === 'checklists' && (
        <Checklists
          checklists={checklists}
          events={events}
          onReload={loadAll}
          onToast={showToast}
        />
      )}

      {/* ─── Bottom Nav (scrollable for 6 tabs) ─── */}
      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.id} className={`nav-tab ${tab === t.id ? 'active' : ''}`} onClick={() => handleTabChange(t.id)}>
            <span className="nav-icon">{t.icon}</span>
            <span>{t.label}</span>
            {t.id === 'alerts' && alerts.length > 0 && (
              <span className="nav-badge">{alerts.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ─── Scanner Overlay ─── */}
      {showScanner && (
        <Scanner
          products={filteredProducts}
          locations={locations}
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
          locations={locations}
          stock={filteredStock}
          preselectedLocation={moveModal.preselectedLocation}
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
