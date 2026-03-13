import React, { useState } from 'react'
import { db } from '../lib/supabase'

// Role display config — shared with PackingList
export const ROLE_CONF = {
  TM:   { icon: '🎯', color: '#E8735A', label: 'Tour Manager' },
  PM:   { icon: '🎬', color: '#9B7DC4', label: 'Chef de Production' },
  SE:   { icon: '🔊', color: '#5B8DB8', label: 'Ingé Son' },
  LD:   { icon: '💡', color: '#E8935A', label: 'Régisseur Lumière' },
  BL:   { icon: '🎸', color: '#D4648A', label: 'Backline' },
  SM:   { icon: '🎭', color: '#8BAB5D', label: 'Régisseur Scène' },
  TD:   { icon: '⚙️', color: '#5DAB8B', label: 'Directeur Technique' },
  MM:   { icon: '👕', color: '#E8735A', label: 'Merch Manager' },
  LOG:  { icon: '🚛', color: '#5B8DB8', label: 'Logistique' },
  SAFE: { icon: '🛡️', color: '#D4648A', label: 'Sécurité' },
  AA:   { icon: '🎤', color: '#9B7DC4', label: 'Assistant Artiste' },
  PA:   { icon: '📋', color: '#8BAB5D', label: 'Assistant Production' },
}

export default function RolePicker({ roles, userId, orgId, onRoleSelected, onToast }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!selected) return
    setSaving(true)
    try {
      // Try to upsert user_profiles with role_id
      await db.upsert('user_profiles', {
        user_id: userId,
        role_id: selected.id,
        org_id: orgId,
      })
    } catch (e1) {
      // If upsert fails, try insert then update approach
      try {
        // Check if profile exists
        const existing = await db.get('user_profiles', `user_id=eq.${userId}`)
        if (existing && existing.length > 0) {
          await db.update('user_profiles', `user_id=eq.${userId}`, { role_id: selected.id })
        } else {
          await db.insert('user_profiles', { user_id: userId, role_id: selected.id, org_id: orgId })
        }
      } catch (e2) {
        onToast('Erreur: ' + e2.message, '#D4648A')
        setSaving(false)
        return
      }
    }
    onRoleSelected(selected)
    setSaving(false)
  }

  // Sort roles in a logical order
  const roleOrder = ['TM', 'PM', 'SE', 'LD', 'BL', 'SM', 'TD', 'MM', 'LOG', 'SAFE', 'AA', 'PA']
  const sortedRoles = [...roles].sort((a, b) => {
    const ai = roleOrder.indexOf(a.code)
    const bi = roleOrder.indexOf(b.code)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
      overflowY: 'auto', padding: '24px 16px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'linear-gradient(135deg, #F7A072, #E8735A)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, boxShadow: '0 6px 24px rgba(232,115,90,0.25)',
          marginBottom: 14,
        }}>🎪</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#E8735A', marginBottom: 4 }}>
          Bienvenue sur Stage Stock
        </div>
        <div style={{ fontSize: 14, color: '#9A8B94', fontWeight: 600, lineHeight: 1.5 }}>
          Choisis ton rôle dans l'équipe pour personnaliser ton expérience
        </div>
      </div>

      {/* Role Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12, marginBottom: 24,
      }}>
        {sortedRoles.map(role => {
          const conf = ROLE_CONF[role.code] || { icon: '📋', color: '#9A8B94', label: role.name }
          const isSelected = selected?.id === role.id
          const isAdmin = role.code === 'TM' || role.code === 'PM'
          return (
            <button key={role.id} onClick={() => setSelected(role)} style={{
              padding: '18px 14px', borderRadius: 18, textAlign: 'center',
              background: isSelected ? `${conf.color}12` : 'white',
              border: `2px solid ${isSelected ? conf.color : '#F0E8E4'}`,
              boxShadow: isSelected
                ? `0 4px 16px ${conf.color}25`
                : '0 2px 12px rgba(180,150,130,0.08)',
              cursor: 'pointer', transition: 'all 0.2s',
              position: 'relative', overflow: 'hidden',
            }}>
              {isAdmin && (
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  fontSize: 8, fontWeight: 800, color: 'white',
                  background: conf.color, borderRadius: 6,
                  padding: '2px 6px', letterSpacing: 0.5,
                }}>ADMIN</div>
              )}
              <div style={{ fontSize: 32, marginBottom: 8 }}>{conf.icon}</div>
              <div style={{
                fontSize: 13, fontWeight: 800, color: isSelected ? conf.color : '#3D3042',
                marginBottom: 4,
              }}>{conf.label}</div>
              <div style={{
                fontSize: 10, color: '#B8A0AE', lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>{role.description}</div>
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  width: 22, height: 22, borderRadius: 7,
                  background: conf.color, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 900,
                }}>✓</div>
              )}
            </button>
          )
        })}
      </div>

      {/* Confirm button */}
      <div style={{ position: 'sticky', bottom: 0, padding: '16px 0', background: 'linear-gradient(transparent, #FEF0E8 30%)' }}>
        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          style={{
            width: '100%', padding: 16, borderRadius: 16,
            background: selected
              ? `linear-gradient(135deg, ${ROLE_CONF[selected.code]?.color || '#E8735A'}, ${ROLE_CONF[selected.code]?.color || '#E8735A'}CC)`
              : '#E8DED8',
            color: 'white', fontSize: 16, fontWeight: 800,
            cursor: selected && !saving ? 'pointer' : 'not-allowed',
            boxShadow: selected ? `0 6px 24px ${ROLE_CONF[selected.code]?.color || '#E8735A'}30` : 'none',
            transition: 'all 0.2s', border: 'none',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '⏳ Enregistrement...' : selected ? `Continuer en tant que ${ROLE_CONF[selected.code]?.label || selected.name}` : 'Sélectionne ton rôle'}
        </button>
      </div>
    </div>
  )
}
