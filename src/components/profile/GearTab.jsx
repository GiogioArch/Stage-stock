import React, { useState } from 'react'
import { db } from '../../lib/supabase'
import { Field } from './ProfileHelpers'

export const GEAR_CATS = {
  instrument: { icon: '', label: 'Instrument', color: '#7C3AED' },
  son:        { icon: '', label: 'Son', color: '#2563EB' },
  lumiere:    { icon: '', label: 'Lumi\u00e8re', color: '#D97706' },
  tech:       { icon: '\u{1F4BB}', label: 'Tech', color: '#7C3AED' },
  scene:      { icon: '', label: 'Sc\u00e8ne', color: '#6366F1' },
  transport:  { icon: '', label: 'Transport', color: '#16A34A' },
  other:      { icon: '', label: 'Autre', color: '#94A3B8' },
}

export const CONDITION_CONF = {
  neuf:      { label: 'Neuf', color: '#16A34A' },
  excellent: { label: 'Excellent', color: '#2563EB' },
  bon:       { label: 'Bon', color: '#D97706' },
  use:       { label: 'Us\u00e9', color: '#7C3AED' },
  hs:        { label: 'HS', color: '#94A3B8' },
}

export default function GearTab({ user, gear, onToast, onReload }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'instrument', brand: '', model: '', serial_number: '', purchase_value: '', current_condition: 'bon', notes: '' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const totalValue = gear.reduce((s, g) => s + (g.purchase_value || 0), 0)

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await db.insert('user_gear', {
        user_id: user.id,
        name: form.name.trim(),
        category: form.category,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        serial_number: form.serial_number.trim() || null,
        purchase_value: form.purchase_value ? parseFloat(form.purchase_value) : 0,
        current_condition: form.current_condition,
        notes: form.notes.trim() || null,
      })
      onToast('\u00c9quipement ajout\u00e9')
      setForm({ name: '', category: 'instrument', brand: '', model: '', serial_number: '', purchase_value: '', current_condition: 'bon', notes: '' })
      setShowAdd(false)
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#7C3AED')
    } finally {
      setSaving(false)
    }
  }

  const deleteGear = async (id) => {
    try {
      await db.delete('user_gear', `id=eq.${id}`)
      onToast('Supprim\u00e9')
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#7C3AED')
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, textAlign: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#6366F1' }}>{gear.length}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>\u00c9quipements</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#16A34A' }}>{Math.round(totalValue)}\u20ac</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Valeur totale</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#2563EB' }}>{gear.filter(g => g.available).length}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Disponibles</div>
          </div>
        </div>
      </div>

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: showAdd ? '#E2E8F0' : '#7C3AED', color: showAdd ? '#94A3B8' : 'white',
          cursor: 'pointer', border: 'none',
        }}>{showAdd ? 'Annuler' : '+ Ajouter'}</button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 12 }}>Nouvel \u00e9quipement</div>
          <Field label="Nom" value={form.name} onChange={v => set('name', v)} placeholder="ex: Guitare Martin D-28" />
          <div style={{ marginBottom: 12 }}>
            <label className="label">Cat\u00e9gorie</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(GEAR_CATS).map(([k, v]) => (
                <button key={k} onClick={() => set('category', k)} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  background: form.category === k ? `${v.color}15` : 'white',
                  color: form.category === k ? v.color : '#94A3B8',
                  border: `1px solid ${form.category === k ? v.color + '40' : '#E2E8F0'}`,
                }}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Field label="Marque" value={form.brand} onChange={v => set('brand', v)} /></div>
            <div style={{ flex: 1 }}><Field label="Mod\u00e8le" value={form.model} onChange={v => set('model', v)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Field label="N\u00b0 s\u00e9rie" value={form.serial_number} onChange={v => set('serial_number', v)} /></div>
            <div style={{ flex: 1 }}><Field label="Valeur (\u20ac)" value={form.purchase_value} onChange={v => set('purchase_value', v.replace(/[^0-9.]/g, ''))} inputMode="decimal" /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="label">\u00c9tat</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.entries(CONDITION_CONF).map(([k, v]) => (
                <button key={k} onClick={() => set('current_condition', k)} style={{
                  flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                  background: form.current_condition === k ? `${v.color}15` : 'white',
                  color: form.current_condition === k ? v.color : '#94A3B8',
                  border: `1px solid ${form.current_condition === k ? v.color + '40' : '#E2E8F0'}`,
                }}>{v.label}</button>
              ))}
            </div>
          </div>
          <Field label="Notes" value={form.notes} onChange={v => set('notes', v)} multiline placeholder="Optionnel" />
          <button onClick={handleSave} disabled={!form.name.trim() || saving} className="btn-primary">
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      )}

      {/* Gear list */}
      {gear.length === 0 && !showAdd ? (
        <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>Aucun mat\u00e9riel</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Ajoute tes instruments et \u00e9quipements perso</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gear.map(g => {
            const cat = GEAR_CATS[g.category] || GEAR_CATS.other
            const cond = CONDITION_CONF[g.current_condition] || CONDITION_CONF.bon
            return (
              <div key={g.id} className="card" style={{
                padding: '12px 14px', borderLeft: `4px solid ${cat.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${cat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>{cat.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>
                      {[g.brand, g.model].filter(Boolean).join(' ') || cat.label}
                      {g.serial_number ? ` \u00b7 SN: ${g.serial_number}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {g.purchase_value > 0 && <div style={{ fontSize: 13, fontWeight: 600, color: '#D97706' }}>{g.purchase_value}\u20ac</div>}
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                      background: `${cond.color}15`, color: cond.color,
                    }}>{cond.label}</span>
                  </div>
                  <button onClick={() => deleteGear(g.id)} style={{
                    width: 28, height: 28, borderRadius: 8, background: '#7C3AED10',
                    border: 'none', color: '#7C3AED', fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>\u00d7</button>
                </div>
                {g.notes && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, paddingLeft: 50 }}>{g.notes}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
