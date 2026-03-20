import React, { useState, useMemo } from 'react'
import { db } from '../lib/supabase'
import { Modal, Confirm, Badge, intOnly, parseDate } from './UI'
import EventDetail from './EventDetail'
import { Mic, Volume2, Drama, Music, Search, Calendar, Plus, ChevronRight } from 'lucide-react'
import { GradientHeader, FilterPills, FloatingDetail } from '../design'
import { MODULES, SEMANTIC, BASE, SPACE, TYPO, RADIUS, SHADOW, getModuleTheme } from '../lib/theme'
import { useToast, useProject } from '../shared/hooks'

const FORMAT_CONF = {
  'concert live': { Icon: Mic, color: MODULES.tournee.color },
  'concert':      { Icon: Mic, color: MODULES.tournee.color },
  'live':         { Icon: Mic, color: MODULES.tournee.color },
  'sound system':  { Icon: Volume2, color: MODULES.tournee.color },
  'soundsystem':   { Icon: Volume2, color: MODULES.tournee.color },
  'impro':         { Icon: Drama, color: MODULES.articles.color },
  'improvisation': { Icon: Drama, color: MODULES.articles.color },
}

function getFormatConf(format) {
  if (!format) return { Icon: Music, color: MODULES.tournee.color }
  return FORMAT_CONF[format.toLowerCase().trim()] || { Icon: Music, color: MODULES.tournee.color }
}

