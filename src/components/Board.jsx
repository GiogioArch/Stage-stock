import React, { useState, useMemo, useEffect, useRef, createElement } from 'react'
import { useToast, useProject, useBoardConfig } from '../shared/hooks'
import { parseDate, Badge, Confirm } from './UI'
import { db } from '../lib/supabase'
import { ROLE_CONF } from './RolePicker'
import EventDetail from './EventDetail'
import { FloatingDetail } from '../design'
import { MODULES, BASE, SEMANTIC, SHADOW, SPACE, RADIUS, TYPO } from '../lib/theme'
import { getMidRate, getTerritoryMult } from '../lib/forecast'
import {
  caLastDays, caTrendPct, salesToday, avgBasket,
  topProduct, salesCount, bestConcert, uniqueBuyers,
  concertsCoverage,
} from '../lib/salesKpis'
import {
  Package,
  Calendar,
  ClipboardCheck,
  ScanLine,
  Coins,
  ShoppingCart,
  AlertOctagon,
  AlertTriangle,
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Settings,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  PackagePlus,
  Wallet,
  Trophy,
  CheckCircle,
  Check,
  Sparkles,
  Euro,
  Award,
  Star,
  Users,
  BarChart3,
  Info,
} from 'lucide-react'

// ─── Icons map for hero status banner ───
const ICONS = { CheckCircle, AlertTriangle, Clock }

// ─── Icon mapping (MODULES.icon is a string, we need actual components) ───
const MOD_ICONS = {
  stock: Package,
  tournee: Calendar,
  packing: ClipboardCheck,
  scanner: ScanLine,
  finance: Coins,
  achats: ShoppingCart,
}

// Module labels for display
const MOD_LABELS = {
  stock: 'Stock',
  tournee: 'Tournée',
  packing: 'Packing',
  scanner: 'Scanner',
  finance: 'Finance',
  achats: 'Achats',
}

