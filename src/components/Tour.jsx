import React, { useState, useMemo } from 'react'
import { db } from '../lib/supabase'
import { Modal, Confirm, Badge, intOnly, parseDate } from './UI'
import EventDetail from './EventDetail'
import { Mic, Volume2, Drama, Music, Search, Calendar, Plus, ChevronRight } from 'lucide-react'

const FORMAT_CONF = {
  'concert live': { Icon: Mic, color: '#E8735A' },
  'concert':      { Icon: Mic, color: '#E8735A' },
  'live':         { Icon: Mic, color: '#E8735A' },
  'sound system':  { Icon: Volume2, color: '#E8735A' },
  'soundsystem':   { Icon: Volume2, color: '#E8735A' },
  'impro':         { Icon: Drama, color: '#8B6DB8' },
  'improvisation': { Icon: Drama, color: '#8B6DB8' },
}

function getFormatConf(format) {
  if (!format) return { Icon: Music, color: '#E8735A' }
  return FORMAT_CONF[format.toLowerCase().trim()] || { Icon: Music, color: '#E8735A' }
}

export default function Tour({ events, products, stock, locations, families, subfamilies, checklists, roles, eventPacking, userProfiles, userRole, orgId, orgName, onReload, onToast }) {
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

  return (
    <>
    {/* ─── Event Detail (floating window) ─── */}
    {selectedEvent && (
      <div
        onClick={() => setSelectedEvent(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          animation: 'fadeIn 0.15s ease',
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
            userProfiles={userProfiles}
            userRole={userRole}
            orgId={orgId}
            onClose={() => setSelectedEvent(null)}
            onReload={onReload}
            onToast={onToast}
            onNavigateEvent={(ev) => setSelectedEvent(ev)}
            onEdit={(ev) => { setSelectedEvent(null); setEventModal({ type: 'edit', event: ev }) }}
            onDelete={(ev) => setConfirmDelete(ev)}
          />
        </div>
      </div>
    )}

    <div style={{ paddingBottom: 24 }}>
      {/* ═══ HEADER GRADIENT BOLD ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #E8735A, #D4648A)',
        padding: '24px 16px 20px',
        color: 'white',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.85 }}>
          Tournée
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
          {orgName || 'Ma tournée'} — {totalEvents} date{totalEvents > 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{upcomingCount}</div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>A venir</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{pastCount}</div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>Passées</div>
          </div>
          {nextEvent && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                J-{Math.max(0, Math.ceil((new Date(nextEvent.date) - new Date()) / 86400000))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>Prochain</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
      {/* ═══ PROCHAIN CONCERT ═══ */}
      {nextEvent && (
        <button
          onClick={() => setSelectedEvent(nextEvent)}
          style={{
            width: '100%', marginBottom: 16, padding: '14px 16px',
            borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            background: 'white', border: 'none',
            boxShadow: '0 2px 8px rgba(232,115,90,0.15), 0 0 0 1px rgba(232,115,90,0.1)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#E8735A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Prochain concert
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{nextEvent.name || nextEvent.lieu}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                {nextEvent.lieu} — {nextEvent.ville}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E8735A' }}>
                {parseDate(nextEvent.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { id: 'upcoming', label: `A venir (${upcomingCount})` },
          { id: 'past', label: `Passées (${pastCount})` },
          { id: 'all', label: `Toutes (${totalEvents})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center', border: 'none',
            background: filter === f.id ? '#1E293B' : '#F1F5F9',
            color: filter === f.id ? '#FFFFFF' : '#64748B',
            transition: 'all 0.2s',
          }}>{f.label}</button>
        ))}
      </div>

      {/* ═══ ADD EVENT ═══ */}
      <button onClick={() => setEventModal({ type: 'add' })} style={{
        width: '100%', padding: '12px 16px', borderRadius: 10, marginBottom: 16,
        background: 'linear-gradient(135deg, #E8735A, #D4648A)', border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        boxShadow: '0 2px 8px rgba(232,115,90,0.3)',
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
              fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase',
              letterSpacing: 0.5, marginBottom: 8, padding: '0 4px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{group.label}</span>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#F1F5F9', color: '#CBD5E1', fontWeight: 500 }}>
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
                        width: 1, height: 8, background: '#E2E8F0', marginLeft: 19,
                      }} />
                    )}

                    <button
                      onClick={() => setSelectedEvent(ev)}
                      style={{
                        width: '100%', padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                        borderRadius: 12, border: 'none', marginBottom: 2,
                        borderLeft: `4px solid ${isNext ? '#E8735A' : isPast ? '#E2E8F0' : fmt.color}`,
                        background: 'white',
                        boxShadow: isNext ? '0 2px 12px rgba(232,115,90,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
                        opacity: isPast ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12 }}>
                        {/* Date block — BOLD style (fond plein coloré) */}
                        <div style={{
                          width: 48, height: 52, borderRadius: 10, flexShrink: 0,
                          background: isPast ? '#E2E8F0' : isNext ? '#E8735A' : fmt.color,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          color: isPast ? '#94A3B8' : 'white',
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
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.name || ev.lieu}
                            </span>
                            {isNext && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: '#E8735A', color: 'white', fontWeight: 700 }}>NEXT</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>
                            {ev.lieu && ev.lieu !== ev.name ? `${ev.lieu} — ` : ''}{ev.ville} ({ev.territoire})
                          </div>

                          {/* Badges */}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Badge color={fmt.color}>{ev.format}</Badge>
                            {ev.capacite && <Badge color="#8B6DB8">{ev.capacite} pers.</Badge>}
                            {!isPast && daysUntil >= 0 && (
                              <Badge color={daysUntil <= 3 ? '#D4648A' : daysUntil <= 7 ? '#E8935A' : '#E8735A'}>
                                J-{daysUntil}
                              </Badge>
                            )}
                            {isPast && <Badge color="#CBD5E1">Terminé</Badge>}
                            {ev.transport_inter_iles && <Badge color="#E8735A">Inter-îles</Badge>}
                          </div>

                          {/* Progress indicators */}
                          {(checksTotal > 0 || packTotal > 0) && (
                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                              {checksTotal > 0 && (
                                <ProgressMini
                                  label="Checklist"
                                  done={checksDone}
                                  total={checksTotal}
                                  color="#5DAB8B"
                                />
                              )}
                              {packTotal > 0 && (
                                <ProgressMini
                                  label="Packing"
                                  done={packDone}
                                  total={packTotal}
                                  color="#E8735A"
                                />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', color: '#CBD5E1' }}><ChevronRight size={16} /></div>
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
          orgId={orgId}
          onClose={() => setEventModal(null)}
          onSave={() => { setEventModal(null); onReload() }}
          onToast={onToast}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Confirm
          message="Supprimer cet événement ?"
          detail={`${confirmDelete.name || confirmDelete.lieu} — ${parseDate(confirmDelete.date).toLocaleDateString('fr-FR')}`}
          confirmLabel="Supprimer"
          confirmColor="#D4648A"
          onConfirm={async () => {
            try {
              await db.delete('event_packing', `event_id=eq.${confirmDelete.id}`)
              await db.delete('checklists', `event_id=eq.${confirmDelete.id}`)
              await db.delete('events', `id=eq.${confirmDelete.id}`)
              onToast('Événement supprimé')
              setConfirmDelete(null)
              setSelectedEvent(null)
              onReload()
            } catch (e) {
              onToast('Erreur: ' + e.message, '#D4648A')
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
    </>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: '#F1F5F9', borderRadius: 8, border: '1px solid #E2E8F0',
    }}>
      <div style={{ fontSize: 15, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function ProgressMini({ label, done, total, color }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 9, color, fontWeight: 600 }}>{done}/{total}</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 2,
          background: pct === 100 ? '#5DAB8B' : color,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}

// ─── Event Form Modal (Add/Edit) ───
const FORMATS = ['concert live', 'sound system', 'impro', 'festival', 'showcase']
const TERRITOIRES = ['martinique', 'guadeloupe', 'guyane', 'reunion']

function EventFormModal({ event, orgId, onClose, onSave, onToast }) {
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
      onToast('Erreur: ' + e.message, '#D4648A')
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1E293B', fontWeight: 600, cursor: 'pointer' }}>
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