export default function Tour({ events, products, stock, locations, families, subfamilies, checklists, roles, eventPacking, userProfiles }) {
  const { orgId, selectedOrg, reload, userRole } = useProject()
  const onToast = useToast()
  const [filter, setFilter] = useState('upcoming') // upcoming | past | all
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [search, setSearch] = useState('')
  const [eventModal, setEventModal] = useState(null) // null | {type:'add'} | {type:'edit', event}
  const [confirmDelete, setConfirmDelete] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  // Filter & sort events
  const filteredEvents = useMemo(() => {
    let list = [...events]
    if (filter === 'upcoming') list = list.filter(e => e.date >= today)
    else if (filter === 'past') list = list.filter(e => e.date < today)

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.lieu || '').toLowerCase().includes(q) ||
        (e.ville || '').toLowerCase().includes(q) ||
        (e.territoire || '').toLowerCase().includes(q)
      )
    }

    return filter === 'past'
      ? list.sort((a, b) => b.date.localeCompare(a.date))
      : list.sort((a, b) => a.date.localeCompare(b.date))
  }, [events, filter, search, today])

  // Stats
  const totalEvents = events.length
  const upcomingCount = events.filter(e => e.date >= today).length
  const pastCount = events.filter(e => e.date < today).length
  const nextEvent = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]

  // Group by month
  const groupedByMonth = useMemo(() => {
    const groups = {}
    filteredEvents.forEach(ev => {
      const d = parseDate(ev.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      if (!groups[key]) groups[key] = { label, events: [] }
      groups[key].events.push(ev)
    })
    return Object.entries(groups).sort(([a], [b]) =>
      filter === 'past' ? b.localeCompare(a) : a.localeCompare(b)
    )
  }, [filteredEvents, filter])

  const t = getModuleTheme('tournee')

  return (
    <>
    {/* ─── Event Detail (floating window) ─── */}
    <FloatingDetail open={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
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
        userProfiles={userProfiles}
        onClose={() => setSelectedEvent(null)}
        onNavigateEvent={(ev) => setSelectedEvent(ev)}
        onEdit={(ev) => { setSelectedEvent(null); setEventModal({ type: 'edit', event: ev }) }}
        onDelete={(ev) => { setSelectedEvent(null); setConfirmDelete(ev) }}
      />
    </FloatingDetail>

    <div style={{ paddingBottom: SPACE.xxl }}>
      {/* ═══ HEADER GRADIENT BOLD ═══ */}
      <GradientHeader
        module="tournee"
        title={`${selectedOrg?.name || 'Ma tournée'} — ${totalEvents} date${totalEvents > 1 ? 's' : ''}`}
        stats={[
          { value: upcomingCount, label: 'A venir' },
          { value: pastCount, label: 'Passées' },
          ...(nextEvent ? [{ value: `J-${Math.max(0, Math.ceil((new Date(nextEvent.date) - new Date()) / 86400000))}`, label: 'Prochain' }] : []),
        ]}
      />

      <div style={{ padding: `0 ${SPACE.lg}px` }}>
      {/* ═══ PROCHAIN CONCERT ═══ */}
      {nextEvent && (
        <button
          onClick={() => setSelectedEvent(nextEvent)}
          style={{
            width: '100%', marginBottom: SPACE.lg, padding: `${SPACE.lg}px`,
            borderRadius: RADIUS.lg, cursor: 'pointer', textAlign: 'left',
            background: BASE.bg, border: 'none',
            boxShadow: t.shadowTinted,
          }}
        >
          <div style={{ ...TYPO.micro, color: t.color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Prochain concert
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ ...TYPO.h3, color: BASE.text }}>{nextEvent.name || nextEvent.lieu}</div>
              <div style={{ ...TYPO.body, color: BASE.textSoft, marginTop: 2 }}>
                {nextEvent.lieu} — {nextEvent.ville}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...TYPO.bodyBold, color: t.color }}>
                {parseDate(nextEvent.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <div style={{ ...TYPO.label, color: BASE.textMuted, marginTop: 2 }}>
                {nextEvent.format} · {nextEvent.capacite} pers.
              </div>
            </div>
          </div>
        </button>
      )}

      {/* ═══ SEARCH ═══ */}
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <span className="search-icon"><Search size={16} /></span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un concert, lieu, ville..."
        />
      </div>

      {/* ═══ FILTERS BOLD ═══ */}
      <FilterPills
        options={[
          { id: 'upcoming', label: `A venir (${upcomingCount})` },
          { id: 'past', label: `Passées (${pastCount})` },
          { id: 'all', label: `Toutes (${totalEvents})` },
        ]}
        active={filter}
        onChange={setFilter}
      />

      {/* ═══ ADD EVENT ═══ */}
      <button onClick={() => setEventModal({ type: 'add' })} style={{
        width: '100%', padding: `${SPACE.md}px ${SPACE.lg}px`, borderRadius: RADIUS.md, marginBottom: SPACE.lg,
        background: t.gradientCSS, border: 'none', cursor: 'pointer',
        ...TYPO.bodyBold, color: BASE.white, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        boxShadow: t.shadowTinted,
      }}><Plus size={14} /> Ajouter un événement</button>

      {/* Event list grouped by month */}
      {filteredEvents.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-icon"><Calendar size={28} /></div>
          <div className="empty-text">
            {search ? 'Aucun résultat' : filter === 'past' ? 'Aucune date passée' : 'Aucune date à venir'}
          </div>
        </div>
      ) : (
        groupedByMonth.map(([key, group]) => (
          <div key={key} style={{ marginBottom: 20 }}>
            <div style={{
              ...TYPO.caption, color: BASE.textMuted, textTransform: 'uppercase',
              letterSpacing: 0.5, marginBottom: SPACE.sm, padding: '0 4px',
              display: 'flex', alignItems: 'center', gap: SPACE.sm,
            }}>
              <span>{group.label}</span>
              <span style={{ ...TYPO.label, padding: '2px 6px', borderRadius: 6, background: BASE.bgHover, color: BASE.textDisabled }}>
                {group.events.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {group.events.map((ev, i) => {
                const d = parseDate(ev.date)
                const daysUntil = Math.ceil((d - new Date()) / 86400000)
                const isPast = ev.date < today
                const isNext = nextEvent && ev.id === nextEvent.id
                const fmt = getFormatConf(ev.format)

                // Checklist progress for this event
                const evChecks = checklists.filter(c => c.event_id === ev.id)
                const checksDone = evChecks.filter(c => c.checked).length
                const checksTotal = evChecks.length

                // Packing progress
                const evPacking = (eventPacking || []).filter(ep => ep.event_id === ev.id)
                const packDone = evPacking.filter(ep => ep.packed).length
                const packTotal = evPacking.length

                return (
                  <div key={ev.id}>
                    {/* Timeline connector */}
                    {i > 0 && (
                      <div style={{
                        width: 1, height: SPACE.sm, background: BASE.border, marginLeft: 19,
                      }} />
                    )}

                    <button
                      onClick={() => setSelectedEvent(ev)}
                      style={{
                        width: '100%', padding: `${SPACE.lg}px`, cursor: 'pointer', textAlign: 'left',
                        borderRadius: RADIUS.lg, border: 'none', marginBottom: 2,
                        borderLeft: `4px solid ${isNext ? t.color : isPast ? BASE.border : fmt.color}`,
                        background: BASE.bg,
                        boxShadow: isNext ? t.shadowTinted : SHADOW.sm,
                        opacity: isPast ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', gap: SPACE.md }}>
                        {/* Date block — BOLD style (fond plein coloré) */}
                        <div style={{
                          width: 48, height: 52, borderRadius: RADIUS.md, flexShrink: 0,
                          background: isPast ? BASE.border : isNext ? t.color : fmt.color,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          color: isPast ? BASE.textMuted : BASE.white,
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
                            {d.getDate()}
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', opacity: isPast ? 0.7 : 0.9 }}>
                            {d.toLocaleDateString('fr-FR', { month: 'short' })}
                          </div>
                          <div style={{ fontSize: 8, fontWeight: 600, opacity: 0.7 }}>
                            {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                          </div>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ ...TYPO.bodyBold, color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.name || ev.lieu}
                            </span>
                            {isNext && <span style={{ ...TYPO.label, padding: '2px 8px', borderRadius: 6, background: t.color, color: BASE.white }}>NEXT</span>}
                          </div>
                          <div style={{ ...TYPO.body, color: BASE.textMuted, marginBottom: 6 }}>
                            {ev.lieu && ev.lieu !== ev.name ? `${ev.lieu} — ` : ''}{ev.ville} ({ev.territoire})
                          </div>

                          {/* Badges */}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Badge color={fmt.color}>{ev.format}</Badge>
                            {ev.capacite && <Badge color={SEMANTIC.melodie}>{ev.capacite} pers.</Badge>}
                            {!isPast && daysUntil >= 0 && (
                              <Badge color={daysUntil <= 3 ? SEMANTIC.danger : daysUntil <= 7 ? SEMANTIC.warning : t.color}>
                                J-{daysUntil}
                              </Badge>
                            )}
                            {isPast && <Badge color={BASE.textDisabled}>Terminé</Badge>}
                            {ev.transport_inter_iles && <Badge color={t.color}>Inter-îles</Badge>}
                          </div>

                          {/* Progress indicators */}
                          {(checksTotal > 0 || packTotal > 0) && (
                            <div style={{ display: 'flex', gap: SPACE.md, marginTop: SPACE.sm }}>
                              {checksTotal > 0 && (
                                <ProgressMini
                                  label="Checklist"
                                  done={checksDone}
                                  total={checksTotal}
                                  color={SEMANTIC.success}
                                />
                              )}
                              {packTotal > 0 && (
                                <ProgressMini
                                  label="Packing"
                                  done={packDone}
                                  total={packTotal}
                                  color={t.color}
                                />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', color: BASE.textDisabled }}><ChevronRight size={16} /></div>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
      </div>
      {/* Event form modal */}
      {eventModal && (
        <EventFormModal
          event={eventModal.type === 'edit' ? eventModal.event : null}
          onClose={() => setEventModal(null)}
          onSave={() => { setEventModal(null); reload() }}
        />
      )}

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
              setSelectedEvent(null)
              reload()
            } catch (e) {
              onToast('Erreur: ' + e.message, SEMANTIC.danger)
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
    </>
  )
}

function ProgressMini({ label, done, total, color }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ ...TYPO.label, color: BASE.textMuted }}>{label}</span>
        <span style={{ ...TYPO.label, color, fontWeight: 600 }}>{done}/{total}</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: BASE.bgHover, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 2,
          background: pct === 100 ? SEMANTIC.success : color,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}

// ─── Event Form Modal (Add/Edit) ───
const FORMATS = ['concert live', 'sound system', 'impro', 'festival', 'showcase']
const TERRITOIRES = ['martinique', 'guadeloupe', 'guyane', 'reunion']

function EventFormModal({ event, onClose, onSave }) {
  const onToast = useToast()
  const { orgId } = useProject()
  const [name, setName] = useState(event?.name || '')
  const [date, setDate] = useState(event?.date || '')
  const [lieu, setLieu] = useState(event?.lieu || '')
  const [ville, setVille] = useState(event?.ville || '')
  const [territoire, setTerritoire] = useState(event?.territoire || 'martinique')
  const [format, setFormat] = useState(event?.format || 'concert live')
  const [capacite, setCapacite] = useState(event?.capacite?.toString() || '')
  const [transport, setTransport] = useState(event?.transport_inter_iles || false)
  const [notes, setNotes] = useState(event?.notes || '')
  const [saving, setSaving] = useState(false)

  const canSave = name.trim() && date && lieu.trim() && ville.trim()

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        date,
        lieu: lieu.trim(),
        ville: ville.trim(),
        territoire,
        format,
        capacite: parseInt(capacite) || null,
        transport_inter_iles: transport,
        notes: notes.trim() || null,
        org_id: orgId,
      }
      if (event) {
        await db.update('events', `id=eq.${event.id}`, data)
        onToast('Événement modifié')
      } else {
        await db.insert('events', data)
        onToast('Événement ajouté')
      }
      onSave()
    } catch (e) {
      onToast('Erreur: ' + e.message, SEMANTIC.danger)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={event ? 'Modifier l\'événement' : 'Nouvel événement'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">Nom *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Triple 8 Ducos" />
        </div>
        <div>
          <label className="label">Date *</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Lieu *</label>
            <input className="input" value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Salle Triple 8" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Ville *</label>
            <input className="input" value={ville} onChange={e => setVille(e.target.value)} placeholder="Ducos" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Territoire</label>
            <select className="input" value={territoire} onChange={e => setTerritoire(e.target.value)}>
              {TERRITOIRES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Format</label>
            <select className="input" value={format} onChange={e => setFormat(e.target.value)}>
              {FORMATS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Capacité (pers.)</label>
          <input className="input" type="number" value={capacite} onChange={e => setCapacite(intOnly(e.target.value))} placeholder="500" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, ...TYPO.bodyBold, color: BASE.text, cursor: 'pointer' }}>
          <input type="checkbox" checked={transport} onChange={e => setTransport(e.target.checked)} />
          Transport inter-îles
        </label>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Infos supplémentaires..." rows={2} style={{ resize: 'vertical' }} />
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? 'Chargement...' : event ? 'Enregistrer' : 'Créer l\'événement'}
        </button>
      </div>
    </Modal>
  )
}