export default function Board({
  products, locations, stock, movements, alerts, events,
  families, subfamilies, checklists, roles, eventPacking,
  userProfiles, purchaseOrders, sales = [], saleItems = [],
  onQuickAction, onNavigate,
  onOpenScanner,
}) {
  const [showAllTopVentes, setShowAllTopVentes] = useState(false)
  const [firstLoginBanner, setFirstLoginBanner] = useState(() => {
    return localStorage.getItem('first_login_shown') === '0'
  })
  const dismissFirstLogin = () => {
    localStorage.setItem('first_login_shown', '1')
    setFirstLoginBanner(false)
  }
  // M.4 — Hint tooltip "Personnaliser" au 1er passage
  const [showBoardHint, setShowBoardHint] = useState(() => {
    return localStorage.getItem('backstage_board_hint_shown') !== '1'
  })
  const dismissBoardHint = () => {
    localStorage.setItem('backstage_board_hint_shown', '1')
    setShowBoardHint(false)
  }
  // M.4 — Indicateur "Enregistré" qui fade
  const [savedTick, setSavedTick] = useState(0)
  const savedTimerRef = useRef(null)
  const onToast = useToast()
  const { userRole } = useProject()
  const {
    boardKeys, allBoardKeys, hiddenKeys, sections,
    isEditing, setEditing, saving,
    moveUp, moveDown, toggleModule, toggleSection, resetBoard, applyRolePreset,
  } = useBoardConfig()
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventDetailSection, setEventDetailSection] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const { reload } = useProject()

  // M.4 — Quand saving retombe a false et qu'on est en edition, afficher "Enregistre"
  const wasSavingRef = useRef(false)
  useEffect(() => {
    if (wasSavingRef.current && !saving && isEditing) {
      setSavedTick(t => t + 1)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSavedTick(0), 1400)
    }
    wasSavingRef.current = saving
  }, [saving, isEditing])
  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current) }, [])

  // ─── Data calculations ───
  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { label: userRole.name }) : null
  const totalStock = stock.reduce((sum, s) => sum + (s.quantity || 0), 0)
  const criticalAlerts = alerts.filter(a => a.level === 'rupture')
  const lowAlerts = alerts.filter(a => a.level !== 'rupture')

  // ─── KPIs Stock ───
  const stockValue = useMemo(() => {
    return (stock || []).reduce((sum, s) => {
      const p = (products || []).find(pr => pr.id === s.product_id)
      if (!p) return sum
      return sum + (s.quantity || 0) * (p.cost_ht || 0)
    }, 0)
  }, [stock, products])

  const caPotentiel = useMemo(() => {
    return (stock || []).reduce((sum, s) => {
      const p = (products || []).find(pr => pr.id === s.product_id)
      return sum + (s.quantity || 0) * (p?.sell_price_ttc || 0)
    }, 0)
  }, [stock, products])

  const rotation = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000
    const out30d = (movements || [])
      .filter(m => m.type === 'out' && new Date(m.created_at) > new Date(cutoff))
      .reduce((s, m) => s + (m.quantity || 0), 0)
    const stockMoyen = totalStock / 2
    return stockMoyen > 0 ? (out30d / stockMoyen).toFixed(2) : '0.00'
  }, [movements, totalStock])

  const dormants = useMemo(() => {
    return (products || []).filter(p => {
      const lastMove = (movements || [])
        .filter(m => m.product_id === p.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      if (!lastMove) return true
      const days = (Date.now() - new Date(lastMove.created_at)) / 86400000
      return days > 90
    }).length
  }, [products, movements])

  const morts = useMemo(() => {
    return (products || []).filter(p => {
      const qty = (stock || []).filter(s => s.product_id === p.id).reduce((t, s) => t + (s.quantity || 0), 0)
      if (qty === 0) return false
      const lastOut = (movements || [])
        .filter(m => m.product_id === p.id && m.type === 'out')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      if (!lastOut) return true
      return (Date.now() - new Date(lastOut.created_at)) / 86400000 > 180
    }).length
  }, [products, stock, movements])

  const surstock = useMemo(() => {
    return (products || []).filter(p => {
      const qty = (stock || []).filter(s => s.product_id === p.id).reduce((t, s) => t + (s.quantity || 0), 0)
      return qty > (p.min_stock || 5) * 3
    }).length
  }, [products, stock])

  const topVentes = useMemo(() => {
    const salesByProduct = {}
    ;(movements || []).filter(m => m.type === 'out').forEach(m => {
      if (!salesByProduct[m.product_id]) salesByProduct[m.product_id] = 0
      salesByProduct[m.product_id] += (m.quantity || 0)
    })
    return Object.entries(salesByProduct)
      .map(([pid, qty]) => ({
        product: (products || []).find(p => p.id === pid),
        qty,
      }))
      .filter(x => x.product)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
  }, [movements, products])

  const commandesEnCours = useMemo(() => {
    return (purchaseOrders || []).filter(po =>
      !['received', 'cancelled'].includes(po.status)
    ).length
  }, [purchaseOrders])

  // ─── KPIs Ventes (calculés via src/lib/salesKpis.js) ───
  const salesKpis = useMemo(() => {
    const safeSales = sales || []
    if (safeSales.length === 0) return null
    const hasIndividual = safeSales.some(s => !s.is_aggregate)
    return {
      ca30: caLastDays(safeSales, 30),
      trendPct: caTrendPct(safeSales, 30),
      today: salesToday(safeSales),
      basket: avgBasket(safeSales, 30),
      top: topProduct(saleItems || [], products || [], 30, safeSales),
      txCount: salesCount(safeSales, 30),
      best: bestConcert(safeSales, events || [], 30),
      buyers: uniqueBuyers(safeSales, 30),
      hasIndividual,
    }
  }, [sales, saleItems, products, events])

  // ─── Couverture data concerts (bandeau info) ───
  const coverage = useMemo(
    () => concertsCoverage(sales || [], events || []),
    [sales, events]
  )

  const oldestSaleDate = useMemo(() => {
    if (!sales || sales.length === 0) return null
    return (sales || [])
      .map(s => s.created_at)
      .filter(Boolean)
      .sort()[0] || null
  }, [sales])

  const fmtEuro = (v) => {
    const n = Math.round((v || 0) * 100) / 100
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€'
  }

  const now = new Date().toISOString().split('T')[0]
  const upcomingEvents = events.filter(e => e.date >= now)
  const nextEvent = upcomingEvents[0]
  const daysToNext = nextEvent
    ? Math.ceil((new Date(nextEvent.date) - new Date()) / 86400000)
    : null

  // ─── Hero status banner (dynamic "ligne gagnante") ───
  const heroStatus = useMemo(() => {
    const ruptures = (alerts || []).filter(a => a.level === 'rupture').length
    const criticalEventsList = (events || []).filter(e => {
      const d = Math.ceil((new Date(e.date) - new Date()) / 86400000)
      return d >= 0 && d <= 3
    })
    const criticalEvents = criticalEventsList.length
    const minDays = criticalEventsList.length > 0
      ? Math.min(...criticalEventsList.map(e => Math.ceil((new Date(e.date) - new Date()) / 86400000)))
      : 0

    if (ruptures === 0 && criticalEvents === 0) {
      return {
        type: 'success',
        title: 'Tout sous contrôle',
        subtitle: 'Aucune alerte critique, tes stocks sont healthy.',
        icon: 'CheckCircle',
        color: '#16A34A',
        bg: 'linear-gradient(135deg, #10B98115, #16A34A10)',
      }
    } else if (ruptures > 0) {
      return {
        type: 'danger',
        title: `${ruptures} rupture${ruptures > 1 ? 's' : ''} à traiter`,
        subtitle: 'Tap pour voir les articles concernés',
        icon: 'AlertTriangle',
        color: '#DC2626',
        bg: 'linear-gradient(135deg, #FEE2E2, #FECACA)',
        onClick: () => onNavigate?.('alertes'),
      }
    } else if (criticalEvents > 0) {
      return {
        type: 'warning',
        title: `Concert dans ${minDays} jour${minDays > 1 ? 's' : ''}`,
        subtitle: `${criticalEvents} concert${criticalEvents > 1 ? 's' : ''} imminent${criticalEvents > 1 ? 's' : ''}`,
        icon: 'Clock',
        color: '#D97706',
        bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
      }
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, events])

  // Packing progress for next event
  const myPacking = userRole && nextEvent
    ? eventPacking.filter(ep => ep.role_code === userRole.code && ep.event_id === nextEvent.id)
    : []
  const packingDone = myPacking.filter(ep => ep.packed).length
  const packingTotal = myPacking.length
  const packingPct = packingTotal > 0 ? Math.round((packingDone / packingTotal) * 100) : 0

  // Module badges
  const badges = {
    stock: totalStock > 0 ? `${totalStock} u.` : null,
    tournee: daysToNext !== null ? `J-${daysToNext}` : null,
    packing: packingTotal > 0 ? `${packingPct}%` : null,
    scanner: null,
    finance: null,
    achats: null,
  }

  return (
    <>
      {/* ─── Event Detail floating ─── */}
      <FloatingDetail open={!!selectedEvent} onClose={() => { setSelectedEvent(null); setEventDetailSection(null) }}>
        {selectedEvent && (
          <EventDetail
            embedded
            event={selectedEvent}
            events={events}
            products={products}
            stock={stock}
            locations={locations}
            families={families}
            subfamilies={subfamilies}
            checklists={checklists}
            roles={roles}
            eventPacking={eventPacking}
            userProfiles={userProfiles || []}
            onClose={() => { setSelectedEvent(null); setEventDetailSection(null) }}
            onNavigateEvent={(ev) => { setEventDetailSection(null); setSelectedEvent(ev) }}
            onEdit={() => { setSelectedEvent(null); setEventDetailSection(null); onNavigate('tournee') }}
            onDelete={(ev) => { setSelectedEvent(null); setConfirmDelete(ev) }}
            initialSection={eventDetailSection}
          />
        )}
      </FloatingDetail>

      {/* Delete confirmation */}
      {confirmDelete && (
        <Confirm
          message="Supprimer cet événement ?"
          detail={`${confirmDelete.name || confirmDelete.lieu} — ${parseDate(confirmDelete.date).toLocaleDateString('fr-FR')}`}
          confirmLabel="Supprimer"
          confirmColor={SEMANTIC.danger}
          onConfirm={async () => {
            try {
              await db.delete('event_packing', `event_id=eq.${confirmDelete.id}`)
              await db.delete('checklists', `event_id=eq.${confirmDelete.id}`)
              await db.delete('events', `id=eq.${confirmDelete.id}`)
              onToast('Événement supprimé')
              setConfirmDelete(null)
              reload()
            } catch (e) {
              onToast('Erreur: ' + e.message, SEMANTIC.danger)
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div style={{ padding: `0 ${SPACE.lg}px ${SPACE.xxl}px` }}>

        {/* ═══ 1. EN-TÊTE : Bonjour + Prochain événement ═══ */}
        <div style={{
          padding: `${SPACE.xl}px ${SPACE.xl - 2}px`, borderRadius: RADIUS.xl, marginBottom: SPACE.lg,
          background: `linear-gradient(135deg, ${SEMANTIC.info}12, ${SEMANTIC.info}06)`,
          border: `1px solid ${SEMANTIC.info}20`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ ...TYPO.h1, color: BASE.text, marginBottom: SPACE.xs }}>
                Bonjour{roleConf ? ` !` : ' !'}
              </div>
              {roleConf && (
                <div style={{ fontSize: 13, color: BASE.textSoft, marginBottom: SPACE.md }}>
                  {roleConf.label}
                </div>
              )}
            </div>
            {/* Bouton personnaliser (M.4 — pill purple + label + hint) */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => {
                  if (showBoardHint) dismissBoardHint()
                  setEditing(!isEditing)
                }}
                aria-label={isEditing ? 'Terminer l\'edition' : 'Personnaliser le board'}
                className="customize-pill"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 12,
                  background: isEditing ? '#7C3AED' : 'rgba(124,58,237,0.08)',
                  border: `1px solid ${isEditing ? '#7C3AED' : 'rgba(124,58,237,0.25)'}`,
                  color: isEditing ? '#FFFFFF' : '#7C3AED',
                  fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
                  boxShadow: isEditing ? '0 2px 6px rgba(124,58,237,0.25)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isEditing) e.currentTarget.style.background = 'rgba(124,58,237,0.15)'
                }}
                onMouseLeave={e => {
                  if (!isEditing) e.currentTarget.style.background = 'rgba(124,58,237,0.08)'
                }}
              >
                {createElement(isEditing ? Check : Settings, { size: 18 })}
                <span>{isEditing ? 'Terminer' : 'Personnaliser'}</span>
              </button>

              {/* Hint callout 1er passage */}
              {showBoardHint && !isEditing && (
                <div
                  className="fade-in"
                  style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: 240, zIndex: 10,
                    padding: '10px 12px', borderRadius: 12,
                    background: '#FFFFFF',
                    border: '1px solid rgba(124,58,237,0.35)',
                    boxShadow: '0 8px 24px rgba(124,58,237,0.18)',
                    fontSize: 12, color: BASE.text, lineHeight: 1.4,
                  }}
                  role="tooltip"
                >
                  {/* Fleche vers le bouton */}
                  <div style={{
                    position: 'absolute', top: -6, right: 20,
                    width: 10, height: 10,
                    background: '#FFFFFF',
                    borderLeft: '1px solid rgba(124,58,237,0.35)',
                    borderTop: '1px solid rgba(124,58,237,0.35)',
                    transform: 'rotate(45deg)',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                    {createElement(Sparkles, { size: 14, style: { color: '#7C3AED', flexShrink: 0, marginTop: 1 } })}
                    <div>
                      Masque ce qui ne te sert pas, reorganise a ton gout.
                    </div>
                  </div>
                  <button
                    onClick={dismissBoardHint}
                    style={{
                      padding: '4px 10px', borderRadius: 8,
                      background: '#7C3AED', color: '#FFFFFF',
                      fontSize: 11, fontWeight: 600,
                      border: 'none', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    Compris {createElement(Check, { size: 12 })}
                  </button>
                </div>
              )}
            </div>
          </div>

          {nextEvent ? (
            <div
              onClick={() => setSelectedEvent(nextEvent)}
              className="card-hover"
              style={{
                display: 'flex', alignItems: 'center', gap: SPACE.md,
                padding: `${SPACE.md}px ${SPACE.md + 2}px`, borderRadius: RADIUS.lg,
                background: BASE.white, cursor: 'pointer',
                border: `1px solid ${BASE.border}`,
                boxShadow: SHADOW.sm,
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: RADIUS.lg,
                background: MODULES.tournee.bg, color: MODULES.tournee.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontWeight: 700, fontSize: 13, lineHeight: 1.1, textAlign: 'center',
              }}>
                {parseDate(nextEvent.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...TYPO.bodyBold, color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nextEvent.name || nextEvent.lieu}
                </div>
                <div style={{ ...TYPO.micro, color: BASE.textSoft }}>
                  {nextEvent.ville} — {nextEvent.format}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: 18, fontWeight: 700,
                  color: daysToNext <= 7 ? SEMANTIC.warning : SEMANTIC.info,
                }}>
                  J-{daysToNext}
                </div>
                <div style={{ ...TYPO.label, color: BASE.textMuted }}>
                  Voir {createElement(ChevronRight, { size: 10, style: { verticalAlign: 'middle' } })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: BASE.textMuted }}>
              Aucun événement à venir
            </div>
          )}
        </div>

        {/* ═══ HERO STATUS BANNER (ligne gagnante dynamique) ═══ */}
        {heroStatus && (
          <div
            onClick={heroStatus.onClick}
            className="card-hover fade-count-up"
            style={{
              margin: `0 0 ${SPACE.lg}px`,
              padding: '16px 20px',
              borderRadius: 16,
              background: heroStatus.bg,
              cursor: heroStatus.onClick ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: `1px solid ${heroStatus.color}20`,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: heroStatus.color, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {createElement(ICONS[heroStatus.icon], { size: 20 })}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: heroStatus.color }}>
                {heroStatus.title}
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                {heroStatus.subtitle}
              </div>
            </div>
            {heroStatus.onClick && createElement(ChevronRight, { size: 18, style: { color: heroStatus.color, flexShrink: 0 } })}
          </div>
        )}

        {/* ═══ BANDEAU PREMIERE CONNEXION ═══ */}
        {firstLoginBanner && (
          <div style={{
            padding: `${SPACE.md}px ${SPACE.lg}px`, borderRadius: RADIUS.lg, marginBottom: SPACE.lg,
            background: `linear-gradient(135deg, ${SEMANTIC.success}15, ${SEMANTIC.info}10)`,
            border: `1px solid ${SEMANTIC.success}30`,
            position: 'relative',
          }}>
            <button
              onClick={dismissFirstLogin}
              aria-label="Fermer"
              style={{
                position: 'absolute', top: 8, right: 8,
                width: 24, height: 24, borderRadius: 12,
                background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: BASE.textMuted,
              }}
            >
              {createElement(X, { size: 14 })}
            </button>
            <div style={{ fontSize: 14, fontWeight: 700, color: BASE.text, marginBottom: 4 }}>
              Bienvenue sur BackStage !
            </div>
            <div style={{ fontSize: 12, color: BASE.textSoft, marginBottom: SPACE.sm, lineHeight: 1.5 }}>
              Tu peux commencer par ajouter des articles dans l'onglet <strong>Articles</strong>,
              ou créer ton premier concert dans <strong>Tournée</strong>.
              Tout est accessible en 3 clics max.
            </div>
            <button
              onClick={dismissFirstLogin}
              style={{
                padding: '6px 14px', borderRadius: RADIUS.md,
                background: SEMANTIC.success, color: BASE.white,
                fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >
              OK, c'est parti
            </button>
          </div>
        )}

        {/* ═══ MODE ÉDITION ═══ */}
        {isEditing && (
          <div style={{
            padding: SPACE.lg, borderRadius: RADIUS.xl, marginBottom: SPACE.lg,
            background: BASE.white, border: `2px solid rgba(124,58,237,0.35)`,
            boxShadow: SHADOW.card, position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md, gap: SPACE.sm }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ ...TYPO.bodyBold, color: '#7C3AED' }}>Mode edition</div>
                {savedTick > 0 && (
                  <div
                    key={savedTick}
                    className="saved-pop"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '2px 8px', borderRadius: 10,
                      background: 'rgba(93,171,139,0.12)',
                      color: '#16A34A', fontSize: 11, fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {createElement(Check, { size: 11 })} Enregistre
                  </div>
                )}
              </div>
              <button onClick={resetBoard} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: RADIUS.sm, fontSize: 12,
                background: 'none', border: `1px solid ${BASE.border}`,
                color: BASE.textSoft, cursor: 'pointer', flexShrink: 0,
              }}>
                {createElement(RotateCcw, { size: 12 })} Reinitialiser
              </button>
            </div>
            <div style={{ ...TYPO.micro, color: BASE.textSoft, marginBottom: SPACE.md }}>
              Glisse, masque, reorganise — tout est enregistre automatiquement.
            </div>

            {/* Module list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allBoardKeys.map((key, idx) => {
                const mod = MODULES[key]
                const Icon = MOD_ICONS[key]
                const isHidden = hiddenKeys.includes(key)
                if (!mod || !Icon) return null
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: SPACE.sm,
                    padding: `${SPACE.sm + 2}px ${SPACE.md}px`,
                    borderRadius: RADIUS.md,
                    background: isHidden ? `${BASE.bgHover}` : mod.bg,
                    border: `1px solid ${isHidden ? BASE.border : mod.color + '25'}`,
                    opacity: isHidden ? 0.6 : 1,
                  }}>
                    {/* Icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: RADIUS.sm,
                      background: isHidden ? BASE.bgHover : BASE.white,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {createElement(Icon, { size: 18, style: { color: isHidden ? BASE.textMuted : mod.color } })}
                    </div>

                    {/* Label */}
                    <div style={{
                      flex: 1, fontSize: 14, fontWeight: 600,
                      color: isHidden ? BASE.textMuted : mod.color,
                    }}>
                      {MOD_LABELS[key] || mod.label || key}
                    </div>

                    {/* Move buttons */}
                    <button onClick={() => moveUp(key)} disabled={idx === 0 || saving}
                      aria-label="Monter" style={editBtnStyle(idx === 0)}>
                      {createElement(ChevronUp, { size: 16 })}
                    </button>
                    <button onClick={() => moveDown(key)} disabled={idx === allBoardKeys.length - 1 || saving}
                      aria-label="Descendre" style={editBtnStyle(idx === allBoardKeys.length - 1)}>
                      {createElement(ChevronDown, { size: 16 })}
                    </button>

                    {/* Toggle visibility */}
                    <button onClick={() => toggleModule(key)} disabled={saving}
                      aria-label={isHidden ? 'Afficher' : 'Masquer'}
                      style={{
                        ...editBtnStyle(false),
                        color: isHidden ? SEMANTIC.danger : SEMANTIC.success,
                      }}>
                      {createElement(isHidden ? EyeOff : Eye, { size: 16 })}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Section toggles */}
            <div style={{ marginTop: SPACE.lg, paddingTop: SPACE.md, borderTop: `1px solid ${BASE.border}` }}>
              <div style={{ ...TYPO.label, color: BASE.textSoft, marginBottom: SPACE.sm }}>Sections</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { id: 'alerts', label: 'Alertes' },
                  { id: 'quick_actions', label: 'Actions rapides' },
                  { id: 'packing', label: 'Packing' },
                  { id: 'upcoming', label: 'Prochains events' },
                  { id: 'ventes', label: 'KPIs Ventes' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleSection(s.id)}
                    style={{
                      padding: '6px 12px', borderRadius: RADIUS.md, fontSize: 12, fontWeight: 500,
                      background: sections[s.id] ? SEMANTIC.info : BASE.bgHover,
                      color: sections[s.id] ? BASE.white : BASE.textMuted,
                      border: `1px solid ${sections[s.id] ? SEMANTIC.info : BASE.border}`,
                      cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {saving && savedTick === 0 && (
              <div style={{ marginTop: SPACE.sm, fontSize: 11, color: '#7C3AED', textAlign: 'center', opacity: 0.7 }}>
                Sauvegarde...
              </div>
            )}

            {/* Appliquer le preset metier */}
            {userRole?.code && (
              <div style={{ marginTop: SPACE.md, paddingTop: SPACE.md, borderTop: `1px solid ${BASE.border}` }}>
                <button
                  onClick={() => {
                    if (!applyRolePreset) return
                    if (window.confirm('Remplacer par le préréglage métier ?')) {
                      applyRolePreset()
                      onToast && onToast('Preset métier appliqué', SEMANTIC.success)
                    }
                  }}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: RADIUS.md,
                    background: 'none', border: `1px dashed ${SEMANTIC.melodie}60`,
                    color: SEMANTIC.melodie, fontSize: 12, fontWeight: 600,
                    cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  Recommandé pour mon métier
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ 2. BANDEAU ALERTES (seulement si problèmes + section visible) ═══ */}
        {sections.alerts && (criticalAlerts.length > 0 || lowAlerts.length > 0) && (
          <div
            onClick={() => onNavigate('stock_hub')}
            className={criticalAlerts.length > 0 ? 'pulse-alert card-hover' : 'card-hover'}
            style={{
              display: 'flex', alignItems: 'center', gap: SPACE.md,
              padding: `${SPACE.md}px ${SPACE.lg}px`, borderRadius: RADIUS.lg, marginBottom: SPACE.lg,
              background: criticalAlerts.length > 0 ? 'rgba(212,100,138,0.08)' : 'rgba(232,147,90,0.08)',
              border: `1px solid ${criticalAlerts.length > 0 ? 'rgba(212,100,138,0.2)' : 'rgba(232,147,90,0.2)'}`,
              cursor: 'pointer',
            }}
          >
            {createElement(criticalAlerts.length > 0 ? AlertOctagon : AlertTriangle, {
              size: 20,
              style: { color: criticalAlerts.length > 0 ? SEMANTIC.danger : SEMANTIC.warning, flexShrink: 0 },
            })}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: BASE.text }}>
                {criticalAlerts.length > 0
                  ? `${criticalAlerts.length} rupture${criticalAlerts.length > 1 ? 's' : ''}`
                  : `${lowAlerts.length} alerte${lowAlerts.length > 1 ? 's' : ''} stock`
                }
                {criticalAlerts.length > 0 && lowAlerts.length > 0 && (
                  <span style={{ fontWeight: 400, color: BASE.textSoft }}>
                    {' '}+ {lowAlerts.length} alerte{lowAlerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            {createElement(ChevronRight, { size: 16, style: { color: BASE.textMuted } })}
          </div>
        )}

        {/* ═══ 3. GRILLE MODULES (dynamique) ═══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: SPACE.md,
          marginBottom: SPACE.xl,
        }}>
          {boardKeys.map(key => {
            const mod = MODULES[key]
            const Icon = MOD_ICONS[key]
            if (!mod || !Icon) return null
            const handleClick = () => {
              if (key === 'packing') {
                if (nextEvent) {
                  setEventDetailSection('packing')
                  setSelectedEvent(nextEvent)
                } else {
                  onNavigate('tournee')
                  onToast && onToast('Sélectionne un concert pour accéder au packing', 'info')
                }
                return
              }
              if (key === 'scanner') {
                onOpenScanner && onOpenScanner()
                return
              }
              // Map board keys to their actual tab IDs
              const TAB_MAP = { stock: 'stock_hub' }
              onNavigate(TAB_MAP[key] || key)
            }
            return (
              <button
                key={key}
                onClick={handleClick}
                className="card-hover"
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: `${SPACE.xxl - 2}px ${SPACE.md}px ${SPACE.xl - 2}px`,
                  borderRadius: RADIUS.xl,
                  background: mod.bg,
                  border: isEditing
                    ? `1.5px dashed rgba(124,58,237,0.55)`
                    : `1.5px solid ${mod.color}18`,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.15s, box-shadow 0.15s, border-color 160ms ease',
                  boxShadow: SHADOW.sm,
                }}
                onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {/* Badge */}
                {badges[key] && (
                  <div style={{
                    position: 'absolute', top: SPACE.sm, right: SPACE.md - 2,
                    ...TYPO.label, fontSize: 10,
                    color: mod.color, background: BASE.white,
                    padding: '2px 7px', borderRadius: RADIUS.md,
                    boxShadow: SHADOW.sm,
                  }}>
                    {badges[key]}
                  </div>
                )}

                <div style={{
                  width: 52, height: 52, borderRadius: RADIUS.md + 4,
                  background: BASE.white,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: SPACE.md - 2,
                  boxShadow: SHADOW.card,
                }}>
                  {createElement(Icon, { size: 26, style: { color: mod.color } })}
                </div>
                <div style={{
                  ...TYPO.bodyBold, color: mod.color,
                  letterSpacing: 0.2,
                }}>
                  {MOD_LABELS[key] || mod.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* ═══ 4. ACTIONS RAPIDES (petit format) ═══ */}
        {sections.quick_actions && (
          <>
            <div style={{ ...TYPO.label, color: BASE.textSoft, marginBottom: SPACE.sm }}>
              Actions rapides
            </div>
            <div style={{ display: 'flex', gap: SPACE.sm, marginBottom: SPACE.xl }}>
              <QuickBtn icon={ArrowDownToLine} label="Entrée" color={SEMANTIC.success} onClick={() => onQuickAction('in')} />
              <QuickBtn icon={ArrowUpFromLine} label="Sortie" color={SEMANTIC.danger} onClick={() => onQuickAction('out')} />
              <QuickBtn icon={RefreshCw} label="Transfert" color={SEMANTIC.info} onClick={() => onQuickAction('transfer')} />
            </div>
          </>
        )}

        {/* ═══ 5. PACKING PROGRESS (si applicable) ═══ */}
        {sections.packing && packingTotal > 0 && nextEvent && (
          <div style={{
            padding: `${SPACE.md + 2}px ${SPACE.lg}px`, borderRadius: RADIUS.lg, marginBottom: SPACE.lg,
            background: BASE.white, border: `1px solid ${BASE.border}`,
            boxShadow: SHADOW.sm,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.sm }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: BASE.text }}>
                  Mon packing — {nextEvent.name || nextEvent.lieu}
                </div>
                <div style={{ ...TYPO.micro, color: BASE.textSoft }}>
                  {packingDone}/{packingTotal} items prêts
                </div>
              </div>
              <div style={{
                fontSize: 20, fontWeight: 700,
                color: packingPct === 100 ? SEMANTIC.success : packingPct >= 50 ? SEMANTIC.warning : SEMANTIC.danger,
              }}>{packingPct}%</div>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: BASE.bgHover, overflow: 'hidden' }}>
              <div style={{
                width: `${packingPct}%`, height: '100%', borderRadius: 3,
                background: packingPct === 100 ? SEMANTIC.success : MODULES.packing.color,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        )}

        {/* ═══ 5b. FORECAST RÉSUMÉ (merch prévisions prochains events) ═══ */}
        {upcomingEvents.length > 0 && products.filter(p => p.category === 'merch').length > 0 && (() => {
          const merchProducts = products.filter(p => p.category === 'merch')
          const totalMerchStock = merchProducts.reduce((sum, p) =>
            sum + stock.filter(s => s.product_id === p.id).reduce((s2, st) => s2 + (st.quantity || 0), 0), 0)
          const totalForecast = upcomingEvents.slice(0, 5).reduce((sum, ev) => {
            const rate = getMidRate(ev.format)
            const mult = getTerritoryMult(ev.territoire)
            return sum + Math.round((ev.capacite || 300) * rate * mult)
          }, 0)
          const coverage = totalForecast > 0 ? Math.round((totalMerchStock / totalForecast) * 100) : 100
          if (totalForecast === 0) return null
          return (
            <div
              onClick={() => onNavigate('forecast')}
              className="card-hover"
              style={{
                padding: `${SPACE.md + 2}px ${SPACE.lg}px`, borderRadius: RADIUS.lg, marginBottom: SPACE.lg,
                background: BASE.white, border: `1px solid ${BASE.border}`,
                boxShadow: SHADOW.sm, cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.sm }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
                  {createElement(TrendingUp, { size: 16, style: { color: MODULES.forecast?.color || SEMANTIC.warning } })}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: BASE.text }}>Prévisions merch</div>
                    <div style={{ ...TYPO.micro, color: BASE.textSoft }}>
                      {totalMerchStock} en stock · ~{totalForecast} prévus ({upcomingEvents.slice(0, 5).length} dates)
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 700,
                  color: coverage >= 100 ? SEMANTIC.success : coverage >= 60 ? SEMANTIC.warning : SEMANTIC.danger,
                }}>{coverage}%</div>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: BASE.bgHover, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, coverage)}%`, height: '100%', borderRadius: 2,
                  background: coverage >= 100 ? SEMANTIC.success : coverage >= 60 ? SEMANTIC.warning : SEMANTIC.danger,
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ ...TYPO.label, color: SEMANTIC.info, marginTop: SPACE.sm, textAlign: 'right' }}>
                Voir les prévisions {createElement(ChevronRight, { size: 10, style: { verticalAlign: 'middle' } })}
              </div>
            </div>
          )
        })()}

        {/* ═══ 5b-bis. KPIs VENTES (au-dessus des KPIs Stock) ═══ */}
        {sections.ventes && (
          <>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginTop: SPACE.sm, marginBottom: SPACE.sm, gap: SPACE.sm,
            }}>
              <div style={{ ...TYPO.label, color: BASE.textSoft }}>
                Ventes
              </div>
              {salesKpis && (
                <div style={{ fontSize: 10, color: BASE.textMuted }}>
                  {sales.length} vente{sales.length > 1 ? 's' : ''}
                  {oldestSaleDate ? ` · depuis ${new Date(oldestSaleDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}
                </div>
              )}
            </div>

            {!salesKpis ? (
              /* Cas vide — carte unique élégante */
              <div
                className="fade-count-up"
                style={{
                  padding: `${SPACE.lg}px ${SPACE.lg}px`,
                  borderRadius: RADIUS.lg,
                  background: `linear-gradient(135deg, ${SEMANTIC.success}10, ${SEMANTIC.success}06)`,
                  border: `1px solid ${SEMANTIC.success}25`,
                  marginBottom: SPACE.lg,
                  display: 'flex', alignItems: 'center', gap: SPACE.md,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: RADIUS.md,
                  background: BASE.white,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, boxShadow: SHADOW.sm,
                }}>
                  {createElement(BarChart3, { size: 22, style: { color: SEMANTIC.success } })}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: BASE.text, marginBottom: 2 }}>
                    Pas encore de ventes enregistrées
                  </div>
                  <div style={{ fontSize: 11, color: BASE.textSoft, lineHeight: 1.4 }}>
                    Les KPIs apparaîtront dès le premier concert importé.
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Bandeau info couverture concerts */}
                {coverage.total > 0 && coverage.covered < coverage.total && (
                  <div
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: 12, borderRadius: 10,
                      background: 'rgba(234, 179, 8, 0.08)',
                      border: '1px solid rgba(234, 179, 8, 0.18)',
                      marginBottom: SPACE.sm,
                      fontSize: 13, lineHeight: 1.45, color: '#854D0E',
                    }}
                  >
                    {createElement(Info, { size: 16, style: { color: '#854D0E', flexShrink: 0, marginTop: 1 } })}
                    <div>
                      Données basées sur {coverage.covered}/{coverage.total} concerts terminés.
                      {' '}{coverage.missing} à saisir.
                    </div>
                  </div>
                )}

                {/* 3 x 2 = 6 cartes KPIs ventes */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.sm, marginBottom: SPACE.sm,
                }}>
                  <KpiCard
                    icon={Euro}
                    color={SEMANTIC.success}
                    label="CA 30 jours"
                    value={fmtEuro(salesKpis.ca30)}
                    sub={
                      salesKpis.trendPct === null
                        ? 'vs J-60'
                        : `${salesKpis.trendPct >= 0 ? '↑' : '↓'} ${Math.abs(salesKpis.trendPct)}% vs J-60`
                    }
                    delay={0}
                  />
                  <KpiCard
                    icon={ShoppingCart}
                    color={SEMANTIC.success}
                    label="Ventes aujourd'hui"
                    value={salesKpis.today.count}
                    sub={fmtEuro(salesKpis.today.total)}
                    delay={50}
                  />
                  <KpiCard
                    icon={TrendingUp}
                    color={SEMANTIC.success}
                    label="Panier moyen"
                    value={salesKpis.hasIndividual ? fmtEuro(salesKpis.basket) : '—'}
                    sub={salesKpis.hasIndividual ? '30 derniers jours' : 'tickets individuels à venir'}
                    delay={100}
                  />
                  <KpiCard
                    icon={Award}
                    color={SEMANTIC.success}
                    label="Top produit 30j"
                    value={
                      salesKpis.top.name
                        ? (salesKpis.top.name.length > 14
                            ? salesKpis.top.name.slice(0, 13) + '…'
                            : salesKpis.top.name)
                        : '—'
                    }
                    sub={salesKpis.top.qty > 0 ? `${salesKpis.top.qty} u.` : 'Aucune vente'}
                    delay={150}
                  />
                  <KpiCard
                    icon={Star}
                    color={SEMANTIC.success}
                    label="Meilleur concert"
                    value={
                      salesKpis.best.name
                        ? (salesKpis.best.name.length > 14
                            ? salesKpis.best.name.slice(0, 13) + '…'
                            : salesKpis.best.name)
                        : '—'
                    }
                    sub={salesKpis.best.total > 0 ? fmtEuro(salesKpis.best.total) : 'Aucune vente rattachée'}
                    delay={200}
                  />
                  <KpiCard
                    icon={Users}
                    color={SEMANTIC.success}
                    label="Transactions 30j"
                    value={salesKpis.txCount}
                    sub={`${salesKpis.buyers} acheteur${salesKpis.buyers > 1 ? 's' : ''}`}
                    delay={250}
                  />
                </div>
                <div style={{ height: SPACE.md }} />
              </>
            )}
          </>
        )}

        {/* ═══ 5c. KPIs STOCK (8 metriques cles) ═══ */}
        <div style={{ ...TYPO.label, color: BASE.textSoft, marginBottom: SPACE.sm, marginTop: SPACE.sm }}>
          KPIs Stock
        </div>

        {/* 4 cards principales */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.sm, marginBottom: SPACE.sm,
        }}>
          <KpiCard
            icon={Wallet}
            color={SEMANTIC.info}
            label="Valeur stock"
            value={fmtEuro(stockValue)}
            sub="cout achat"
            delay={0}
          />
          <KpiCard
            icon={TrendingUp}
            color={SEMANTIC.success}
            label="CA potentiel"
            value={fmtEuro(caPotentiel)}
            sub="si tout vendu"
            delay={50}
          />
          <KpiCard
            icon={RefreshCw}
            color={MODULES.tournee?.color || SEMANTIC.info}
            label="Rotation 30j"
            value={`x${rotation}`}
            sub="sorties / stock moyen"
            delay={100}
          />
          <KpiCard
            icon={ShoppingCart}
            color={MODULES.achats?.color || SEMANTIC.warning}
            label="Commandes"
            value={commandesEnCours}
            sub="en cours"
            onClick={() => onNavigate && onNavigate('achats')}
            delay={150}
          />
        </div>

        {/* 3 cards alertes */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: SPACE.sm, marginBottom: SPACE.lg,
        }}>
          <KpiCard
            icon={Clock}
            color={SEMANTIC.warning}
            label="Dormant"
            value={dormants}
            sub=">90j"
            compact
            delay={200}
          />
          <KpiCard
            icon={AlertTriangle}
            color={SEMANTIC.danger}
            label="Mort"
            value={morts}
            sub=">180j"
            compact
            delay={250}
          />
          <KpiCard
            icon={PackagePlus}
            color={SEMANTIC.info}
            label="Surstock"
            value={surstock}
            sub=">3x min"
            compact
            delay={300}
          />
        </div>

        {/* Top 10 ventes */}
        {topVentes.length > 0 && (
          <div style={{
            padding: `${SPACE.md}px ${SPACE.lg}px`, borderRadius: RADIUS.lg, marginBottom: SPACE.lg,
            background: BASE.white, border: `1px solid ${BASE.border}`, boxShadow: SHADOW.sm,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm }}>
              {createElement(Trophy, { size: 16, style: { color: SEMANTIC.warning } })}
              <div style={{ fontSize: 13, fontWeight: 700, color: BASE.text }}>Top ventes</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(showAllTopVentes ? topVentes : topVentes.slice(0, 3)).map((tv, idx) => (
                <div key={tv.product.id} style={{
                  display: 'flex', alignItems: 'center', gap: SPACE.sm,
                  padding: `${SPACE.xs + 2}px ${SPACE.sm}px`, borderRadius: RADIUS.sm,
                  background: idx < 3 ? `${SEMANTIC.warning}08` : BASE.bgHover,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 11,
                    background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : BASE.bgHover,
                    color: idx < 3 ? BASE.white : BASE.textMuted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tv.product.name || tv.product.sku}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: SEMANTIC.success, flexShrink: 0 }}>
                    {tv.qty}
                  </div>
                </div>
              ))}
            </div>
            {topVentes.length > 3 && (
              <button onClick={() => setShowAllTopVentes(!showAllTopVentes)} style={{
                marginTop: SPACE.sm, width: '100%', padding: '6px',
                background: 'none', border: 'none', color: SEMANTIC.info,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                {showAllTopVentes ? 'Voir moins' : `Voir + (${topVentes.length - 3})`}
              </button>
            )}
          </div>
        )}

        {/* ═══ 6. PROCHAINS ÉVÉNEMENTS (compact) ═══ */}
        {sections.upcoming && upcomingEvents.length > 1 && (
          <>
            <div style={{ ...TYPO.label, color: BASE.textSoft, marginBottom: SPACE.sm }}>
              Prochains événements
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: SPACE.sm }}>
              {upcomingEvents.slice(1, 4).map(ev => {
                const d = Math.ceil((new Date(ev.date) - new Date()) / 86400000)
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="card-hover"
                    style={{
                      display: 'flex', alignItems: 'center', gap: SPACE.md - 2, padding: `${SPACE.md - 2}px ${SPACE.md}px`,
                      borderRadius: RADIUS.md, background: BASE.white, border: `1px solid ${BASE.border}`,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: RADIUS.sm,
                      background: MODULES.tournee.bg, color: MODULES.tournee.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, lineHeight: 1.1, textAlign: 'center', flexShrink: 0,
                    }}>
                      {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.name || ev.lieu}
                      </div>
                      <div style={{ ...TYPO.micro, color: BASE.textSoft }}>{ev.ville}</div>
                    </div>
                    <Badge color={d <= 7 ? SEMANTIC.warning : SEMANTIC.info}>J-{d}</Badge>
                  </div>
                )
              })}
            </div>
            {upcomingEvents.length > 4 && (
              <button
                onClick={() => onNavigate('tournee')}
                style={{
                  width: '100%', padding: SPACE.md - 2, borderRadius: RADIUS.md,
                  background: 'none', border: `1px dashed ${BASE.border}`,
                  ...TYPO.caption, color: SEMANTIC.info,
                  cursor: 'pointer', textAlign: 'center',
                }}
              >
                Voir les {upcomingEvents.length} dates
                {createElement(ChevronRight, { size: 12, style: { verticalAlign: 'middle', marginLeft: SPACE.xs } })}
              </button>
            )}
          </>
        )}

      </div>
    </>
  )
}

