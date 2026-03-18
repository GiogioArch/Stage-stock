import React, { useState, useMemo, createElement } from 'react'
import { db } from '../lib/supabase'
import { Modal, Confirm, Badge, fmtDate } from './UI'
import { Speaker, Lightbulb, Guitar, Palette, ShoppingBag, Truck, Package, HelpCircle } from 'lucide-react'

const CAT_CONFIG = {
  son:          { icon: Speaker,     color: '#5B8DB8', label: 'Son' },
  lumiere:      { icon: Lightbulb,   color: '#5B8DB8', label: 'Lumière' },
  instruments:  { icon: Guitar,      color: '#D4648A', label: 'Instruments' },
  decor:        { icon: Palette,     color: '#8B6DB8', label: 'Décor' },
  merch:        { icon: ShoppingBag, color: '#5B8DB8', label: 'Merch' },
  logistique:   { icon: Truck,       color: '#5DAB8B', label: 'Logistique' },
  consommables: { icon: Package,     color: '#8BAB5D', label: 'Consommables' },
}

function getCatConf(cat) {
  return CAT_CONFIG[cat] || { icon: HelpCircle, color: '#94A3B8', label: cat || 'Autre' }
}

export default function Checklists({ checklists, events, orgId, onReload, onToast }) {
  const [selectedEventId, setSelectedEventId] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [addModal, setAddModal] = useState(false)
  const [confirm, setConfirm] = useState(null)

  // Events that have checklists
  const eventIds = useMemo(() => [...new Set(checklists.map(c => c.event_id))], [checklists])
  const linkedEvents = useMemo(() => events.filter(e => eventIds.includes(e.id)), [events, eventIds])

  // Auto-select first event with items if none selected
  const activeEventId = selectedEventId === 'all' ? 'all' : selectedEventId

  // Filtered checklists
  const filtered = useMemo(() => {
    let list = checklists
    if (activeEventId !== 'all') list = list.filter(c => c.event_id === activeEventId)
    if (filterCat !== 'all') list = list.filter(c => c.category === filterCat)
    return list
  }, [checklists, activeEventId, filterCat])

  // Group by category
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(item => {
      const cat = item.category || 'autre'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    })
    // Sort categories
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  // Stats
  const total = filtered.length
  const checked = filtered.filter(c => c.checked).length
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0

  // Categories present
  const categories = useMemo(() => [...new Set(checklists.map(c => c.category))].sort(), [checklists])

  // Toggle check
  const toggleCheck = async (item) => {
    try {
      const now = new Date().toISOString()
      await db.update('checklists', `id=eq.${item.id}`, {
        checked: !item.checked,
        checked_at: !item.checked ? now : null,
      })
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  // Delete item
  const handleDelete = async (item) => {
    try {
      await db.delete('checklists', `id=eq.${item.id}`)
      onToast('Item supprimé')
      setConfirm(null)
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  // Reset all checks for filtered items
  const resetAll = async () => {
    try {
      for (const item of filtered.filter(c => c.checked)) {
        await db.update('checklists', `id=eq.${item.id}`, { checked: false, checked_at: null })
      }
      onToast('Checklist réinitialisée')
      setConfirm(null)
      onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Event selector */}
      {linkedEvents.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            <EventPill active={activeEventId === 'all'} onClick={() => setSelectedEventId('all')}>
              Tous ({checklists.length})
            </EventPill>
            {linkedEvents.map(ev => {
              const count = checklists.filter(c => c.event_id === ev.id).length
              const done = checklists.filter(c => c.event_id === ev.id && c.checked).length
              return (
                <EventPill key={ev.id} active={activeEventId === ev.id} onClick={() => setSelectedEventId(ev.id)}>
                  {ev.name?.replace(/^[^\w]+ /, '') || 'Événement'} ({done}/{count})
                </EventPill>
              )
            })}
          </div>
        </div>
      )}

      {/* Category pills */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
          <CatPill active={filterCat === 'all'} onClick={() => setFilterCat('all')}>Tout</CatPill>
          {categories.map(cat => {
            const conf = getCatConf(cat)
            return (
              <CatPill key={cat} active={filterCat === cat} color={conf.color} onClick={() => setFilterCat(cat)}>
                {createElement(conf.icon, { size: 12 })} {conf.label}
              </CatPill>
            )
          })}
        </div>
      )}

      {/* Progress bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
            {checked}/{total} complété{checked > 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 22, fontWeight: 600, color: pct === 100 ? '#5DAB8B' : '#5B8DB8' }}>
            {pct}%
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4, transition: 'width 0.3s',
            width: `${pct}%`,
            background: pct === 100
              ? 'linear-gradient(90deg, #5DAB8B, #4A9A7A)'
              : 'linear-gradient(90deg, #5B8DB8, #D4648A)',
          }} />
        </div>
      </div>

      {/* Actions bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setAddModal(true)} style={{
          flex: 1, padding: '10px 14px', borderRadius: 12,
          background: 'linear-gradient(135deg, #5B8DB8, #D4648A)',
          color: 'white', fontSize: 13, fontWeight: 600,
        }}>+ Ajouter</button>
        {checked > 0 && (
          <button onClick={() => setConfirm({
            message: 'Réinitialiser la checklist ?',
            detail: `${checked} item${checked > 1 ? 's' : ''} seront décochés.`,
            onConfirm: resetAll,
          })} style={{
            padding: '10px 14px', borderRadius: 12,
            background: '#F8FAFC', border: '1px solid #CBD5E1',
            color: '#94A3B8', fontSize: 13, fontWeight: 700,
          }}> Reset</button>
        )}
      </div>

      {/* Checklist items grouped by category */}
      {total === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <div className="empty-title">Aucun item</div>
          <div className="empty-text">Ajoute des items à préparer avant l'événement</div>
        </div>
      ) : (
        grouped.map(([cat, items]) => {
          const conf = getCatConf(cat)
          return (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 4px' }}>
                <span style={{ fontSize: 16, display: 'flex', alignItems: 'center' }}>{createElement(conf.icon, { size: 16, color: conf.color })}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: conf.color, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {conf.label}
                </span>
                <span style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 600 }}>
                  {items.filter(i => i.checked).length}/{items.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(item => (
                  <CheckItem
                    key={item.id}
                    item={item}
                    color={conf.color}
                    onToggle={() => toggleCheck(item)}
                    onDelete={() => setConfirm({
                      message: `Supprimer "${item.item}" ?`,
                      onConfirm: () => handleDelete(item),
                    })}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Add modal */}
      {addModal && (
        <AddItemModal
          events={events}
          categories={categories}
          defaultEventId={activeEventId !== 'all' ? activeEventId : events[0]?.id}
          onClose={() => setAddModal(false)}
          onSave={async (data) => {
            try {
              await db.insert('checklists', { ...data, org_id: orgId })
              onToast('Item ajouté')
              setAddModal(false)
              onReload()
            } catch (e) {
              onToast('Erreur: ' + e.message, '#D4648A')
            }
          }}
        />
      )}

      {/* Confirm */}
      {confirm && (
        <Confirm
          message={confirm.message}
          detail={confirm.detail}
          confirmLabel="Confirmer"
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ─── Check Item ───
function CheckItem({ item, color, onToggle, onDelete }) {
  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      opacity: item.checked ? 0.6 : 1, transition: 'opacity 0.2s',
    }}>
      <button onClick={onToggle} style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        border: `2px solid ${item.checked ? color : '#CBD5E1'}`,
        background: item.checked ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s',
      }}>
        {item.checked ? '✓' : ''}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#1E293B',
          textDecoration: item.checked ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.item}
        </div>
        {item.checked_at && (
          <div style={{ fontSize: 10, color: '#CBD5E1', marginTop: 2 }}>
            {fmtDate(item.checked_at)}
          </div>
        )}
      </div>
      <button onClick={onDelete} style={{
        fontSize: 14, color: '#CBD5E1', padding: 4, flexShrink: 0,
      }}></button>
    </div>
  )
}

// ─── Add Item Modal ───
function AddItemModal({ events, categories, defaultEventId, onClose, onSave }) {
  const [item, setItem] = useState('')
  const [category, setCategory] = useState(categories[0] || 'logistique')
  const [eventId, setEventId] = useState(defaultEventId || '')

  const allCats = Object.entries(CAT_CONFIG)

  return (
    <Modal title="Nouvel item" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">Description *</label>
          <input className="input" value={item} onChange={e => setItem(e.target.value)}
            placeholder="Ex: 4x Micro SM58 — tester" />
        </div>
        <div>
          <label className="label">Catégorie</label>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {allCats.map(([id, conf]) => (
              <option key={id} value={id}>{conf.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Événement</label>
          <select className="input" value={eventId} onChange={e => setEventId(e.target.value)}>
            <option value="">— Aucun —</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name} ({ev.date})</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={() => {
          if (!item.trim()) return
          onSave({
            item: item.trim(),
            category,
            event_id: eventId || null,
            checked: false,
          })
        }} disabled={!item.trim()}>
          Ajouter
        </button>
      </div>
    </Modal>
  )
}

// ─── Pill components ───
function EventPill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s',
      border: `1px solid ${active ? '#5B8DB8' : '#CBD5E1'}`,
      background: active ? '#5B8DB812' : 'white',
      color: active ? '#5B8DB8' : '#94A3B8',
    }}>{children}</button>
  )
}

function CatPill({ active, color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s',
      border: `1px solid ${active ? (color || '#5B8DB8') : '#CBD5E1'}`,
      background: active ? `${color || '#5B8DB8'}12` : 'white',
      color: active ? (color || '#5B8DB8') : '#94A3B8',
    }}>{children}</button>
  )
}
