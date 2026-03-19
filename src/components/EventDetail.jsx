import React, { useState, useMemo, useCallback } from 'react'
import { ClipboardList, Users, CheckSquare, Package, TrendingUp, Volume2, Lightbulb, Guitar, Drama, Shirt, Truck, Battery, FileText, ChevronLeft, ChevronRight, Pencil, Trash2, Ship, AlertTriangle, AlertCircle, Check, Plus } from 'lucide-react'
import { db } from '../lib/supabase'
import { Badge, CATEGORIES, fmtDate, parseDate } from './UI'
import { ROLE_CONF } from './RolePicker'
import PackingList from './PackingList'
import { getModuleTheme, BASE, SEMANTIC, SPACE, TYPO, RADIUS, SHADOW } from '../lib/theme'
import { SubTabs } from '../design'
import { useToast } from '../shared/hooks'

const theme = getModuleTheme('tournee')

// Hex→rgb helper for inline rgba
function hexToRgbLocal(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

// ─── Forecast helpers ───
const CONVERSION_RATES = {
  'concert live': { low: 0.10, mid: 0.11, high: 0.12 },
  'concert':      { low: 0.10, mid: 0.11, high: 0.12 },
  'live':         { low: 0.10, mid: 0.11, high: 0.12 },
  'sound system':  { low: 0.06, mid: 0.07, high: 0.08 },
  'soundsystem':   { low: 0.06, mid: 0.07, high: 0.08 },
  'impro':         { low: 0.12, mid: 0.135, high: 0.15 },
  'improvisation': { low: 0.12, mid: 0.135, high: 0.15 },
}
const DEFAULT_RATE = { low: 0.08, mid: 0.10, high: 0.12 }
const TERRITORY_MULT = { 'martinique': 1.0, 'guadeloupe': 0.85 }

function getConvRate(format) {
  if (!format) return DEFAULT_RATE
  return CONVERSION_RATES[format.toLowerCase().trim()] || DEFAULT_RATE
}
function getTerrMult(territoire) {
  if (!territoire) return 0.90
  return TERRITORY_MULT[territoire.toLowerCase().trim()] || 0.90
}

const CHECK_CATS = {
  son:          { icon: Volume2, color: '#E8735A', label: 'Son' },
  lumiere:      { icon: Lightbulb, color: '#8B6DB8', label: 'Lumière' },
  instruments:  { icon: Guitar, color: '#D4648A', label: 'Instruments' },
  decor:        { icon: Drama, color: '#8B6DB8', label: 'Décor' },
  merch:        { icon: Shirt, color: '#8B6DB8', label: 'Merch' },
  logistique:   { icon: Truck, color: '#5DAB8B', label: 'Logistique' },
  consommables: { icon: Battery, color: '#5DAB8B', label: 'Consommables' },
}

const SECTIONS = [
  { id: 'resume', label: 'Résumé', icon: ClipboardList },
  { id: 'equipe', label: 'Équipe', icon: Users },
  { id: 'checklist', label: 'Check', icon: CheckSquare },
  { id: 'packing', label: 'Packing', icon: Package },
  { id: 'previsions', label: 'Prévisions', icon: TrendingUp },
]

export default function EventDetail({
  event, events, products, stock, locations, families, subfamilies,
  checklists, roles, eventPacking, userProfiles, userRole, orgId,
  onClose, onReload, onNavigateEvent, onEdit, onDelete, embedded,
}) {
  const onToast = useToast()
  const [section, setSection] = useState('resume')

  const daysUntil = Math.ceil((new Date(event.date) - new Date()) / 86400000)
  const isPast = event.date < new Date().toISOString().split('T')[0]

  // Checklist for this event
  const eventChecklist = useMemo(() =>
    checklists.filter(c => c.event_id === event.id),
    [checklists, event.id]
  )
  const checkDone = eventChecklist.filter(c => c.checked).length
  const checkTotal = eventChecklist.length

  // Packing for this event
  const evPacking = useMemo(() =>
    (eventPacking || []).filter(ep => ep.event_id === event.id),
    [eventPacking, event.id]
  )
  const packDone = evPacking.filter(ep => ep.packed).length
  const packTotal = evPacking.length

  // Prev/next events navigation
  const sortedEvents = useMemo(() =>
    [...(events || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  )
  const currentIdx = sortedEvents.findIndex(e => e.id === event.id)
  const prevEvent = currentIdx > 0 ? sortedEvents[currentIdx - 1] : null
  const nextEvent = currentIdx < sortedEvents.length - 1 ? sortedEvents[currentIdx + 1] : null

  // Update section label with counts
  const sectionLabels = SECTIONS.map(s => {
    if (s.id === 'checklist' && checkTotal > 0) return { ...s, label: `Check (${checkDone}/${checkTotal})` }
    if (s.id === 'packing' && packTotal > 0) return { ...s, label: `Pack (${packDone}/${packTotal})` }
    return s
  })

  return (
    <div style={{
      ...(!embedded ? { position: 'fixed', inset: 0, zIndex: 90 } : {}),
      background: BASE.bgSurface,
      overflowY: embedded ? undefined : 'auto',
      paddingBottom: embedded ? SPACE.xxl : 80,
    }}>
      {/* ─── Top bar ─── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        padding: `${SPACE.md}px ${SPACE.lg}px`, borderBottom: `1px solid ${BASE.border}`,
        display: 'flex', alignItems: 'center', gap: SPACE.md,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: RADIUS.sm, background: theme.tint08,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', border: 'none', color: theme.color,
        }} aria-label="Retour"><ChevronLeft size={18} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TYPO.bodyBold, color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.name || event.lieu}
          </div>
          <div style={{ ...TYPO.label, color: BASE.textSoft, textTransform: 'none', letterSpacing: 0 }}>
            {parseDate(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <Badge color={isPast ? BASE.textMuted : daysUntil <= 3 ? SEMANTIC.danger : daysUntil <= 7 ? SEMANTIC.warning : SEMANTIC.success}>
          {isPast ? 'Terminé' : daysUntil === 0 ? "Aujourd'hui" : `J-${daysUntil}`}
        </Badge>
        {onEdit && (
          <button onClick={() => onEdit(event)} style={{
            width: 36, height: 36, borderRadius: RADIUS.sm, background: theme.tint08,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: `1px solid ${theme.tint15}`, color: theme.color,
          }} aria-label="Modifier"><Pencil size={14} /></button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(event)} style={{
            width: 36, height: 36, borderRadius: RADIUS.sm, background: `rgba(${hexToRgbLocal(SEMANTIC.danger)}, 0.08)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: `1px solid rgba(${hexToRgbLocal(SEMANTIC.danger)}, 0.15)`, color: SEMANTIC.danger,
          }} aria-label="Supprimer"><Trash2 size={14} /></button>
        )}
      </div>

      {/* ─── Event hero ─── */}
      <div style={{ padding: `${SPACE.xl}px ${SPACE.lg}px ${SPACE.md}px`, textAlign: 'center' }}>
        <div style={{ ...TYPO.h1, color: BASE.text, marginBottom: SPACE.xs }}>{event.name || event.lieu}</div>
        <div style={{ ...TYPO.body, color: BASE.textMuted, marginBottom: SPACE.md }}>
          {event.lieu} — {event.ville} ({event.territoire})
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: SPACE.sm, flexWrap: 'wrap' }}>
          <Badge color={SEMANTIC.melodie}>
            {parseDate(event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Badge>
          {event.format && <Badge color={theme.color}>{event.format}</Badge>}
          {event.capacite && <Badge color={SEMANTIC.melodie}>{event.capacite} pers.</Badge>}
          {event.transport_inter_iles && <Badge color={SEMANTIC.warning}>Inter-îles</Badge>}
          {event.statut && <Badge color={SEMANTIC.success}>{event.statut}</Badge>}
        </div>
      </div>

      {/* ─── Prev / Next nav ─── */}
      {onNavigateEvent && (prevEvent || nextEvent) && (
        <div style={{ display: 'flex', gap: SPACE.sm, padding: `0 ${SPACE.lg}px ${SPACE.md}px`, justifyContent: 'space-between' }}>
          {prevEvent ? (
            <button onClick={() => onNavigateEvent(prevEvent)} style={{
              flex: 1, padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: RADIUS.sm, ...TYPO.micro,
              background: BASE.bgSurface, border: `1px solid ${BASE.border}`, color: BASE.textSoft, cursor: 'pointer',
              textAlign: 'left', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              display: 'flex', alignItems: 'center', gap: SPACE.xs,
            }}>
              <ChevronLeft size={12} /> {prevEvent.name || prevEvent.lieu}
            </button>
          ) : <div style={{ flex: 1 }} />}
          {nextEvent ? (
            <button onClick={() => onNavigateEvent(nextEvent)} style={{
              flex: 1, padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: RADIUS.sm, ...TYPO.micro,
              background: BASE.bgSurface, border: `1px solid ${BASE.border}`, color: BASE.textSoft, cursor: 'pointer',
              textAlign: 'right', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: SPACE.xs,
            }}>
              {nextEvent.name || nextEvent.lieu} <ChevronRight size={12} />
            </button>
          ) : <div style={{ flex: 1 }} />}
        </div>
      )}

      {/* ─── Section tabs ─── */}
      <SubTabs tabs={sectionLabels} active={section} onChange={setSection} />

      {/* ─── Content ─── */}
      <div style={{ padding: '0 16px 24px' }}>
        {section === 'resume' && (
          <ResumeSection
            event={event}
            products={products}
            stock={stock}
            locations={locations}
            subfamilies={subfamilies}
            checklists={checklists}
            eventPacking={eventPacking}
            checkDone={checkDone}
            checkTotal={checkTotal}
            packDone={packDone}
            packTotal={packTotal}
            daysUntil={daysUntil}
            onSectionChange={setSection}
            onReload={onReload}
          />
        )}
        {section === 'equipe' && (
          <EquipeSection
            event={event}
            roles={roles}
            userProfiles={userProfiles || []}
            eventPacking={eventPacking}
          />
        )}
        {section === 'checklist' && (
          <ChecklistSection
            event={event}
            checklists={checklists}
            eventChecklist={eventChecklist}
            checkDone={checkDone}
            checkTotal={checkTotal}
            orgId={orgId}
            onReload={onReload}
          />
        )}
        {section === 'packing' && (
          <PackingList
            event={event}
            products={products}
            stock={stock}
            locations={locations}
            roles={roles || []}
            eventPacking={eventPacking || []}
            onReload={onReload}
            onToast={onToast}
          />
        )}
        {section === 'previsions' && (
          <PrevisionsSection
            event={event}
            products={products}
            stock={stock}
          />
        )}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RÉSUMÉ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ResumeSection({ event, products, stock, locations, subfamilies, checkDone, checkTotal, packDone, packTotal, daysUntil, onSectionChange, onReload }) {
  const onToast = useToast()

  // Stock by category
  const catStats = CATEGORIES.map(cat => {
    const catProducts = products.filter(p => p.category === cat.id)
    const qty = catProducts.reduce((sum, p) => {
      return sum + stock.filter(s => s.product_id === p.id).reduce((s2, s) => s2 + (s.quantity || 0), 0)
    }, 0)
    return { ...cat, count: catProducts.length, qty }
  })

  return (
    <div>
      {/* Infos clés */}
      <div className="card" style={{ padding: SPACE.lg, marginBottom: SPACE.md, background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
        <div style={{ ...TYPO.caption, color: BASE.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.md }}>
          Informations
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.md }}>
          <InfoRow label="Date" value={parseDate(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
          <InfoRow label="Compte à rebours" value={daysUntil > 0 ? `J-${daysUntil}` : daysUntil === 0 ? "Aujourd'hui" : 'Terminé'} color={daysUntil <= 3 && daysUntil >= 0 ? SEMANTIC.danger : undefined} />
          <InfoRow label="Lieu" value={event.lieu || '—'} />
          <InfoRow label="Ville" value={event.ville || '—'} />
          <InfoRow label="Territoire" value={event.territoire || '—'} />
          <InfoRow label="Format" value={event.format || '—'} />
          <InfoRow label="Capacité" value={event.capacite ? `${event.capacite} personnes` : '—'} />
          <InfoRow label="Statut" value={event.statut || 'Planifié'} />
        </div>
      </div>

      {/* Flags / alertes */}
      {(event.transport_inter_iles || event.reappro_necessaire) && (
        <div style={{ display: 'flex', gap: SPACE.sm, flexWrap: 'wrap', marginBottom: SPACE.md }}>
          {event.transport_inter_iles && (
            <div className="card" style={{ flex: 1, padding: `${SPACE.md}px ${SPACE.lg}px`, borderLeft: `4px solid ${SEMANTIC.warning}`, minWidth: 140, background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
              <Ship size={16} style={{ color: SEMANTIC.warning, marginBottom: SPACE.xs }} />
              <div style={{ ...TYPO.caption, color: SEMANTIC.warning }}>Transport inter-îles</div>
              <div style={{ ...TYPO.label, color: BASE.textMuted, textTransform: 'none' }}>Logistique maritime requise</div>
            </div>
          )}
          {event.reappro_necessaire && (
            <div className="card" style={{ flex: 1, padding: `${SPACE.md}px ${SPACE.lg}px`, borderLeft: `4px solid ${SEMANTIC.danger}`, minWidth: 140, background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
              <AlertTriangle size={16} style={{ color: SEMANTIC.danger, marginBottom: SPACE.xs }} />
              <div style={{ ...TYPO.caption, color: SEMANTIC.danger }}>Réappro nécessaire</div>
              <div style={{ ...TYPO.label, color: BASE.textMuted, textTransform: 'none' }}>Vérifier les stocks avant</div>
            </div>
          )}
        </div>
      )}

      {/* Prévisions merch */}
      {(event.ventes_prevues || event.ca_prevu) && (
        <div className="card" style={{ padding: `${SPACE.lg}px`, marginBottom: SPACE.md, background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
          <div style={{ ...TYPO.caption, color: BASE.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.md }}>Prévisions merch</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: SPACE.sm }}>
            {event.ventes_prevues != null && <KpiCell label="Ventes prévues" value={event.ventes_prevues} color={SEMANTIC.melodie} />}
            {event.ca_prevu != null && <KpiCell label="CA prévu" value={`${event.ca_prevu}€`} color={SEMANTIC.success} />}
            {event.merch_a_transferer != null && <KpiCell label="À transférer" value={event.merch_a_transferer} color={theme.color} />}
          </div>
        </div>
      )}

      {/* Résultats réels — Saisie post-concert */}
      <ResultsSection event={event} onReload={onReload} />

      {/* Progression checklist & packing */}
      <div style={{ display: 'flex', gap: SPACE.md, marginBottom: SPACE.md }}>
        {checkTotal > 0 && (
          <button onClick={() => onSectionChange('checklist')} className="card" style={{ flex: 1, padding: SPACE.lg, cursor: 'pointer', textAlign: 'left', background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.xs + 2 }}>
              <span style={{ ...TYPO.caption, color: BASE.text, display: 'flex', alignItems: 'center', gap: SPACE.xs }}><CheckSquare size={14} /> Checklist</span>
              <span style={{ ...TYPO.bodyBold, color: checkDone === checkTotal ? SEMANTIC.success : theme.color }}>{checkDone}/{checkTotal}</span>
            </div>
            <ProgressBar done={checkDone} total={checkTotal} />
          </button>
        )}
        {packTotal > 0 && (
          <button onClick={() => onSectionChange('packing')} className="card" style={{ flex: 1, padding: SPACE.lg, cursor: 'pointer', textAlign: 'left', background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.xs + 2 }}>
              <span style={{ ...TYPO.caption, color: BASE.text, display: 'flex', alignItems: 'center', gap: SPACE.xs }}><Package size={14} /> Packing</span>
              <span style={{ ...TYPO.bodyBold, color: packDone === packTotal ? SEMANTIC.success : theme.color }}>{packDone}/{packTotal}</span>
            </div>
            <ProgressBar done={packDone} total={packTotal} color={theme.color} />
          </button>
        )}
      </div>

      {/* Stock par catégorie */}
      <div style={{ ...TYPO.caption, color: BASE.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.sm, padding: `0 ${SPACE.xs}px` }}>Stock disponible</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, marginBottom: SPACE.md }}>
        {catStats.map(cat => (
          <div key={cat.id} className="card" style={{
            display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.md}px ${SPACE.lg}px`,
            background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: RADIUS.lg, background: theme.tint08,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.color,
            }}><Package size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ ...TYPO.bodyBold, color: BASE.text }}>{cat.name}</div>
              <div style={{ ...TYPO.micro, color: BASE.textMuted }}>{cat.count} réf.</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: theme.color }}>{cat.qty}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {event.notes && (
        <div className="card" style={{ padding: `${SPACE.md}px ${SPACE.lg}px`, background: theme.tint08, borderLeft: `4px solid ${theme.color}`, borderRadius: RADIUS.lg }}>
          <div style={{ ...TYPO.caption, color: theme.color, marginBottom: SPACE.xs + 2 }}>Notes</div>
          <div style={{ ...TYPO.body, color: BASE.textSoft, whiteSpace: 'pre-wrap' }}>{event.notes}</div>
        </div>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ÉQUIPE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function EquipeSection({ event, roles, userProfiles, eventPacking }) {
  // Get unique role codes involved in this event's packing
  const packingRoles = useMemo(() => {
    const codes = new Set()
    ;(eventPacking || []).filter(ep => ep.event_id === event.id).forEach(ep => {
      if (ep.role_code) codes.add(ep.role_code)
    })
    return codes
  }, [eventPacking, event.id])

  // All roles, sorted, with users assigned
  const teamData = useMemo(() => {
    const roleOrder = ['TM', 'PM', 'SE', 'LD', 'BL', 'SM', 'TD', 'MM', 'LOG', 'SAFE', 'AA', 'PA']
    return roleOrder.map(code => {
      const role = roles.find(r => r.code === code)
      if (!role) return null
      const conf = ROLE_CONF[code] || { icon: '?', color: '#94A3B8', label: role.name }
      // Find users with this role
      const users = (userProfiles || []).filter(p => p.role_id === role.id)
      const hasPacking = packingRoles.has(code)
      // Packing stats for this role
      const rolePacking = (eventPacking || []).filter(ep => ep.event_id === event.id && ep.role_code === code)
      const packDone = rolePacking.filter(ep => ep.packed).length
      const packTotal = rolePacking.length
      return { code, role, conf, users, hasPacking, packDone, packTotal }
    }).filter(Boolean)
  }, [roles, userProfiles, packingRoles, eventPacking, event.id])

  const assignedCount = teamData.filter(t => t.users.length > 0).length
  const totalRoles = teamData.length

  return (
    <div>
      {/* Stats */}
      <div className="card" style={{ padding: `${SPACE.lg}px`, marginBottom: SPACE.lg, background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
        <div style={{ display: 'flex', gap: SPACE.sm, textAlign: 'center' }}>
          <KpiCell label="Rôles" value={totalRoles} color={theme.color} />
          <KpiCell label="Assignés" value={assignedCount} color={SEMANTIC.success} />
          <KpiCell label="Membres" value={(userProfiles || []).length} color={SEMANTIC.melodie} />
        </div>
      </div>

      {/* Team list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
        {teamData.map(t => (
          <div key={t.code} className="card" style={{
            padding: `${SPACE.lg}px`,
            borderLeft: `4px solid ${t.users.length > 0 ? t.conf.color : BASE.border}`,
            opacity: t.users.length > 0 || t.hasPacking ? 1 : 0.6,
            background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md }}>
              <div style={{
                width: 44, height: 44, borderRadius: RADIUS.lg,
                background: `${t.conf.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>{t.conf.icon && React.createElement(t.conf.icon, { size: 22, color: t.conf.color })}</div>
              <div style={{ flex: 1 }}>
                <div style={{ ...TYPO.bodyBold, color: t.conf.color }}>{t.conf.label}</div>
                <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
                  {t.role.description || `Code: ${t.code}`}
                </div>

                {/* Users assigned */}
                {t.users.length > 0 ? (
                  <div style={{ marginTop: SPACE.xs + 2, display: 'flex', flexWrap: 'wrap', gap: SPACE.xs }}>
                    {t.users.map((u, i) => (
                      <span key={i} style={{
                        padding: `3px ${SPACE.md}px`, borderRadius: RADIUS.sm - 2, ...TYPO.micro,
                        background: `${t.conf.color}12`, color: t.conf.color,
                        border: `1px solid ${t.conf.color}20`,
                      }}>
                        {u.display_name || u.pseudo || u.email || 'Membre'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: SPACE.xs, ...TYPO.micro, color: BASE.textMuted, fontStyle: 'italic' }}>
                    Aucun membre assigné
                  </div>
                )}
              </div>

              {/* Packing progress for this role */}
              {t.packTotal > 0 && (
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{
                    ...TYPO.bodyBold,
                    color: t.packDone === t.packTotal ? SEMANTIC.success : t.packDone > 0 ? SEMANTIC.warning : SEMANTIC.danger,
                  }}>
                    {t.packTotal > 0 ? Math.round((t.packDone / t.packTotal) * 100) : 0}%
                  </div>
                  <div style={{ fontSize: 9, color: BASE.textMuted }}>packing</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div style={{
        marginTop: SPACE.lg, padding: `${SPACE.md}px ${SPACE.lg}px`, borderRadius: RADIUS.lg,
        background: 'rgba(255,255,255,0.03)', ...TYPO.micro, color: BASE.textMuted, lineHeight: 1.6,
      }}>
        L'équipe est constituée des membres ayant choisi leur rôle dans BackStage.
        Chaque rôle a une responsabilité sur certains produits et équipements.
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECKLIST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ChecklistSection({ event, eventChecklist, checkDone, checkTotal, orgId, onReload }) {
  const onToast = useToast()
  const [addItem, setAddItem] = useState('')
  const [addCat, setAddCat] = useState('logistique')

  // Group by category
  const checklistGrouped = useMemo(() => {
    const groups = {}
    eventChecklist.forEach(item => {
      const cat = item.category || 'autre'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [eventChecklist])

  const toggleCheck = async (item) => {
    try {
      await db.update('checklists', `id=eq.${item.id}`, {
        checked: !item.checked,
        checked_at: !item.checked ? new Date().toISOString() : null,
      })
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  const handleAddItem = async () => {
    if (!addItem.trim()) return
    try {
      await db.insert('checklists', {
        event_id: event.id,
        item: addItem.trim(),
        category: addCat,
        checked: false,
        org_id: orgId,
      })
      setAddItem('')
      onToast('Item ajouté')
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  return (
    <div>
      {/* Progress */}
      <div className="card" style={{ padding: `${SPACE.lg}px`, marginBottom: SPACE.lg, background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.sm }}>
          <span style={{ ...TYPO.bodyBold, color: BASE.text }}>{checkDone}/{checkTotal} complété{checkDone > 1 ? 's' : ''}</span>
          <span style={{ ...TYPO.h1, color: checkDone === checkTotal && checkTotal > 0 ? SEMANTIC.success : theme.color }}>
            {checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0}%
          </span>
        </div>
        <ProgressBar done={checkDone} total={checkTotal} />
      </div>

      {/* Items grouped by category */}
      {checklistGrouped.map(([cat, items]) => {
        const conf = CHECK_CATS[cat] || { icon: ClipboardList, color: BASE.textMuted, label: cat }
        const IconComponent = conf.icon
        return (
          <div key={cat} style={{ marginBottom: SPACE.lg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs + 2, padding: `0 ${SPACE.xs}px` }}>
              <IconComponent size={14} style={{ color: conf.color }} />
              <span style={{ ...TYPO.caption, color: conf.color, textTransform: 'uppercase', letterSpacing: 1 }}>{conf.label}</span>
              <span style={{ ...TYPO.micro, color: BASE.textMuted }}>{items.filter(i => i.checked).length}/{items.length}</span>
            </div>
            {items.map(item => (
              <div key={item.id} className="card" style={{
                display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.md}px ${SPACE.lg}px`, marginBottom: SPACE.xs + 2,
                opacity: item.checked ? 0.6 : 1,
                background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg,
              }}>
                <button onClick={() => toggleCheck(item)} style={{
                  width: 26, height: 26, borderRadius: RADIUS.sm - 2, flexShrink: 0,
                  border: `2px solid ${item.checked ? conf.color : 'rgba(255,255,255,0.15)'}`,
                  background: item.checked ? conf.color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: BASE.white, cursor: 'pointer',
                }}>
                  {item.checked ? <Check size={13} /> : ''}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    ...TYPO.bodyBold, color: BASE.text,
                    textDecoration: item.checked ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{item.item}</div>
                  {item.checked_at && (
                    <div style={{ ...TYPO.label, color: BASE.textMuted, textTransform: 'none', marginTop: 1 }}>{fmtDate(item.checked_at)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {checkTotal === 0 && (
        <div className="empty-state" style={{ padding: SPACE.xxl }}>
          <CheckSquare size={32} style={{ color: BASE.textMuted, marginBottom: SPACE.sm }} />
          <div className="empty-text" style={{ color: BASE.textSoft }}>Aucun item dans la checklist</div>
          <div style={{ ...TYPO.micro, color: BASE.textMuted, marginTop: SPACE.xs }}>Ajoute des items ci-dessous</div>
        </div>
      )}

      {/* Add item */}
      <div style={{ display: 'flex', gap: SPACE.sm, marginTop: SPACE.md }}>
        <select className="input" value={addCat} onChange={e => setAddCat(e.target.value)} style={{ width: 110, ...TYPO.micro, padding: `${SPACE.sm}px ${SPACE.xs + 2}px`, background: BASE.bgSurface, color: BASE.text, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.sm }}>
          {Object.entries(CHECK_CATS).map(([id, conf]) => (
            <option key={id} value={id}>{conf.label}</option>
          ))}
        </select>
        <input className="input" value={addItem} onChange={e => setAddItem(e.target.value)}
          placeholder="Ajouter un item..." style={{ flex: 1, ...TYPO.body, background: BASE.bgSurface, color: BASE.text, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.sm }}
          onKeyDown={e => e.key === 'Enter' && handleAddItem()} />
        <button onClick={handleAddItem} disabled={!addItem.trim()} aria-label="Ajouter" style={{
          padding: `${SPACE.sm}px ${SPACE.lg}px`, borderRadius: RADIUS.sm, ...TYPO.bodyBold,
          background: addItem.trim() ? theme.color : BASE.border, color: BASE.white, cursor: 'pointer',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Plus size={16} /></button>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRÉVISIONS (forecast pour cet event)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PrevisionsSection({ event, products, stock }) {
  const [scenario, setScenario] = useState('mid')

  const merchProducts = useMemo(() =>
    products
      .filter(p => p.category === 'merch')
      .map(p => {
        const totalQty = stock.filter(s => s.product_id === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0)
        return { ...p, totalQty }
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    [products, stock]
  )

  const totalMerchStock = merchProducts.reduce((s, p) => s + p.totalQty, 0)

  const rate = getConvRate(event.format)
  const mult = getTerrMult(event.territoire)
  const convRate = rate[scenario]
  const projectedSales = Math.round((event.capacite || 0) * convRate * mult)
  const stockAfter = totalMerchStock - projectedSales
  const rupture = stockAfter <= 0

  // Per-product breakdown
  const breakdown = useMemo(() => {
    return merchProducts.map(p => {
      const ratio = totalMerchStock > 0 ? p.totalQty / totalMerchStock : 1 / (merchProducts.length || 1)
      const qty = Math.round(projectedSales * ratio)
      return { ...p, projectedQty: qty, remaining: p.totalQty - qty }
    })
  }, [merchProducts, totalMerchStock, projectedSales])

  return (
    <div>
      {/* Scenario selector */}
      <div style={{ display: 'flex', gap: SPACE.sm, marginBottom: SPACE.lg }}>
        {[
          { id: 'low', label: 'Pessimiste', color: theme.color },
          { id: 'mid', label: 'Réaliste', color: SEMANTIC.melodie },
          { id: 'high', label: 'Optimiste', color: SEMANTIC.success },
        ].map(s => (
          <button key={s.id} onClick={() => setScenario(s.id)} style={{
            flex: 1, padding: `${SPACE.sm}px ${SPACE.xs + 2}px`, borderRadius: RADIUS.sm, ...TYPO.caption,
            cursor: 'pointer', textAlign: 'center',
            background: scenario === s.id ? `${s.color}15` : BASE.bgSurface,
            color: scenario === s.id ? s.color : BASE.textSoft,
            border: `1px solid ${scenario === s.id ? s.color + '40' : BASE.border}`,
          }}>{s.label}</button>
        ))}
      </div>

      {/* KPIs */}
      <div className="card" style={{ padding: `${SPACE.lg}px`, marginBottom: SPACE.lg, background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: SPACE.sm, textAlign: 'center' }}>
          <KpiCell label="Capacité" value={event.capacite || 0} color={SEMANTIC.melodie} />
          <KpiCell label="Taux" value={`${Math.round(convRate * 100)}%`} color={theme.color} />
          <KpiCell label="Ventes proj." value={projectedSales} color={SEMANTIC.melodie} />
          <KpiCell label="Stock après" value={stockAfter < 0 ? `−${Math.abs(stockAfter)}` : stockAfter} color={rupture ? SEMANTIC.danger : SEMANTIC.success} />
        </div>
      </div>

      {/* Alert */}
      {rupture && (
        <div className="card" style={{
          padding: `${SPACE.md}px ${SPACE.lg}px`, marginBottom: SPACE.lg,
          background: `rgba(${hexToRgbLocal(SEMANTIC.danger)}, 0.05)`, borderLeft: `4px solid ${SEMANTIC.danger}`, borderRadius: RADIUS.lg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
            <AlertCircle size={18} style={{ color: SEMANTIC.danger, flexShrink: 0 }} />
            <div>
              <div style={{ ...TYPO.bodyBold, color: SEMANTIC.danger }}>Rupture projetée</div>
              <div style={{ ...TYPO.micro, color: BASE.textSoft }}>
                Il manquera {Math.abs(stockAfter)} unités de merch pour ce concert
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gauge */}
      <div className="card" style={{ padding: `${SPACE.lg}px`, marginBottom: SPACE.lg, background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
        <div style={{ ...TYPO.caption, color: BASE.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.sm }}>
          Impact sur le stock merch
        </div>
        <div style={{ height: 20, borderRadius: RADIUS.sm, background: BASE.border, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${totalMerchStock > 0 ? Math.min(100, Math.round((projectedSales / totalMerchStock) * 100)) : 0}%`,
            background: rupture ? SEMANTIC.danger : theme.color,
            borderRadius: RADIUS.sm, transition: 'width 0.4s',
          }} />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...TYPO.label, color: BASE.text,
          }}>
            −{projectedSales} / {totalMerchStock}
          </div>
        </div>
      </div>

      {/* Calculation */}
      <div style={{
        padding: `${SPACE.md}px ${SPACE.lg}px`, borderRadius: RADIUS.lg, background: 'rgba(255,255,255,0.03)',
        ...TYPO.micro, color: BASE.textSoft, lineHeight: 1.6, marginBottom: SPACE.lg,
      }}>
        {event.capacite} pers. × {Math.round(convRate * 100)}% conversion × {mult} ({event.territoire || 'défaut'}) = <strong style={{ color: theme.color }}>{projectedSales} ventes</strong>
      </div>

      {/* Per-product breakdown */}
      {breakdown.length > 0 && (
        <>
          <div style={{ ...TYPO.caption, color: BASE.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.sm }}>
            Détail par produit
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs + 2 }}>
            {breakdown.map(p => (
              <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.md}px ${SPACE.lg}px`, background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
                <Shirt size={16} style={{ color: SEMANTIC.melodie, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...TYPO.caption, color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ ...TYPO.label, color: BASE.textMuted, textTransform: 'none' }}>
                    Stock: {p.totalQty} → proj. −{p.projectedQty}
                  </div>
                </div>
                <div style={{
                  ...TYPO.bodyBold,
                  color: p.remaining < 0 ? SEMANTIC.danger : p.remaining === 0 ? SEMANTIC.warning : SEMANTIC.success,
                }}>
                  {p.remaining < 0 ? `−${Math.abs(p.remaining)}` : p.remaining}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shared sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function InfoRow({ label, value, color }) {
  return (
    <div>
      <div style={{ ...TYPO.label, color: BASE.textMuted }}>{label}</div>
      <div style={{ ...TYPO.bodyBold, color: color || BASE.text, marginTop: 1 }}>{value}</div>
    </div>
  )
}

function KpiCell({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 600, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 9, color: BASE.textMuted, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Résultats réels post-concert
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ResultsSection({ event, onReload }) {
  const onToast = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    ventes_reelles: event.ventes_reelles ?? '',
    ca_reel: event.ca_reel ?? '',
    budget: event.budget ?? '',
    ticket_revenue: event.ticket_revenue ?? '',
    sponsor_revenue: event.sponsor_revenue ?? '',
  })

  const isPast = event.date < new Date().toISOString().split('T')[0]
  const hasResults = event.ventes_reelles != null || event.ca_reel != null
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await db.update('events', `id=eq.${event.id}`, {
        ventes_reelles: form.ventes_reelles !== '' ? parseInt(String(form.ventes_reelles).replace(/[^0-9]/g, '')) || 0 : null,
        ca_reel: form.ca_reel !== '' ? parseFloat(form.ca_reel) || 0 : null,
        budget: form.budget !== '' ? parseFloat(form.budget) || 0 : null,
        ticket_revenue: form.ticket_revenue !== '' ? parseFloat(form.ticket_revenue) || 0 : null,
        sponsor_revenue: form.sponsor_revenue !== '' ? parseFloat(form.sponsor_revenue) || 0 : null,
      })
      onToast('Résultats enregistrés')
      setEditing(false)
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#D4648A')
    } finally {
      setSaving(false)
    }
  }

  // Read-only mode
  if (!editing) {
    if (!hasResults && !isPast) return null

    // Comparison with forecast
    const ecartVentes = (event.ventes_prevues && event.ventes_reelles != null)
      ? event.ventes_reelles - event.ventes_prevues : null
    const ecartCA = (event.ca_prevu && event.ca_reel != null)
      ? event.ca_reel - event.ca_prevu : null

    return (
      <div className="card" style={{ padding: `${SPACE.lg}px`, marginBottom: SPACE.md, borderLeft: `4px solid ${hasResults ? SEMANTIC.success : theme.color}`, background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md }}>
          <div style={{ ...TYPO.caption, color: BASE.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
            {hasResults ? 'Résultats réels' : 'Saisir les résultats'}
          </div>
          <button onClick={() => setEditing(true)} style={{
            padding: `${SPACE.xs}px ${SPACE.md}px`, borderRadius: RADIUS.sm - 2, ...TYPO.micro,
            background: `rgba(${hexToRgbLocal(SEMANTIC.success)}, 0.1)`, border: `1px solid rgba(${hexToRgbLocal(SEMANTIC.success)}, 0.2)`, color: SEMANTIC.success, cursor: 'pointer',
          }}>{hasResults ? 'Modifier' : 'Saisir'}</button>
        </div>

        {hasResults ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.sm, marginBottom: ecartVentes != null || ecartCA != null ? SPACE.md : 0 }}>
              {event.ventes_reelles != null && <KpiCell label="Ventes réelles" value={event.ventes_reelles} color={SEMANTIC.success} />}
              {event.ca_reel != null && <KpiCell label="CA réel" value={`${event.ca_reel}€`} color={SEMANTIC.success} />}
              {event.ticket_revenue > 0 && <KpiCell label="Billetterie" value={`${event.ticket_revenue}€`} color={theme.color} />}
              {event.sponsor_revenue > 0 && <KpiCell label="Sponsors" value={`${event.sponsor_revenue}€`} color={SEMANTIC.melodie} />}
              {event.budget > 0 && <KpiCell label="Budget" value={`${event.budget}€`} color={SEMANTIC.melodie} />}
            </div>
            {/* Comparison prévisionnel vs réel */}
            {(ecartVentes != null || ecartCA != null) && (
              <div style={{ padding: `${SPACE.sm}px 0 0`, borderTop: `1px solid ${BASE.border}` }}>
                <div style={{ ...TYPO.label, color: BASE.textMuted, marginBottom: SPACE.xs + 2 }}>ÉCART PRÉVISION / RÉEL</div>
                <div style={{ display: 'flex', gap: SPACE.md }}>
                  {ecartVentes != null && (
                    <div style={{ ...TYPO.caption, color: ecartVentes >= 0 ? SEMANTIC.success : SEMANTIC.danger }}>
                      Ventes : {ecartVentes >= 0 ? '+' : ''}{ecartVentes} ({event.ventes_prevues} prévu)
                    </div>
                  )}
                  {ecartCA != null && (
                    <div style={{ ...TYPO.caption, color: ecartCA >= 0 ? SEMANTIC.success : SEMANTIC.danger }}>
                      CA : {ecartCA >= 0 ? '+' : ''}{Math.round(ecartCA)}€ ({event.ca_prevu}€ prévu)
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ ...TYPO.body, color: BASE.textSoft, textAlign: 'center', padding: SPACE.sm }}>
            Concert terminé — clique "Saisir" pour enregistrer les résultats
          </div>
        )}
      </div>
    )
  }

  // Edit mode
  return (
    <div className="card" style={{ padding: SPACE.lg, marginBottom: SPACE.md, borderLeft: `4px solid ${SEMANTIC.success}`, background: BASE.bgSurface, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.lg }}>
      <div style={{ ...TYPO.caption, color: SEMANTIC.success, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.md }}>
        Résultats post-concert
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.md, marginBottom: SPACE.md }}>
        <ResultField label="Ventes réelles" value={form.ventes_reelles} onChange={v => set('ventes_reelles', v.replace(/[^0-9]/g, ''))} placeholder="ex: 45" inputMode="numeric" />
        <ResultField label="CA réel (€)" value={form.ca_reel} onChange={v => set('ca_reel', v.replace(/[^0-9.]/g, ''))} placeholder="ex: 1250" inputMode="decimal" />
        <ResultField label="Billetterie (€)" value={form.ticket_revenue} onChange={v => set('ticket_revenue', v.replace(/[^0-9.]/g, ''))} placeholder="0" inputMode="decimal" />
        <ResultField label="Sponsors (€)" value={form.sponsor_revenue} onChange={v => set('sponsor_revenue', v.replace(/[^0-9.]/g, ''))} placeholder="0" inputMode="decimal" />
      </div>
      <ResultField label="Budget total (€)" value={form.budget} onChange={v => set('budget', v.replace(/[^0-9.]/g, ''))} placeholder="Dépenses totales" inputMode="decimal" />
      <div style={{ display: 'flex', gap: SPACE.sm, marginTop: SPACE.md }}>
        <button onClick={() => setEditing(false)} style={{
          flex: 1, padding: `${SPACE.md}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, ...TYPO.caption,
          background: BASE.bgSurface, border: `1px solid ${BASE.border}`, color: BASE.textSoft, cursor: 'pointer',
        }}>Annuler</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ flex: 2 }}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

function ResultField({ label, value, onChange, placeholder, inputMode }) {
  return (
    <div>
      <div style={{ ...TYPO.label, color: BASE.textMuted, marginBottom: 3 }}>{label}</div>
      <input className="input" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} inputMode={inputMode}
        style={{ ...TYPO.bodyBold, background: BASE.bgSurface, color: BASE.text, border: `1px solid ${BASE.border}`, borderRadius: RADIUS.sm }} />
    </div>
  )
}

function ProgressBar({ done, total, color }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ height: 6, borderRadius: 3, background: BASE.border, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 3, transition: 'width 0.3s',
        width: `${pct}%`,
        background: pct === 100 ? SEMANTIC.success : (color || theme.color),
      }} />
    </div>
  )
}
