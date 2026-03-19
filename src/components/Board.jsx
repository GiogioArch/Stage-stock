import React, { useState, createElement } from 'react'
import { useToast, useProject } from '../shared/hooks'
import { parseDate, Badge } from './UI'
import { ROLE_CONF } from './RolePicker'
import EventDetail from './EventDetail'
import { FloatingDetail } from '../design'
import { MODULES, BASE, SEMANTIC, SHADOW, SPACE, RADIUS, TYPO } from '../lib/theme'
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
} from 'lucide-react'

// ─── Icon mapping (MODULES.icon is a string, we need actual components) ───
const MOD_ICONS = {
  stock: Package,
  tournee: Calendar,
  packing: ClipboardCheck,
  scanner: ScanLine,
  finance: Coins,
  achats: ShoppingCart,
}

// Keys rendered on the Board grid
const BOARD_KEYS = ['stock', 'tournee', 'packing', 'scanner', 'finance', 'achats']

export default function Board({
  products, locations, stock, movements, alerts, events,
  families, subfamilies, checklists, roles, eventPacking,
  userProfiles, onQuickAction, onNavigate,
  onOpenScanner,
}) {
  const onToast = useToast()
  const { userRole, reload } = useProject()
  const [selectedEvent, setSelectedEvent] = useState(null)

  // ─── Data calculations ───
  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { label: userRole.name }) : null
  const totalStock = stock.reduce((sum, s) => sum + (s.quantity || 0), 0)
  const criticalAlerts = alerts.filter(a => a.level === 'rupture')
  const lowAlerts = alerts.filter(a => a.level !== 'rupture')

  const now = new Date().toISOString().split('T')[0]
  const upcomingEvents = events.filter(e => e.date >= now)
  const nextEvent = upcomingEvents[0]
  const daysToNext = nextEvent
    ? Math.ceil((new Date(nextEvent.date) - new Date()) / 86400000)
    : null

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
      <FloatingDetail open={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
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
            userRole={userRole}
            onClose={() => setSelectedEvent(null)}
            reload={reload}
            onToast={onToast}
            onNavigateEvent={(ev) => setSelectedEvent(ev)}
          />
        )}
      </FloatingDetail>

      <div style={{ padding: `0 ${SPACE.lg}px ${SPACE.xxl}px` }}>

        {/* ═══ 1. EN-TÊTE : Bonjour + Prochain événement ═══ */}
        <div style={{
          padding: `${SPACE.xl}px ${SPACE.xl - 2}px`, borderRadius: RADIUS.xl, marginBottom: SPACE.lg,
          background: `linear-gradient(135deg, ${SEMANTIC.info}12, ${SEMANTIC.info}06)`,
          border: `1px solid ${SEMANTIC.info}20`,
        }}>
          <div style={{ ...TYPO.h1, color: BASE.text, marginBottom: SPACE.xs }}>
            Bonjour{roleConf ? ` !` : ' !'}
          </div>
          {roleConf && (
            <div style={{ fontSize: 13, color: BASE.textSoft, marginBottom: SPACE.md }}>
              {roleConf.label}
            </div>
          )}

          {nextEvent ? (
            <div
              onClick={() => setSelectedEvent(nextEvent)}
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

        {/* ═══ 2. BANDEAU ALERTES (seulement si problèmes) ═══ */}
        {(criticalAlerts.length > 0 || lowAlerts.length > 0) && (
          <div
            onClick={() => onNavigate('alertes')}
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

        {/* ═══ 3. GRILLE MODULES 2×3 ═══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: SPACE.md,
          marginBottom: SPACE.xl,
        }}>
          {BOARD_KEYS.map(key => {
            const mod = MODULES[key]
            const Icon = MOD_ICONS[key]
            const handleClick = () => {
              if (key === 'packing') {
                if (nextEvent) {
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
              onNavigate(key)
            }
            return (
              <button
                key={key}
                onClick={handleClick}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: `${SPACE.xxl - 2}px ${SPACE.md}px ${SPACE.xl - 2}px`,
                  borderRadius: RADIUS.xl,
                  background: mod.bg,
                  border: `1.5px solid ${mod.color}18`,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.15s, box-shadow 0.15s',
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
                  {mod.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* ═══ 4. ACTIONS RAPIDES (petit format) ═══ */}
        <div style={{ ...TYPO.label, color: BASE.textSoft, marginBottom: SPACE.sm }}>
          Actions rapides
        </div>
        <div style={{ display: 'flex', gap: SPACE.sm, marginBottom: SPACE.xl }}>
          <QuickBtn icon={ArrowDownToLine} label="Entrée" color={SEMANTIC.success} onClick={() => onQuickAction('in')} />
          <QuickBtn icon={ArrowUpFromLine} label="Sortie" color={SEMANTIC.danger} onClick={() => onQuickAction('out')} />
          <QuickBtn icon={RefreshCw} label="Transfert" color={SEMANTIC.info} onClick={() => onQuickAction('transfer')} />
        </div>

        {/* ═══ 5. PACKING PROGRESS (si applicable) ═══ */}
        {packingTotal > 0 && nextEvent && (
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

        {/* ═══ 6. PROCHAINS ÉVÉNEMENTS (compact) ═══ */}
        {upcomingEvents.length > 1 && (
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
