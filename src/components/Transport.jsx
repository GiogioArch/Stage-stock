import React, { useState, useMemo, createElement } from 'react'
import { db } from '../lib/supabase'
import { Building, Map as MapIcon, Ship, Truck, Car } from 'lucide-react'
import { Badge, parseDate } from './UI'
import { useToast, useProject } from '../shared/hooks'

export default function Transport({
  events, transportProviders, vehicles, transportRoutes,
  transportNeeds, transportBookings, transportManifests, transportCosts,
  onToast: _legacyToast,
}) {
  const toast = useToast()
  const onToast = _legacyToast || toast
  const { reload } = useProject()
  const [section, setSection] = useState('overview')
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [showAddNeed, setShowAddNeed] = useState(false)
  const [expandedEvent, setExpandedEvent] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  // ─── Stats ───
  const upcomingEvents = useMemo(() =>
    (events || []).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
    [events, today]
  )

  const needsByEvent = useMemo(() => {
    const map = {}
    ;(transportNeeds || []).forEach(n => {
      if (!map[n.event_id]) map[n.event_id] = []
      map[n.event_id].push(n)
    })
    return map
  }, [transportNeeds])

  const totalCost = useMemo(() =>
    (transportCosts || []).reduce((s, c) => s + (c.amount || 0), 0),
    [transportCosts]
  )

  const pendingNeeds = (transportNeeds || []).filter(n => n.status === 'pending').length
  const bookedNeeds = (transportNeeds || []).filter(n => n.status === 'booked' || n.status === 'in_transit').length
  const deliveredNeeds = (transportNeeds || []).filter(n => n.status === 'delivered').length

  const SECTIONS = [
    { id: 'overview', label: 'Vue globale', icon: null },
    { id: 'events', label: 'Par concert', icon: null },
    { id: 'providers', label: 'Prestataires', icon: Building },
    { id: 'routes', label: 'Routes', icon: MapIcon },
  ]

  const NEED_CATS = { equipment: ' Matériel', merch: ' Merch', people: ' Personnes', other: ' Autre' }
  const STATUS_CONF = {
    pending: { label: 'En attente', color: '#E8935A' },
    booked: { label: 'Réservé', color: '#5B8DB8' },
    in_transit: { label: 'En transit', color: '#8B6DB8' },
    delivered: { label: 'Livré', color: '#5DAB8B' },
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>

      {/* Header */}
      <div className="card" style={{
        marginBottom: 16, padding: '18px 16px',
        background: 'linear-gradient(135deg, #5B8DB808, #5B8DB818)',
        border: '1px solid #5B8DB825',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: 'linear-gradient(135deg, #5B8DB8, #D4624A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white', boxShadow: '0 4px 16px #5B8DB830',
          }}></div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B' }}>Transport</div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
              Logistique inter-îles & déplacements
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="En attente" value={pendingNeeds} color="#E8935A" />
          <KpiBox label="Réservés" value={bookedNeeds} color="#5B8DB8" />
          <KpiBox label="Coût total" value={`${Math.round(totalCost)}€`} color="#5B8DB8" />
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            flex: 1, padding: '7px 6px', borderRadius: 10, fontSize: 10, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            background: section === s.id ? '#5B8DB815' : 'white',
            color: section === s.id ? '#5B8DB8' : '#94A3B8',
            border: `1px solid ${section === s.id ? '#5B8DB840' : '#E2E8F0'}`,
          }}>{s.icon ? createElement(s.icon, { size: 12 }) : null} {s.label}</button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {section === 'overview' && (
        <div>
          {/* Status breakdown */}
          <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Statut des transports
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
              {Object.entries(STATUS_CONF).map(([k, v]) => {
                const count = (transportNeeds || []).filter(n => n.status === k).length
                return (
                  <div key={k}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: v.color }}>{count}</div>
                    <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>{v.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Providers summary */}
          <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Prestataires
            </div>
            {(transportProviders || []).length === 0 ? (
              <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 12 }}>
                Aucun prestataire configuré
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(transportProviders || []).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: p.type === 'ferry' ? '#5B8DB815' : '#5B8DB815',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>{createElement(p.type === 'ferry' ? Ship : Truck, { size: 16, color: p.type === 'ferry' ? '#5B8DB8' : '#5B8DB8' })}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>{p.contact_name || p.type}</div>
                    </div>
                    <Badge color={p.active ? '#5DAB8B' : '#94A3B8'}>
                      {p.active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cost breakdown */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Coûts transport
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#5B8DB8' }}>{Math.round(totalCost)}€</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Total dépenses transport</div>
            </div>
            {(transportCosts || []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                {['transport', 'fuel', 'toll', 'parking', 'other'].map(cat => {
                  const catTotal = (transportCosts || []).filter(c => c.category === cat).reduce((s, c) => s + (c.amount || 0), 0)
                  if (catTotal === 0) return null
                  return (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                      <span style={{ color: '#94A3B8', textTransform: 'capitalize' }}>{cat}</span>
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>{Math.round(catTotal)}€</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── By Event ─── */}
      {section === 'events' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowAddNeed(!showAddNeed)} style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: showAddNeed ? '#E2E8F0' : '#5B8DB8', color: showAddNeed ? '#94A3B8' : 'white',
              cursor: 'pointer', border: 'none',
            }}>
              {showAddNeed ? 'Annuler' : '+ Besoin transport'}
            </button>
          </div>

          {showAddNeed && (
            <AddNeedForm
              events={upcomingEvents}
              onDone={() => { setShowAddNeed(false); reload() }}
              onToast={onToast}
            />
          )}

          {upcomingEvents.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-icon"></div>
              <div className="empty-text">Aucun concert à venir</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingEvents.map(ev => {
                const needs = needsByEvent[ev.id] || []
                const isExpanded = expandedEvent === ev.id
                const allDone = needs.length > 0 && needs.every(n => n.status === 'delivered')
                return (
                  <div key={ev.id}>
                    <button onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                      className="card" style={{
                        width: '100%', padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                        borderLeft: `4px solid ${needs.length === 0 ? '#E2E8F0' : allDone ? '#5DAB8B' : '#E8935A'}`,
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.name || ev.lieu}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>
                            {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {ev.ville}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {needs.length > 0 ? (
                            <>
                              <div style={{ fontSize: 14, fontWeight: 600, color: allDone ? '#5DAB8B' : '#E8935A' }}>
                                {needs.filter(n => n.status === 'delivered').length}/{needs.length}
                              </div>
                              <div style={{ fontSize: 9, color: '#94A3B8' }}>transports</div>
                            </>
                          ) : (
                            <div style={{ fontSize: 10, color: '#94A3B8' }}>Aucun besoin</div>
                          )}
                        </div>
                        <span style={{
                          fontSize: 12, color: '#94A3B8', transition: 'transform 0.2s',
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                        }}>▼</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div style={{
                        margin: '0 8px', padding: '12px 14px', background: '#F8FAFC',
                        borderRadius: '0 0 14px 14px', border: '1px solid #E2E8F0', borderTop: 'none',
                      }}>
                        {needs.length === 0 ? (
                          <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 8 }}>
                            Aucun besoin transport pour ce concert
                          </div>
                        ) : (
                          needs.map(n => {
                            const st = STATUS_CONF[n.status] || STATUS_CONF.pending
                            return (
                              <div key={n.id} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                                borderBottom: '1px solid #E2E8F0',
                              }}>
                                <span style={{ fontSize: 14 }}>
                                  {NEED_CATS[n.category]?.split(' ')[0] || ''}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                                    {n.description || NEED_CATS[n.category] || n.category}
                                  </div>
                                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                                    {n.quantity > 1 ? `${n.quantity} unités` : ''}
                                    {n.weight_kg ? ` · ${n.weight_kg}kg` : ''}
                                  </div>
                                </div>
                                <NeedStatusButton need={n} onReload={reload} onToast={onToast} />
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Providers ─── */}
      {section === 'providers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowAddProvider(!showAddProvider)} style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: showAddProvider ? '#E2E8F0' : '#5B8DB8', color: showAddProvider ? '#94A3B8' : 'white',
              cursor: 'pointer', border: 'none',
            }}>
              {showAddProvider ? 'Annuler' : '+ Ajouter prestataire'}
            </button>
          </div>

          {showAddProvider && (
            <AddProviderForm onDone={() => { setShowAddProvider(false); reload() }} onToast={onToast} />
          )}

          {(transportProviders || []).length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-icon">{createElement(Building, { size: 40, color: '#94A3B8' })}</div>
              <div className="empty-text">Aucun prestataire transport</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                Ajoutez vos compagnies de ferry, loueurs de camions, etc.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(transportProviders || []).map(p => {
                const bookings = (transportBookings || []).filter(b => b.provider_id === p.id)
                const provCost = (transportCosts || [])
                  .filter(c => bookings.some(b => b.id === c.booking_id))
                  .reduce((s, c) => s + (c.amount || 0), 0)
                return (
                  <div key={p.id} className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: p.type === 'ferry' ? '#5B8DB815' : '#5B8DB815',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      }}>{createElement(p.type === 'ferry' ? Ship : p.type === 'car' ? Car : Truck, { size: 22, color: p.type === 'ferry' ? '#5B8DB8' : '#5B8DB8' })}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          {p.contact_name || ''}{p.contact_phone ? ` · ${p.contact_phone}` : ''}
                        </div>
                        {p.contact_email && (
                          <div style={{ fontSize: 10, color: '#94A3B8' }}>{p.contact_email}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#5B8DB8' }}>
                          {bookings.length}
                        </div>
                        <div style={{ fontSize: 9, color: '#94A3B8' }}>résa.</div>
                        {provCost > 0 && (
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#E8935A', marginTop: 2 }}>
                            {Math.round(provCost)}€
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Routes ─── */}
      {section === 'routes' && (
        <div>
          {(transportRoutes || []).length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-icon">{createElement(MapIcon, { size: 40, color: '#94A3B8' })}</div>
              <div className="empty-text">Aucune route configurée</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                Fort-de-France → Pointe-à-Pitre, etc.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(transportRoutes || []).map(r => (
                <div key={r.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {createElement(MapIcon, { size: 20, color: '#5B8DB8' })}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name || `${r.origin} → ${r.destination}`}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        {r.origin} → {r.destination}
                        {r.distance_km ? ` · ${r.distance_km}km` : ''}
                        {r.duration_hours ? ` · ${r.duration_hours}h` : ''}
                      </div>
                    </div>
                    {r.default_cost > 0 && (
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#E8935A' }}>{r.default_cost}€</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───

function NeedStatusButton({ need, onReload, onToast: _legacyToast }) {
  const toast = useToast()
  const onToast = _legacyToast || toast
  const statusFlow = ['pending', 'booked', 'in_transit', 'delivered']
  const STATUS_CONF = {
    pending: { label: 'En attente', color: '#E8935A' },
    booked: { label: 'Réservé', color: '#5B8DB8' },
    in_transit: { label: 'En transit', color: '#8B6DB8' },
    delivered: { label: 'Livré', color: '#5DAB8B' },
  }
  const st = STATUS_CONF[need.status] || STATUS_CONF.pending

  const advance = async () => {
    const idx = statusFlow.indexOf(need.status)
    if (idx >= statusFlow.length - 1) return
    const next = statusFlow[idx + 1]
    try {
      await db.update('transport_needs', `id=eq.${need.id}`, { status: next })
      onToast(`Transport → ${STATUS_CONF[next].label}`)
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#8B6DB8')
    }
  }

  return (
    <button onClick={(e) => { e.stopPropagation(); advance() }} style={{
      padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
      background: `${st.color}15`, color: st.color, border: `1px solid ${st.color}30`,
      cursor: need.status === 'delivered' ? 'default' : 'pointer',
    }}>
      {st.label}
    </button>
  )
}

function AddProviderForm({ onDone, onToast: _legacyToast }) {
  const toast = useToast()
  const onToast = _legacyToast || toast
  const [name, setName] = useState('')
  const [type, setType] = useState('ferry')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const TYPES = [
    { id: 'ferry', label: 'Ferry', icon: Ship },
    { id: 'truck', label: 'Camion', icon: Truck },
    { id: 'van', label: 'Utilitaire', icon: Truck },
    { id: 'car', label: 'Voiture', icon: Car },
    { id: 'other', label: 'Autre', icon: Truck },
  ]

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await db.insert('transport_providers', {
        name: name.trim(),
        type,
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
      })
      onToast('Prestataire ajouté')
      onDone()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#8B6DB8')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 12 }}>Nouveau prestataire</div>
      <input className="input" value={name} onChange={e => setName(e.target.value)}
        placeholder="Nom (ex: L'Express des Îles)" style={{ marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {TYPES.map(t => (
          <button key={t.id} onClick={() => setType(t.id)} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: type === t.id ? '#5B8DB815' : 'white',
            color: type === t.id ? '#5B8DB8' : '#94A3B8',
            border: `1px solid ${type === t.id ? '#5B8DB840' : '#E2E8F0'}`,
            cursor: 'pointer',
          }}>{createElement(t.icon, { size: 12 })} {t.label}</button>
        ))}
      </div>
      <input className="input" value={contactName} onChange={e => setContactName(e.target.value)}
        placeholder="Nom du contact" style={{ marginBottom: 10 }} />
      <input className="input" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
        placeholder="Téléphone" style={{ marginBottom: 10 }} />
      <input className="input" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
        placeholder="Email" style={{ marginBottom: 10 }} />
      <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-primary">
        {saving ? 'Création...' : 'Ajouter'}
      </button>
    </div>
  )
}

function AddNeedForm({ events, onDone, onToast: _legacyToast }) {
  const toast = useToast()
  const onToast = _legacyToast || toast
  const [eventId, setEventId] = useState(events[0]?.id || '')
  const [category, setCategory] = useState('equipment')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [weightKg, setWeightKg] = useState('')
  const [priority, setPriority] = useState('normal')
  const [saving, setSaving] = useState(false)

  const CATS = [
    { id: 'equipment', label: ' Matériel' },
    { id: 'merch', label: ' Merch' },
    { id: 'people', label: ' Personnes' },
    { id: 'other', label: ' Autre' },
  ]

  const handleSave = async () => {
    if (!eventId || !description.trim()) return
    setSaving(true)
    try {
      await db.insert('transport_needs', {
        event_id: eventId,
        category,
        description: description.trim(),
        quantity: parseInt(quantity) || 1,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        priority,
      })
      onToast('Besoin transport ajouté')
      onDone()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#8B6DB8')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 12 }}>Nouveau besoin transport</div>
      <select className="input" value={eventId} onChange={e => setEventId(e.target.value)} style={{ marginBottom: 10 }}>
        {events.map(ev => (
          <option key={ev.id} value={ev.id}>
            {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {ev.name || ev.lieu || ev.ville}
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {CATS.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: category === c.id ? '#5B8DB815' : 'white',
            color: category === c.id ? '#5B8DB8' : '#94A3B8',
            border: `1px solid ${category === c.id ? '#5B8DB840' : '#E2E8F0'}`,
            cursor: 'pointer',
          }}>{c.label}</button>
        ))}
      </div>
      <input className="input" value={description} onChange={e => setDescription(e.target.value)}
        placeholder="Description (ex: 3 flight cases son)" style={{ marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input className="input" value={quantity} onChange={e => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="Qté" style={{ flex: 1 }} />
        <input className="input" value={weightKg} onChange={e => setWeightKg(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="Poids (kg)" style={{ flex: 1 }} />
      </div>
      <button onClick={handleSave} disabled={!description.trim() || !eventId || saving} className="btn-primary">
        {saving ? 'Ajout...' : 'Ajouter'}
      </button>
    </div>
  )
}

function KpiBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: '#F1F5F9', borderRadius: 10, border: '1px solid #E2E8F0',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
