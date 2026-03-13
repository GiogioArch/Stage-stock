import React, { useState, useMemo } from 'react'
import { db } from '../lib/supabase'
import { Modal, Confirm, Badge, intOnly } from './UI'
import EventDetail from './EventDetail'

const FORMAT_CONF = {
  'concert live': { icon: '🎤', color: '#E8735A' },
  'concert':      { icon: '🎤', color: '#E8735A' },
  'live':         { icon: '🎤', color: '#E8735A' },
  'sound system':  { icon: '🔊', color: '#5B8DB8' },
  'soundsystem':   { icon: '🔊', color: '#5B8DB8' },
  'impro':         { icon: '🎭', color: '#9B7DC4' },
  'improvisation': { icon: '🎭', color: '#9B7DC4' },
}

function getFormatConf(format) {
  if (!format) return { icon: '🎵', color: '#E8735A' }
  return FORMAT_CONF[format.toLowerCase().trim()] || { icon: '🎵', color: '#E8735A' }
}

export default function Tour({ events, products, stock, locations, families, subfamilies, checklists, roles, eventPacking, userProfiles, userRole, orgId, onReload, onToast }) {
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
      const d = new Date(ev.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      if (!groups[key]) groups[key] = { label, events: [] }
      groups[key].events.push(ev)
    })
    return Object.entries(groups).sort(([a], [b]) =>
      filter === 'past' ? b.localeCompare(a) : a.localeCompare(b)
    )
  }, [filteredEvents, filter])

  // If event detail is open, show it full screen
  if (selectedEvent) {
    return (
      <EventDetail
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
    )
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* Header */}
      <div className="card" style={{
        marginBottom: 16, padding: '18px 16px',
        background: 'linear-gradient(135deg, #E8735A08, #9B7DC418)',
        border: '1.5px solid #E8735A25',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #E8735A, #9B7DC4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white',
            boxShadow: '0 4px 16px #E8735A30',
          }}>🎪</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#3D3042' }}>EK TOUR 25 ANS</div>
            <div style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600 }}>
              {totalEvents} date{totalEvents > 1 ? 's' : ''} programm{totalEvents > 1 ? 'ées' : 'ée'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatBox label="A venir" value={upcomingCount} color="#E8735A" />
          <StatBox label="Passées" value={pastCount} color="#9A8B94" />
          <StatBox label="Total" value={totalEvents} color="#5B8DB8" />
          {nextEvent && (
            <StatBox
              label="Prochain"
              value={`J-${Math.max(0, Math.ceil((new Date(nextEvent.date) - new Date()) / 86400000))}`}
              color="#5DAB8B"
            />
          )}
        </div>
      </div>

      {/* Prochain concert - accès rapide */}
      {nextEvent && (
        <button
          onClick={() => setSelectedEvent(nextEvent)}
          className="card"
          style={{
            width: '100%', marginBottom: 16, padding: '14px 16px',
            borderLeft: '4px solid #E8735A', cursor: 'pointer', textAlign: 'left',
            background: '#E8735A06',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: '#E8735A', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
            Prochain concert
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#3D3042' }}>{nextEvent.name || nextEvent.lieu}</div>
              <div style={{ fontSize: 12, color: '#9A8B94', marginTop: 2 }}>
                {nextEvent.lieu} — {nextEvent.ville} ({nextEvent.territoire})
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#E8735A' }}>
                {new Date(nextEvent.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <div style={{ fontSize: 10, color: '#9A8B94', marginTop: 2 }}>
                {nextEvent.format} · {nextEvent.capacite} pers.
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <span className="search-icon">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un concert, lieu, ville..."
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'upcoming', label: `A venir (${upcomingCount})`, color: '#E8735A' },
          { id: 'past', label: `Passées (${pastCount})`, color: '#9A8B94' },
          { id: 'all', label: `Toutes (${totalEvents})`, color: '#5B8DB8' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            flex: 1, padding: '8px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: filter === f.id ? `${f.color}15` : 'white',
            color: filter === f.id ? f.color : '#9A8B94',
            border: `1.5px solid ${filter === f.id ? f.color + '40' : '#E8DED8'}`,
          }}>{f.label}</button>
        ))}
      </div>

      {/* Add event button */}
      <button onClick={() => setEventModal({ type: 'add' })} style={{
        width: '100%', padding: '12px 16px', borderRadius: 14, marginBottom: 16,
        background: 'white', border: '1.5px dashed #E8735A40', cursor: 'pointer',
        fontSize: 13, fontWeight: 700, color: '#E8735A',
      }}>+ Ajouter un événement</button>

      {/* Event list grouped by month */}
      {filteredEvents.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-icon">📅</div>
          <div className="empty-text">
            {search ? 'Aucun résultat' : filter === 'past' ? 'Aucune date passée' : 'Aucune date à venir'}
          </div>
        </div>
      ) : (
        groupedByMonth.map(([key, group]) => (
          <div key={key} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 12, fontWeight: 800, color: '#9A8B94', textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 10, padding: '0 4px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{group.label}</span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: '#F0E8E4', color: '#B8A0AE', fontWeight: 700 }}>
                {group.events.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {group.events.map((ev, i) => {
                const d = new Date(ev.date)
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
                        width: 2, height: 12, background: '#E8DED8', marginLeft: 19,
                      }} />
                    )}

                    <button
                      onClick={() => setSelectedEvent(ev)}
                      className="card"
                      style={{
                        width: '100%', padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                        borderLeft: `4px solid ${isNext ? '#E8735A' : isPast ? '#B8A0AE' : fmt.color}`,
                        opacity: isPast ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12 }}>
                        {/* Date block */}
                        <div style={{
                          width: 48, height: 52, borderRadius: 12, flexShrink: 0,
                          background: isPast ? '#F0E8E4' : isNext ? '#E8735A12' : `${fmt.color}12`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          border: isNext ? '2px solid #E8735A40' : 'none',
                        }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: isPast ? '#B8A0AE' : isNext ? '#E8735A' : fmt.color, lineHeight: 1 }}>
                            {d.getDate()}
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: isPast ? '#B8A0AE' : '#9A8B94', textTransform: 'uppercase' }}>
                            {d.toLocaleDateString('fr-FR', { month: 'short' })}
                          </div>
                          <div style={{ fontSize: 8, color: '#B8A0AE', fontWeight: 600 }}>
                            {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                          </div>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: '#3D3042', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.name || ev.lieu}
                            </span>
                            {isNext && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: '#E8735A', color: 'white', fontWeight: 800 }}>PROCHAIN</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#9A8B94', marginBottom: 6 }}>
                            {ev.lieu && ev.lieu !== ev.name ? `${ev.lieu} — ` : ''}{ev.ville} ({ev.territoire})
                          </div>

                          {/* Badges */}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Badge color={fmt.color}>{fmt.icon} {ev.format}</Badge>
                            {ev.capacite && <Badge color="#9B7DC4">{ev.capacite} pers.</Badge>}
                            {!isPast && daysUntil >= 0 && (
                              <Badge color={daysUntil <= 3 ? '#D4648A' : daysUntil <= 7 ? '#E8935A' : '#5B8DB8'}>
                                J-{daysUntil}
                              </Badge>
                            )}
                            {isPast && <Badge color="#B8A0AE">Terminé</Badge>}
                            {ev.transport_inter_iles && <Badge color="#E8935A">Inter-îles</Badge>}
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
                                  color="#5B8DB8"
                                />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', color: '#D8CDD2', fontSize: 16 }}>›</div>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
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
          detail={`${confirmDelete.name || confirmDelete.lieu} — ${new Date(confirmDelete.date).toLocaleDateString('fr-FR')}`}
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
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: 'white', borderRadius: 10, border: '1px solid #F0E8E4',
    }}>
      <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#9A8B94', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function ProgressMini({ label, done, total, color }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 9, color: '#9A8B94', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 9, color, fontWeight: 800 }}>{done}/{total}</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: '#F0E8E4', overflow: 'hidden' }}>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3D3042', fontWeight: 600, cursor: 'pointer' }}>
          <input type="checkbox" checked={transport} onChange={e => setTransport(e.target.checked)} />
          Transport inter-îles
        </label>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Infos supplémentaires..." rows={2} style={{ resize: 'vertical' }} />
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? '⏳...' : event ? 'Enregistrer' : 'Créer l\'événement'}
        </button>
      </div>
    </Modal>
  )
}
