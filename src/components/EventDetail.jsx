import React, { useState, useMemo, useCallback } from 'react'
import { db } from '../lib/supabase'
import { Badge, CATEGORIES, fmtDate } from './UI'
import { ROLE_CONF } from './RolePicker'
import PackingList from './PackingList'

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
  son:          { icon: '🔊', color: '#5B8DB8', label: 'Son' },
  lumiere:      { icon: '💡', color: '#E8935A', label: 'Lumière' },
  instruments:  { icon: '🎸', color: '#D4648A', label: 'Instruments' },
  decor:        { icon: '🎭', color: '#9B7DC4', label: 'Décor' },
  merch:        { icon: '👕', color: '#E8735A', label: 'Merch' },
  logistique:   { icon: '🚛', color: '#5DAB8B', label: 'Logistique' },
  consommables: { icon: '🔋', color: '#8BAB5D', label: 'Consommables' },
}

const SECTIONS = [
  { id: 'resume', label: 'Résumé', icon: '📋' },
  { id: 'equipe', label: 'Équipe', icon: '👥' },
  { id: 'checklist', label: 'Check', icon: '✅' },
  { id: 'packing', label: 'Packing', icon: '📦' },
  { id: 'previsions', label: 'Prévisions', icon: '📈' },
]

export default function EventDetail({
  event, events, products, stock, locations, families, subfamilies,
  checklists, roles, eventPacking, userProfiles, userRole, orgId,
  onClose, onReload, onToast, onNavigateEvent,
}) {
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
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
      overflowY: 'auto', paddingBottom: 80,
    }}>
      {/* ─── Top bar ─── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,248,240,0.95)', backdropFilter: 'blur(12px)',
        padding: '12px 16px', borderBottom: '1px solid #F0E8E4',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 10, background: '#F0E8E4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, cursor: 'pointer',
        }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.name || event.lieu}
          </div>
          <div style={{ fontSize: 10, color: '#9A8B94' }}>
            {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <Badge color={isPast ? '#B8A0AE' : daysUntil <= 3 ? '#D4648A' : daysUntil <= 7 ? '#E8935A' : '#5DAB8B'}>
          {isPast ? 'Terminé' : daysUntil === 0 ? "Aujourd'hui" : `J-${daysUntil}`}
        </Badge>
      </div>

      {/* ─── Event hero ─── */}
      <div style={{ padding: '20px 16px 12px', textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#3D3042', marginBottom: 4 }}>{event.name || event.lieu}</div>
        <div style={{ fontSize: 14, color: '#9A8B94', marginBottom: 12 }}>
          {event.lieu} — {event.ville} ({event.territoire})
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Badge color="#E8735A">
            {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Badge>
          {event.format && <Badge color="#5B8DB8">{event.format}</Badge>}
          {event.capacite && <Badge color="#9B7DC4">{event.capacite} pers.</Badge>}
          {event.transport_inter_iles && <Badge color="#E8935A">Inter-îles</Badge>}
          {event.statut && <Badge color="#5DAB8B">{event.statut}</Badge>}
        </div>
      </div>

      {/* ─── Prev / Next nav ─── */}
      {onNavigateEvent && (prevEvent || nextEvent) && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', justifyContent: 'space-between' }}>
          {prevEvent ? (
            <button onClick={() => onNavigateEvent(prevEvent)} style={{
              flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
              background: 'white', border: '1px solid #E8DED8', color: '#9A8B94', cursor: 'pointer',
              textAlign: 'left', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>
              ← {prevEvent.name || prevEvent.lieu}
            </button>
          ) : <div style={{ flex: 1 }} />}
          {nextEvent ? (
            <button onClick={() => onNavigateEvent(nextEvent)} style={{
              flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
              background: 'white', border: '1px solid #E8DED8', color: '#9A8B94', cursor: 'pointer',
              textAlign: 'right', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>
              {nextEvent.name || nextEvent.lieu} →
            </button>
          ) : <div style={{ flex: 1 }} />}
        </div>
      )}

      {/* ─── Section tabs ─── */}
      <div style={{ display: 'flex', gap: 4, padding: '0 16px 16px', overflowX: 'auto' }}>
        {sectionLabels.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding: '7px 14px', borderRadius: 16, fontSize: 11, fontWeight: 700,
            whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s',
            border: `1.5px solid ${section === s.id ? '#E8735A' : '#E8DED8'}`,
            background: section === s.id ? '#E8735A12' : 'white',
            color: section === s.id ? '#E8735A' : '#9A8B94',
          }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

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
            onReload={onReload}
            onToast={onToast}
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
function ResumeSection({ event, products, stock, locations, subfamilies, checkDone, checkTotal, packDone, packTotal, daysUntil, onSectionChange }) {

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
      <div className="card" style={{ padding: '16px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Informations
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InfoRow label="Date" value={new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
          <InfoRow label="Compte à rebours" value={daysUntil > 0 ? `J-${daysUntil}` : daysUntil === 0 ? "Aujourd'hui" : 'Terminé'} color={daysUntil <= 3 && daysUntil >= 0 ? '#D4648A' : undefined} />
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {event.transport_inter_iles && (
            <div className="card" style={{ flex: 1, padding: '10px 14px', borderLeft: '4px solid #E8935A', minWidth: 140 }}>
              <div style={{ fontSize: 14 }}>🚢</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#E8935A' }}>Transport inter-îles</div>
              <div style={{ fontSize: 10, color: '#9A8B94' }}>Logistique maritime requise</div>
            </div>
          )}
          {event.reappro_necessaire && (
            <div className="card" style={{ flex: 1, padding: '10px 14px', borderLeft: '4px solid #D4648A', minWidth: 140 }}>
              <div style={{ fontSize: 14 }}>⚠️</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#D4648A' }}>Réappro nécessaire</div>
              <div style={{ fontSize: 10, color: '#9A8B94' }}>Vérifier les stocks avant</div>
            </div>
          )}
        </div>
      )}

      {/* Prévisions merch */}
      {(event.ventes_prevues || event.ca_prevu) && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Prévisions merch</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {event.ventes_prevues != null && <KpiCell label="Ventes prévues" value={event.ventes_prevues} color="#E8735A" />}
            {event.ca_prevu != null && <KpiCell label="CA prévu" value={`${event.ca_prevu}€`} color="#5DAB8B" />}
            {event.merch_a_transferer != null && <KpiCell label="À transférer" value={event.merch_a_transferer} color="#5B8DB8" />}
          </div>
        </div>
      )}

      {/* Résultats réels */}
      {(event.ventes_reelles != null || event.ca_reel != null) && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12, borderLeft: '4px solid #5DAB8B' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Résultats réels</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {event.ventes_reelles != null && <KpiCell label="Ventes réelles" value={event.ventes_reelles} color="#5DAB8B" />}
            {event.ca_reel != null && <KpiCell label="CA réel" value={`${event.ca_reel}€`} color="#5DAB8B" />}
          </div>
        </div>
      )}

      {/* Progression checklist & packing */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {checkTotal > 0 && (
          <button onClick={() => onSectionChange('checklist')} className="card" style={{ flex: 1, padding: '14px', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>✅ Checklist</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: checkDone === checkTotal ? '#5DAB8B' : '#E8735A' }}>{checkDone}/{checkTotal}</span>
            </div>
            <ProgressBar done={checkDone} total={checkTotal} />
          </button>
        )}
        {packTotal > 0 && (
          <button onClick={() => onSectionChange('packing')} className="card" style={{ flex: 1, padding: '14px', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>📦 Packing</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: packDone === packTotal ? '#5DAB8B' : '#5B8DB8' }}>{packDone}/{packTotal}</span>
            </div>
            <ProgressBar done={packDone} total={packTotal} color="#5B8DB8" />
          </button>
        )}
      </div>

      {/* Stock par catégorie */}
      <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, padding: '0 4px' }}>Stock disponible</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {catStats.map(cat => (
          <div key={cat.id} className="card" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: cat.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>{cat.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{cat.name}</div>
              <div style={{ fontSize: 11, color: '#9A8B94' }}>{cat.count} réf.</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: cat.color }}>{cat.qty}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {event.notes && (
        <div className="card" style={{ padding: '12px 16px', background: '#FFFBF5', borderLeft: '4px solid #E8935A' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#E8935A', marginBottom: 6 }}>Notes</div>
          <div style={{ fontSize: 13, color: '#3D3042', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{event.notes}</div>
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
      const conf = ROLE_CONF[code] || { icon: '📋', color: '#9A8B94', label: role.name }
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
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, textAlign: 'center' }}>
          <KpiCell label="Rôles" value={totalRoles} color="#5B8DB8" />
          <KpiCell label="Assignés" value={assignedCount} color="#5DAB8B" />
          <KpiCell label="Membres" value={(userProfiles || []).length} color="#E8735A" />
        </div>
      </div>

      {/* Team list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {teamData.map(t => (
          <div key={t.code} className="card" style={{
            padding: '14px 16px',
            borderLeft: `4px solid ${t.users.length > 0 ? t.conf.color : '#E8DED8'}`,
            opacity: t.users.length > 0 || t.hasPacking ? 1 : 0.6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${t.conf.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>{t.conf.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: t.conf.color }}>{t.conf.label}</div>
                <div style={{ fontSize: 11, color: '#9A8B94' }}>
                  {t.role.description || `Code: ${t.code}`}
                </div>

                {/* Users assigned */}
                {t.users.length > 0 ? (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {t.users.map((u, i) => (
                      <span key={i} style={{
                        padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: `${t.conf.color}12`, color: t.conf.color,
                        border: `1px solid ${t.conf.color}20`,
                      }}>
                        {u.display_name || u.pseudo || u.email || 'Membre'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 4, fontSize: 11, color: '#B8A0AE', fontStyle: 'italic' }}>
                    Aucun membre assigné
                  </div>
                )}
              </div>

              {/* Packing progress for this role */}
              {t.packTotal > 0 && (
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 900,
                    color: t.packDone === t.packTotal ? '#5DAB8B' : t.packDone > 0 ? '#E8935A' : '#D4648A',
                  }}>
                    {t.packTotal > 0 ? Math.round((t.packDone / t.packTotal) * 100) : 0}%
                  </div>
                  <div style={{ fontSize: 9, color: '#9A8B94' }}>packing</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div style={{
        marginTop: 16, padding: '10px 14px', borderRadius: 12,
        background: '#F0E8E440', fontSize: 11, color: '#9A8B94', lineHeight: 1.6,
      }}>
        L'équipe est constituée des membres ayant choisi leur rôle dans Stage Stock.
        Chaque rôle a une responsabilité sur certains produits et équipements.
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECKLIST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ChecklistSection({ event, eventChecklist, checkDone, checkTotal, onReload, onToast }) {
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
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{checkDone}/{checkTotal} complété{checkDone > 1 ? 's' : ''}</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: checkDone === checkTotal && checkTotal > 0 ? '#5DAB8B' : '#E8735A' }}>
            {checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0}%
          </span>
        </div>
        <ProgressBar done={checkDone} total={checkTotal} />
      </div>

      {/* Items grouped by category */}
      {checklistGrouped.map(([cat, items]) => {
        const conf = CHECK_CATS[cat] || { icon: '📋', color: '#9A8B94', label: cat }
        return (
          <div key={cat} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '0 4px' }}>
              <span style={{ fontSize: 14 }}>{conf.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: conf.color, textTransform: 'uppercase', letterSpacing: 1 }}>{conf.label}</span>
              <span style={{ fontSize: 11, color: '#B8A0AE' }}>{items.filter(i => i.checked).length}/{items.length}</span>
            </div>
            {items.map(item => (
              <div key={item.id} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 6,
                opacity: item.checked ? 0.6 : 1,
              }}>
                <button onClick={() => toggleCheck(item)} style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  border: `2px solid ${item.checked ? conf.color : '#D8CDD2'}`,
                  background: item.checked ? conf.color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 13, fontWeight: 900, cursor: 'pointer',
                }}>
                  {item.checked ? '✓' : ''}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    textDecoration: item.checked ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{item.item}</div>
                  {item.checked_at && (
                    <div style={{ fontSize: 10, color: '#B8A0AE', marginTop: 1 }}>{fmtDate(item.checked_at)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {checkTotal === 0 && (
        <div className="empty-state" style={{ padding: 24 }}>
          <div className="empty-icon">✅</div>
          <div className="empty-text">Aucun item dans la checklist</div>
          <div style={{ fontSize: 11, color: '#B8A0AE', marginTop: 4 }}>Ajoute des items ci-dessous</div>
        </div>
      )}

      {/* Add item */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <select className="input" value={addCat} onChange={e => setAddCat(e.target.value)} style={{ width: 90, fontSize: 11, padding: '8px 6px' }}>
          {Object.entries(CHECK_CATS).map(([id, conf]) => (
            <option key={id} value={id}>{conf.icon} {conf.label}</option>
          ))}
        </select>
        <input className="input" value={addItem} onChange={e => setAddItem(e.target.value)}
          placeholder="Ajouter un item..." style={{ flex: 1, fontSize: 13 }}
          onKeyDown={e => e.key === 'Enter' && handleAddItem()} />
        <button onClick={handleAddItem} disabled={!addItem.trim()} style={{
          padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
          background: addItem.trim() ? '#E8735A' : '#E8DED8', color: 'white', cursor: 'pointer',
        }}>+</button>
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'low', label: 'Pessimiste', color: '#5B8DB8' },
          { id: 'mid', label: 'Réaliste', color: '#E8735A' },
          { id: 'high', label: 'Optimiste', color: '#5DAB8B' },
        ].map(s => (
          <button key={s.id} onClick={() => setScenario(s.id)} style={{
            flex: 1, padding: '8px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: scenario === s.id ? `${s.color}15` : 'white',
            color: scenario === s.id ? s.color : '#9A8B94',
            border: `1.5px solid ${scenario === s.id ? s.color + '40' : '#E8DED8'}`,
          }}>{s.label}</button>
        ))}
      </div>

      {/* KPIs */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
          <KpiCell label="Capacité" value={event.capacite || 0} color="#9B7DC4" />
          <KpiCell label="Taux" value={`${Math.round(convRate * 100)}%`} color="#5B8DB8" />
          <KpiCell label="Ventes proj." value={projectedSales} color="#E8735A" />
          <KpiCell label="Stock après" value={stockAfter < 0 ? `−${Math.abs(stockAfter)}` : stockAfter} color={rupture ? '#D4648A' : '#5DAB8B'} />
        </div>
      </div>

      {/* Alert */}
      {rupture && (
        <div className="card" style={{
          padding: '12px 14px', marginBottom: 14,
          background: '#D4648A10', borderLeft: '4px solid #D4648A',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#D4648A' }}>Rupture projetée</div>
              <div style={{ fontSize: 11, color: '#9A8B94' }}>
                Il manquera {Math.abs(stockAfter)} unités de merch pour ce concert
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gauge */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Impact sur le stock merch
        </div>
        <div style={{ height: 20, borderRadius: 10, background: '#F0E8E4', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${totalMerchStock > 0 ? Math.min(100, Math.round((projectedSales / totalMerchStock) * 100)) : 0}%`,
            background: rupture ? 'linear-gradient(90deg, #E8735A, #D4648A)' : 'linear-gradient(90deg, #E8735A, #E8935A)',
            borderRadius: 10, transition: 'width 0.4s',
          }} />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: '#3D3042',
          }}>
            −{projectedSales} / {totalMerchStock}
          </div>
        </div>
      </div>

      {/* Calculation */}
      <div style={{
        padding: '10px 14px', borderRadius: 12, background: '#F0E8E440',
        fontSize: 11, color: '#9A8B94', lineHeight: 1.6, marginBottom: 14,
      }}>
        {event.capacite} pers. × {Math.round(convRate * 100)}% conversion × {mult} ({event.territoire || 'défaut'}) = <strong style={{ color: '#E8735A' }}>{projectedSales} ventes</strong>
      </div>

      {/* Per-product breakdown */}
      {breakdown.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Détail par produit
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {breakdown.map(p => (
              <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                <span style={{ fontSize: 16 }}>{p.image || '👕'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: '#9A8B94' }}>
                    Stock: {p.totalQty} → proj. −{p.projectedQty}
                  </div>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 900,
                  color: p.remaining < 0 ? '#D4648A' : p.remaining === 0 ? '#E8935A' : '#5DAB8B',
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
      <div style={{ fontSize: 10, fontWeight: 700, color: '#B8A0AE', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || '#3D3042', marginTop: 1 }}>{value}</div>
    </div>
  )
}

function KpiCell({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#9A8B94', fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function ProgressBar({ done, total, color }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ height: 6, borderRadius: 3, background: '#F0E8E4', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 3, transition: 'width 0.3s',
        width: `${pct}%`,
        background: pct === 100
          ? 'linear-gradient(90deg, #5DAB8B, #4A9A7A)'
          : `linear-gradient(90deg, ${color || '#E8735A'}, ${color || '#D4648A'})`,
      }} />
    </div>
  )
}
