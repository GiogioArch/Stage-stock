import React, { useState, useEffect, useCallback, useRef } from 'react'
import { auth, db, safe } from './lib/supabase'
import Auth from './components/Auth'
import Board from './components/Board'
import Products from './components/Products'
import Stocks from './components/Stocks'
import Checklists from './components/Checklists'
import MovementModal from './components/MovementModal'
import { Toast, fmtDate } from './components/UI'

// ─── Tab config ───
const TABS = [
  { id: 'board', icon: '📊', label: 'Board' },
  { id: 'products', icon: '📦', label: 'Produits' },
  { id: 'stocks', icon: '🏭', label: 'Stocks' },
  { id: 'checklists', icon: '✅', label: 'Checks' },
]

export default function App() {
  // ─── Auth state ───
  const [user, setUser] = useState(undefined) // undefined=checking, null=logged out, object=logged in
  const [tab, setTab] = useState('board')
  const [toast, setToast] = useState(null)

  // ─── Data state ───
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [stock, setStock] = useState([])
  const [movements, setMovements] = useState([])
  const [events, setEvents] = useState([])
  const [families, setFamilies] = useState([])
  const [subfamilies, setSubfamilies] = useState([])
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  // ─── Load all data ───
  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      // Each query in its own try/catch — resilient loading
      const [p, l, s, m, e, f, sf, cl] = await Promise.all([
        safe('products', 'order=name.asc'),
        safe('locations', 'order=name.asc'),
        safe('stock'),
        safe('movements', 'order=created_at.desc&limit=50'),
        safe('events', 'order=date.asc'),
        safe('families', 'order=name.asc'),
        safe('subfamilies', 'order=name.asc'),
        safe('checklists', 'order=category.asc,item.asc'),
      ])
      setProducts(p)
      setLocations(l)
      setStock(s)
      setMovements(m)
      setEvents(e)
      setFamilies(f)
      setSubfamilies(sf)
      setChecklists(cl)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) loadAll()
  }, [user, loadAll])

  // Auto-refresh every 30 seconds (skip if modal is open — BUG-008)
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      if (!moveModal) loadAll()
    }, 30000)
    return () => clearInterval(interval)
  }, [user, loadAll, moveModal])

  // ─── Compute alerts ───
  const alerts = products.map(p => {
    const totalStock = stock.filter(s => s.product_id === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0)
    const minStock = p.min_stock || 5
    if (totalStock <= 0) return { ...p, currentStock: totalStock, minStock, level: 'rupture' }
    if (totalStock <= minStock) return { ...p, currentStock: totalStock, minStock, level: 'alerte' }
    return null
  }).filter(Boolean)

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
            <div style={{ fontSize: 10, color: '#C4A8B6', letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>v8.0 — EK TOUR 25 ANS</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {offline && (
            <span style={{
              padding: '5px 10px', borderRadius: 10, background: '#FEF3CD',
              border: '1.5px solid #F0D78C', color: '#856404', fontSize: 11, fontWeight: 800,
            }}>Hors ligne</span>
          )}
          {alerts.filter(a => a.level === 'rupture').length > 0 && (
            <button onClick={() => handleTabChange('board')} style={{
              padding: '5px 12px', borderRadius: 10, background: '#FDF0F4',
              border: '1.5px solid #F5C4BC', color: '#D4648A', fontSize: 11, fontWeight: 800,
              animation: 'pulse 2s infinite',
            }}>
              {alerts.filter(a => a.level === 'rupture').length} 🚨
            </button>
          )}
          <button onClick={() => { auth.signOut(); setUser(null) }} style={{
            width: 36, height: 36, borderRadius: 10, background: '#F8F0FA',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🚪</button>
        </div>
      </header>

      {/* ─── Tab Content ─── */}
      {tab === 'board' && (
        <Board
          products={products}
          locations={locations}
          stock={stock}
          movements={movements}
          alerts={alerts}
          events={events}
          onQuickAction={(type) => setMoveModal({ type })}
          onNavigate={handleTabChange}
        />
      )}

      {tab === 'products' && (
        <Products
          products={products}
          families={families}
          subfamilies={subfamilies}
          stock={stock}
          locations={locations}
          onReload={loadAll}
          onToast={showToast}
        />
      )}

      {tab === 'stocks' && (
        <Stocks
          products={products}
          locations={locations}
          stock={stock}
          onReload={loadAll}
          onToast={showToast}
          onMovement={(type, locId) => setMoveModal({ type, preselectedLocation: locId })}
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

      {/* ─── Bottom Nav ─── */}
      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.id} className={`nav-tab ${tab === t.id ? 'active' : ''}`} onClick={() => handleTabChange(t.id)}>
            <span className="nav-icon">{t.icon}</span>
            <span>{t.label}</span>
            {t.id === 'stocks' && alerts.length > 0 && (
              <span className="nav-badge">{alerts.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ─── Movement Modal ─── */}
      {moveModal && (
        <MovementModal
          type={moveModal.type}
          products={products}
          locations={locations}
          stock={stock}
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
