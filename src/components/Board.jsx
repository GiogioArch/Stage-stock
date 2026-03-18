import React, { useState, createElement } from 'react'
import { parseDate, Badge } from './UI'
import { ROLE_CONF } from './RolePicker'
import EventDetail from './EventDetail'
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

// ─── Palette pastel harmonisée ───
const MOD = {
  stock:   { icon: Package,        label: 'Stock',    color: '#5B8DB8', bg: '#E8F0FE', tab: 'stock' },
  tournee: { icon: Calendar,       label: 'Tournée',  color: '#E8735A', bg: '#FDE8E4', tab: 'tournee' },
  packing: { icon: ClipboardCheck, label: 'Packing',  color: '#5DAB8B', bg: '#E4F5EF', tab: 'packing' },
  scanner: { icon: ScanLine,       label: 'Scanner',  color: '#8B6DB8', bg: '#F0E8FE', tab: 'scanner' },
  finance: { icon: Coins,          label: 'Finance',  color: '#E8935A', bg: '#FEF0E4', tab: 'finance' },
  achats:  { icon: ShoppingCart,    label: 'Achats',   color: '#D4648A', bg: '#FDE4EE', tab: 'achats' },
}

const C = {
  text: '#1E293B',
  textSoft: '#64748B',
  textMuted: '#94A3B8',
  bg: '#F8FAFC',
  border: '#E2E8F0',
  white: '#FFFFFF',
  danger: '#D4648A',
  warning: '#E8935A',
  success: '#5DAB8B',
  accent: '#5B8DB8',
}