// ─── Edit button style helper ───
function editBtnStyle(disabled) {
  return {
    width: 28, height: 28, borderRadius: RADIUS.sm,
    background: 'none', border: `1px solid ${BASE.border}`,
    color: disabled ? BASE.border : BASE.textMuted,
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, flexShrink: 0,
  }
}

// ─── KPI card (Stock metrics) ───
function KpiCard({ icon, color, label, value, sub, compact, onClick, delay = 0 }) {
  return (
    <div
      onClick={onClick}
      className={`fade-count-up${onClick ? ' card-hover' : ''}`}
      style={{
        padding: compact ? `${SPACE.sm + 2}px ${SPACE.sm}px` : `${SPACE.md}px ${SPACE.md}px`,
        borderRadius: RADIUS.lg,
        background: BASE.white,
        border: `1px solid ${BASE.border}`,
        boxShadow: SHADOW.sm,
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 4,
        minHeight: compact ? 70 : 86,
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: compact ? 22 : 26, height: compact ? 22 : 26, borderRadius: RADIUS.sm,
          background: `${color}15`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {createElement(icon, { size: compact ? 12 : 14 })}
        </div>
        <div style={{ fontSize: compact ? 10 : 11, fontWeight: 600, color: BASE.textSoft, textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: compact ? 18 : 20, fontWeight: 700, color: BASE.text, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: BASE.textMuted }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ─── Quick action button (compact) ───
function QuickBtn({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: `${SPACE.md - 2}px ${SPACE.sm}px`, borderRadius: RADIUS.md,
      background: BASE.white, border: `1px solid ${BASE.border}`,
      ...TYPO.caption, color,
      cursor: 'pointer',
    }}>
      {createElement(icon, { size: 16 })}
      {label}
    </button>
  )
}
