import React, { useState, useMemo } from 'react'
import { db } from '../../lib/supabase'
import { parseDate } from '../UI'
import { Field } from './ProfileHelpers'

const INCOME_TYPES = {
  cachet:         { label: 'Cachet', color: '#16A34A', icon: '' },
  facture:        { label: 'Facture', color: '#2563EB', icon: '\u{1F4C4}' },
  remboursement:  { label: 'Remboursement', color: '#D97706', icon: '\u{1F4B8}' },
  prime:          { label: 'Prime', color: '#7C3AED', icon: '\u2B50' },
  autre:          { label: 'Autre', color: '#94A3B8', icon: '\u{1F4DD}' },
}

const INCOME_STATUS = {
  pending:   { label: 'En attente', color: '#D97706' },
  paid:      { label: 'Pay\u00e9', color: '#16A34A' },
  cancelled: { label: 'Annul\u00e9', color: '#7C3AED' },
}

export default function FinancesTab({ user, income, events, onToast, onReload }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ type: 'cachet', description: '', amount: '', date: new Date().toISOString().split('T')[0], event_id: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const sortedIncome = useMemo(() =>
    [...(income || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [income]
  )

  const totalEarned = income.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0)
  const totalPending = income.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0)
  const totalAll = income.reduce((s, i) => s + (i.status !== 'cancelled' ? (i.amount || 0) : 0), 0)

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    try {
      await db.insert('user_income', {
        user_id: user.id,
        type: form.type,
        description: form.description.trim(),
        amount: parseFloat(form.amount) || 0,
        date: form.date || new Date().toISOString().split('T')[0],
        event_id: form.event_id || null,
        notes: form.notes.trim() || null,
        status: 'pending',
      })
      onToast('Revenu ajout\u00e9')
      setForm({ type: 'cachet', description: '', amount: '', date: new Date().toISOString().split('T')[0], event_id: '', notes: '' })
      setShowAdd(false)
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#7C3AED')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (item) => {
    const next = item.status === 'pending' ? 'paid' : item.status === 'paid' ? 'pending' : item.status
    try {
      await db.update('user_income', `id=eq.${item.id}`, { status: next })
      onToast(next === 'paid' ? 'Marqu\u00e9 pay\u00e9' : 'Marqu\u00e9 en attente')
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#7C3AED')
    }
  }

  const deleteIncome = async (id) => {
    try {
      await db.delete('user_income', `id=eq.${id}`)
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
            <div style={{ fontSize: 20, fontWeight: 600, color: '#16A34A' }}>{Math.round(totalEarned)}\u20ac</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Encaiss\u00e9</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#D97706' }}>{Math.round(totalPending)}\u20ac</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>En attente</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#7C3AED' }}>{Math.round(totalAll)}\u20ac</div>
            <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Total</div>
          </div>
        </div>
      </div>

      {/* Progress bar earned vs pending */}
      {totalAll > 0 && (
        <div className="card" style={{ padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ height: 8, borderRadius: 4, background: '#E2E8F0', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${Math.round((totalEarned / totalAll) * 100)}%`,
              background: 'linear-gradient(90deg, #16A34A, #4A9A7A)',
              borderRadius: 4, transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, textAlign: 'center' }}>
            {Math.round((totalEarned / totalAll) * 100)}% encaiss\u00e9
          </div>
        </div>
      )}

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: showAdd ? '#E2E8F0' : '#16A34A', color: showAdd ? '#94A3B8' : 'white',
          cursor: 'pointer', border: 'none',
        }}>{showAdd ? 'Annuler' : '+ Ajouter un revenu'}</button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 12 }}>Nouveau revenu</div>
          <div style={{ marginBottom: 12 }}>
            <label className="label">Type</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(INCOME_TYPES).map(([k, v]) => (
                <button key={k} onClick={() => set('type', k)} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  background: form.type === k ? `${v.color}15` : 'white',
                  color: form.type === k ? v.color : '#94A3B8',
                  border: `1px solid ${form.type === k ? v.color + '40' : '#E2E8F0'}`,
                }}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          <Field label="Description" value={form.description} onChange={v => set('description', v)} placeholder="ex: Cachet concert Triple 8" />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Field label="Montant (\u20ac)" value={form.amount} onChange={v => set('amount', v.replace(/[^0-9.]/g, ''))} inputMode="decimal" /></div>
            <div style={{ flex: 1 }}><Field label="Date" value={form.date} onChange={v => set('date', v)} type="date" /></div>
          </div>
          {(events || []).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label className="label">Concert associ\u00e9 (optionnel)</label>
              <select className="input" value={form.event_id} onChange={e => set('event_id', e.target.value)}>
                <option value="">\u2014 Aucun \u2014</option>
                {(events || []).sort((a, b) => a.date.localeCompare(b.date)).map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {parseDate(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} \u2014 {ev.name || ev.lieu}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Field label="Notes" value={form.notes} onChange={v => set('notes', v)} placeholder="Optionnel" />
          <button onClick={handleSave} disabled={!form.description.trim() || !form.amount || saving} className="btn-primary">
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      )}

      {/* Income list */}
      {sortedIncome.length === 0 && !showAdd ? (
        <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>Aucun revenu enregistr\u00e9</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Ajoute tes cachets, factures et remboursements</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedIncome.map(item => {
            const tp = INCOME_TYPES[item.type] || INCOME_TYPES.autre
            const st = INCOME_STATUS[item.status] || INCOME_STATUS.pending
            const ev = item.event_id ? (events || []).find(e => e.id === item.event_id) : null
            return (
              <div key={item.id} className="card" style={{
                padding: '12px 14px',
                borderLeft: `4px solid ${st.color}`,
                opacity: item.status === 'cancelled' ? 0.4 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${tp.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>{tp.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description}
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>
                      {tp.label} \u00b7 {item.date ? parseDate(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                      {ev ? ` \u00b7 ${ev.name || ev.lieu}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: st.color }}>{item.amount}\u20ac</div>
                    <button onClick={() => toggleStatus(item)} style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                      background: `${st.color}15`, color: st.color, border: 'none', cursor: 'pointer',
                    }}>{st.label}</button>
                  </div>
                  <button onClick={() => deleteIncome(item.id)} style={{
                    width: 24, height: 24, borderRadius: 6, background: '#7C3AED10',
                    border: 'none', color: '#7C3AED', fontSize: 11, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>\u00d7</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
