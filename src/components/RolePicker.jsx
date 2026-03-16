import React, { useState } from 'react'
import { db } from '../lib/supabase'
import {
  Target, Clapperboard, Volume2, Lightbulb, Guitar, Drama,
  Settings, Shirt, Truck, Shield, Mic, ClipboardList, Check, Loader2,
} from 'lucide-react'

// Design tokens
const colors = {
  accent: '#6366F1',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  bgSurface: '#F8FAFC',
  bgHover: '#F1F5F9',
  border: '#E2E8F0',
}

// Role display config — shared with PackingList
export const ROLE_CONF = {
  TM:   { label: 'Tour Manager',        icon: Target,        color: '#6366F1' },
  PM:   { label: 'Chef de Production',   icon: Clapperboard,  color: '#8B5CF6' },
  SE:   { label: 'Ingé Son',             icon: Volume2,       color: '#2563EB' },
  LD:   { label: 'Régisseur Lumière',    icon: Lightbulb,     color: '#D97706' },
  BL:   { label: 'Backline',             icon: Guitar,        color: '#DC2626' },
  SM:   { label: 'Régisseur Scène',      icon: Drama,         color: '#10B981' },
  TD:   { label: 'Directeur Technique',  icon: Settings,      color: '#14B8A6' },
  MM:   { label: 'Merch Manager',        icon: Shirt,         color: '#EC4899' },
  LOG:  { label: 'Logistique',           icon: Truck,         color: '#2563EB' },
  SAFE: { label: 'Sécurité',             icon: Shield,        color: '#DC2626' },
  AA:   { label: 'Assistant Artiste',    icon: Mic,           color: '#8B5CF6' },
  PA:   { label: 'Assistant Production', icon: ClipboardList, color: '#10B981' },
}

const DEFAULT_CONF = { icon: ClipboardList, color: colors.textTertiary }

export default function RolePicker({ roles, userId, orgId, onRoleSelected, onToast }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await db.upsert('user_profiles', {
        user_id: userId,
        role_id: selected.id,
        org_id: orgId,
      })
    } catch (e1) {
      try {
        const existing = await db.get('user_profiles', `user_id=eq.${userId}`)
        if (existing && existing.length > 0) {
          await db.update('user_profiles', `user_id=eq.${userId}`, { role_id: selected.id })
        } else {
          await db.insert('user_profiles', { user_id: userId, role_id: selected.id, org_id: orgId })
        }
      } catch (e2) {
        onToast('Erreur: ' + e2.message, '#DC2626')
        setSaving(false)
        return
      }
    }
    onRoleSelected(selected)
    setSaving(false)
  }

  const roleOrder = ['TM', 'PM', 'SE', 'LD', 'BL', 'SM', 'TD', 'MM', 'LOG', 'SAFE', 'AA', 'PA']
  const sortedRoles = [...roles].sort((a, b) => {
    const ai = roleOrder.indexOf(a.code)
    const bi = roleOrder.indexOf(b.code)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const selectedConf = selected ? (ROLE_CONF[selected.code] || DEFAULT_CONF) : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#FFFFFF',
      overflowY: 'auto', padding: '24px 16px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 8,
          background: colors.bgSurface,
          border: `1px solid ${colors.border}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>
          <Target size={28} color={colors.accent} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary, marginBottom: 4 }}>
          Bienvenue sur Stage Stock
        </div>
        <div style={{ fontSize: 14, color: colors.textSecondary, fontWeight: 500, lineHeight: 1.5 }}>
          Choisis ton rôle dans l'équipe pour personnaliser ton expérience
        </div>
      </div>

      {/* Role Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10, marginBottom: 24,
      }}>
        {sortedRoles.map(role => {
          const conf = ROLE_CONF[role.code] || { ...DEFAULT_CONF, label: role.name }
          const IconComponent = conf.icon
          const isSelected = selected?.id === role.id
          const isAdmin = role.code === 'TM' || role.code === 'PM'
          return (
            <button key={role.id} onClick={() => setSelected(role)} style={{
              padding: '16px 12px', borderRadius: 12, textAlign: 'center',
              background: isSelected ? `${conf.color}14` : colors.bgSurface,
              border: `1px solid ${isSelected ? conf.color : colors.border}`,
              cursor: 'pointer', transition: 'all 0.15s ease',
              position: 'relative', overflow: 'hidden',
            }}>
              {isAdmin && (
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  fontSize: 9, fontWeight: 700, color: colors.textPrimary,
                  background: conf.color, borderRadius: 4,
                  padding: '2px 6px', letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}>Admin</div>
              )}
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                <IconComponent size={28} color={isSelected ? conf.color : colors.textTertiary} />
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: isSelected ? colors.textPrimary : colors.textSecondary,
                marginBottom: 4,
              }}>{conf.label}</div>
              <div style={{
                fontSize: 11, color: colors.textTertiary, lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>{role.description}</div>
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  width: 20, height: 20, borderRadius: 6,
                  background: conf.color, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Confirm button */}
      <div style={{ position: 'sticky', bottom: 0, padding: '16px 0', background: 'linear-gradient(transparent, #FFFFFF 30%)' }}>
        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          style={{
            width: '100%', padding: 14, borderRadius: 8,
            background: selected ? (selectedConf?.color || colors.accent) : colors.bgSurface,
            color: colors.textPrimary, fontSize: 15, fontWeight: 600,
            cursor: selected && !saving ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease', border: 'none',
            opacity: saving ? 0.6 : selected ? 1 : 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          {saving
            ? 'Enregistrement...'
            : selected
              ? `Continuer en tant que ${ROLE_CONF[selected.code]?.label || selected.name}`
              : 'Sélectionne ton rôle'}
        </button>
      </div>
    </div>
  )
}