export default function Board({
  products, locations, stock, movements, alerts, events,
  families, subfamilies, checklists, roles, eventPacking,
  userProfiles, userRole, onQuickAction, onNavigate, onReload, onToast,
}) {
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
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 560, maxHeight: '85vh',
              background: 'white', borderRadius: 20,
              boxShadow: '0 12px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
              overflowY: 'auto', WebkitOverflowScrolling: 'touch',
              animation: 'scaleIn 0.2s ease',
            }}
          >
            <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'white', borderRadius: '20px 20px 0 0', padding: '10px 14px 0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedEvent(null)} style={{ width: 30, height: 30, borderRadius: 15, background: '#F1F5F9', border: 'none', fontSize: 16, color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
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
              onReload={onReload}
              onToast={onToast}
              onNavigateEvent={(ev) => setSelectedEvent(ev)}
            />
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px 24px' }}>

        {/* ═══ 1. EN-TÊTE : Bonjour + Prochain événement ═══ */}
        <div style={{
          padding: '20px 18px', borderRadius: 16, marginBottom: 16,
          background: `linear-gradient(135deg, ${C.accent}12, ${C.accent}06)`,
          border: `1px solid ${C.accent}20`,
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            Bonjour{roleConf ? ` !` : ' !'}
          </div>
          {roleConf && (
            <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 12 }}>
              {roleConf.label}
            </div>
          )}

          {nextEvent ? (
            <div
              onClick={() => setSelectedEvent(nextEvent)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: C.white, cursor: 'pointer',
                border: `1px solid ${C.border}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: MOD.tournee.bg, color: MOD.tournee.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontWeight: 700, fontSize: 13, lineHeight: 1.1, textAlign: 'center',
              }}>
                {parseDate(nextEvent.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nextEvent.name || nextEvent.lieu}
                </div>
                <div style={{ fontSize: 11, color: C.textSoft }}>
                  {nextEvent.ville} — {nextEvent.format}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: 18, fontWeight: 700,
                  color: daysToNext <= 7 ? C.warning : C.accent,
                }}>
                  J-{daysToNext}
                </div>
                <div style={{ fontSize: 10, color: C.textMuted }}>
                  Voir {createElement(ChevronRight, { size: 10, style: { verticalAlign: 'middle' } })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: C.textMuted }}>
              Aucun événement à venir
            </div>
          )}
        </div>

        {/* ═══ 2. BANDEAU ALERTES (seulement si problèmes) ═══ */}
        {(criticalAlerts.length > 0 || lowAlerts.length > 0) && (
          <div
            onClick={() => onNavigate('alertes')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 12, marginBottom: 16,
              background: criticalAlerts.length > 0 ? 'rgba(212,100,138,0.08)' : 'rgba(232,147,90,0.08)',
              border: `1px solid ${criticalAlerts.length > 0 ? 'rgba(212,100,138,0.2)' : 'rgba(232,147,90,0.2)'}`,
              cursor: 'pointer',
            }}
          >
            {createElement(criticalAlerts.length > 0 ? AlertOctagon : AlertTriangle, {
              size: 20,
              style: { color: criticalAlerts.length > 0 ? C.danger : C.warning, flexShrink: 0 },
            })}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                {criticalAlerts.length > 0
                  ? `${criticalAlerts.length} rupture${criticalAlerts.length > 1 ? 's' : ''}`
                  : `${lowAlerts.length} alerte${lowAlerts.length > 1 ? 's' : ''} stock`
                }
                {criticalAlerts.length > 0 && lowAlerts.length > 0 && (
                  <span style={{ fontWeight: 400, color: C.textSoft }}>
                    {' '}+ {lowAlerts.length} alerte{lowAlerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            {createElement(ChevronRight, { size: 16, style: { color: C.textMuted } })}
          </div>
        )}

        {/* ═══ 3. GRILLE MODULES 2×3 ═══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 20,
        }}>
          {Object.entries(MOD).map(([key, mod]) => (
            <button
              key={key}
              onClick={() => onNavigate(mod.tab)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '22px 12px 18px',
                borderRadius: 16,
                background: mod.bg,
                border: `1.5px solid ${mod.color}18`,
                cursor: 'pointer',
                position: 'relative',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {/* Badge */}
              {badges[key] && (
                <div style={{
                  position: 'absolute', top: 8, right: 10,
                  fontSize: 10, fontWeight: 700,
                  color: mod.color, background: C.white,
                  padding: '2px 7px', borderRadius: 10,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                  {badges[key]}
                </div>
              )}

              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: C.white,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              }}>
                {createElement(mod.icon, { size: 26, style: { color: mod.color } })}
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700, color: mod.color,
                letterSpacing: 0.2,
              }}>
                {mod.label}
              </div>
            </button>
          ))}
        </div>

        {/* ═══ 4. ACTIONS RAPIDES (petit format) ═══ */}
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textSoft, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Actions rapides
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <QuickBtn icon={ArrowDownToLine} label="Entrée" color={C.success} onClick={() => onQuickAction('in')} />
          <QuickBtn icon={ArrowUpFromLine} label="Sortie" color={C.danger} onClick={() => onQuickAction('out')} />
          <QuickBtn icon={RefreshCw} label="Transfert" color={C.accent} onClick={() => onQuickAction('transfer')} />
        </div>

        {/* ═══ 5. PACKING PROGRESS (si applicable) ═══ */}
        {packingTotal > 0 && nextEvent && (
          <div style={{
            padding: '14px 16px', borderRadius: 12, marginBottom: 16,
            background: C.white, border: `1px solid ${C.border}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  Mon packing — {nextEvent.name || nextEvent.lieu}
                </div>
                <div style={{ fontSize: 11, color: C.textSoft }}>
                  {packingDone}/{packingTotal} items prêts
                </div>
              </div>
              <div style={{
                fontSize: 20, fontWeight: 700,
                color: packingPct === 100 ? C.success : packingPct >= 50 ? C.warning : C.danger,
              }}>{packingPct}%</div>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
              <div style={{
                width: `${packingPct}%`, height: '100%', borderRadius: 3,
                background: packingPct === 100 ? C.success : MOD.packing.color,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        )}

        {/* ═══ 6. PROCHAINS ÉVÉNEMENTS (compact) ═══ */}
        {upcomingEvents.length > 1 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSoft, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Prochains événements
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {upcomingEvents.slice(1, 4).map(ev => {
                const d = Math.ceil((new Date(ev.date) - new Date()) / 86400000)
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 10, background: C.white, border: `1px solid ${C.border}`,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: MOD.tournee.bg, color: MOD.tournee.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, lineHeight: 1.1, textAlign: 'center', flexShrink: 0,
                    }}>
                      {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.name || ev.lieu}
                      </div>
                      <div style={{ fontSize: 11, color: C.textSoft }}>{ev.ville}</div>
                    </div>
                    <Badge color={d <= 7 ? C.warning : C.accent}>J-{d}</Badge>
                  </div>
                )
              })}
            </div>
            {upcomingEvents.length > 4 && (
              <button
                onClick={() => onNavigate('tournee')}
                style={{
                  width: '100%', padding: 10, borderRadius: 10,
                  background: 'none', border: `1px dashed ${C.border}`,
                  fontSize: 12, fontWeight: 600, color: C.accent,
                  cursor: 'pointer', textAlign: 'center',
                }}
              >
                Voir les {upcomingEvents.length} dates
                {createElement(ChevronRight, { size: 12, style: { verticalAlign: 'middle', marginLeft: 4 } })}
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
      padding: '10px 8px', borderRadius: 10,
      background: C.white, border: `1px solid ${C.border}`,
      fontSize: 12, fontWeight: 600, color,
      cursor: 'pointer',
    }}>
      {createElement(icon, { size: 16 })}
      {label}
    </button>
  )
}
