import React, { useState, createElement } from 'react'
import { db } from '../lib/supabase'
import {
  Target, Clapperboard, Volume2, Lightbulb, Guitar, Drama,
  Settings, Shirt, Truck, Shield, Mic, ClipboardList, Check, Loader2,
  ChevronDown, Users, Crown,
} from 'lucide-react'
import { useAuth, useProject, useToast } from '../shared/hooks'

// Design tokens
const colors = {
  accent: '#E8735A',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  bgSurface: '#F8FAFC',
  bgHover: '#F1F5F9',
  border: '#E2E8F0',
}

// Role display config — shared with PackingList
export const ROLE_CONF = {
  TM:   { label: 'Tour Manager',        icon: Target,        color: '#5B8DB8' },
  PM:   { label: 'Chef de Production',   icon: Clapperboard,  color: '#8B6DB8' },
  SE:   { label: 'Ingé Son',             icon: Volume2,       color: '#5B8DB8' },
  LD:   { label: 'Régisseur Lumière',    icon: Lightbulb,     color: '#E8935A' },
  BL:   { label: 'Backline',             icon: Guitar,        color: '#D4648A' },
  SM:   { label: 'Régisseur Scène',      icon: Drama,         color: '#5DAB8B' },
  TD:   { label: 'Directeur Technique',  icon: Settings,      color: '#14B8A6' },
  MM:   { label: 'Merch Manager',        icon: Shirt,         color: '#D4648A' },
  LOG:  { label: 'Logistique',           icon: Truck,         color: '#5B8DB8' },
  SAFE: { label: 'Sécurité',             icon: Shield,        color: '#D4648A' },
  AA:   { label: 'Assistant Artiste',    icon: Mic,           color: '#8B6DB8' },
  PA:   { label: 'Assistant Production', icon: ClipboardList, color: '#5DAB8B' },
}

const DEFAULT_CONF = { icon: ClipboardList, color: colors.textTertiary }

// ═══════════════════════════════════════════════
// HIÉRARCHIE DES RÔLES
// Un rôle senior hérite automatiquement des accès
// de tous ses sous-rôles (récursif)
// ═══════════════════════════════════════════════
export const ROLE_INHERITS = {
  // TM pilote TOUT — accès total
  TM:   ['PM', 'TD', 'SE', 'LD', 'SM', 'BL', 'MM', 'LOG', 'SAFE', 'AA', 'PA'],
  // PM pilote la technique + assistants
  PM:   ['TD', 'SE', 'LD', 'SM', 'BL', 'PA'],
  // TD (Régisseur Général / Directeur Technique) pilote son, lumière, scène, backline
  TD:   ['SE', 'LD', 'SM', 'BL'],
  // SM (Régisseur Scène) pilote le backline
  SM:   ['BL'],
  // SE collabore étroitement avec backline
  SE:   ['BL'],
  // Les autres n'héritent de personne
  LD:   [],
  BL:   [],
  MM:   [],
  LOG:  [],
  SAFE: [],
  AA:   [],
  PA:   [],
}

// Modules par rôle (accès de base pour chaque métier)
export const ROLE_MODULES = {
  TM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'finance', 'forecast', 'ventes', 'achats', 'inventaire', 'transport', 'timeline'],
  PM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'finance', 'forecast', 'achats', 'inventaire', 'timeline'],
  TD:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'inventaire', 'timeline'],
  SE:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'timeline'],
  LD:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'timeline'],
  SM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'timeline'],
  BL:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes'],
  MM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'ventes', 'forecast'],
  LOG:  ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'transport', 'inventaire'],
  SAFE: ['dashboard', 'equipe', 'tournee', 'alertes', 'timeline'],
  AA:   ['dashboard', 'equipe', 'tournee', 'alertes', 'timeline'],
  PA:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'achats', 'inventaire'],
}

// Calcule tous les modules accessibles = propres + hérités (récursif, sans doublons)
export function getInheritedModules(roleCode) {
  const visited = new Set()
  const modules = new Set()

  function collect(code) {
    if (visited.has(code)) return
    visited.add(code)
    // Ajouter les modules propres de ce rôle
    const own = ROLE_MODULES[code] || []
    own.forEach(m => modules.add(m))
    // Récurser sur les sous-rôles hérités
    const subs = ROLE_INHERITS[code] || []
    subs.forEach(sub => collect(sub))
  }

  collect(roleCode)
  return [...modules]
}

// Retourne la liste des sous-rôles directs + indirects
export function getInheritedRoles(roleCode) {
  const visited = new Set()
  function collect(code) {
    const subs = ROLE_INHERITS[code] || []
    subs.forEach(sub => {
      if (!visited.has(sub)) {
        visited.add(sub)
        collect(sub)
      }
    })
  }
  collect(roleCode)
  return [...visited]
}

// Niveau hiérarchique pour le tri
function getRoleLevel(code) {
  if (['TM', 'PM'].includes(code)) return 0     // Direction
  if (['TD', 'SE', 'LD', 'SM'].includes(code)) return 1  // Chefs techniques
  return 2  // Opérateurs
}

const LEVEL_LABELS = ['Direction', 'Chefs Techniques', 'Opérateurs']
const LEVEL_COLORS = ['#5B8DB8', '#14B8A6', '#E8935A']

export default function RolePicker({ roles, onRoleSelected }) {
  const { user } = useAuth()
  const { orgId } = useProject()
  const onToast = useToast()
  const userId = user?.id
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!selected) return
    setSaving(true)

    // Calculer les modules hérités
    const moduleAccess = getInheritedModules(selected.code)

    try {
      // 1. Sauvegarder le profil
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
        onToast('Erreur: ' + e2.message, '#D4648A')
        setSaving(false)
        return
      }
    }

    // 2. Mettre à jour module_access dans project_members
    try {
      const members = await db.get('project_members', `user_id=eq.${userId}&org_id=eq.${orgId}`)
      if (members && members.length > 0) {
        await db.update('project_members', `id=eq.${members[0].id}`, {
          role_id: selected.id,
          module_access: moduleAccess,
          updated_at: new Date().toISOString(),
        })
      }
    } catch (e) {
      // Non-bloquant : le module_access sera par défaut
      console.warn('module_access update failed:', e.message)
    }

    onRoleSelected(selected)
    setSaving(false)
  }

  // Tri par niveau hiérarchique puis par ordre alphabétique
  const roleOrder = ['TM', 'PM', 'TD', 'SE', 'LD', 'SM', 'BL', 'MM', 'LOG', 'SAFE', 'AA', 'PA']
  const sortedRoles = [...roles].sort((a, b) => {
    const ai = roleOrder.indexOf(a.code)
    const bi = roleOrder.indexOf(b.code)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  // Grouper par niveau
  const grouped = [
    { level: 0, label: 'Direction', color: '#5B8DB8', icon: Crown, roles: sortedRoles.filter(r => getRoleLevel(r.code) === 0) },
    { level: 1, label: 'Chefs Techniques', color: '#14B8A6', icon: Settings, roles: sortedRoles.filter(r => getRoleLevel(r.code) === 1) },
    { level: 2, label: 'Opérateurs', color: '#E8935A', icon: Users, roles: sortedRoles.filter(r => getRoleLevel(r.code) === 2) },
  ].filter(g => g.roles.length > 0)

  const selectedConf = selected ? (ROLE_CONF[selected.code] || DEFAULT_CONF) : null
  const inheritedRoles = selected ? getInheritedRoles(selected.code) : []

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#FFFFFF',
      overflowY: 'auto', padding: '24px 16px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
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
          Choisis ton rôle
        </div>
        <div style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 500, lineHeight: 1.5 }}>
          Un rôle senior débloque automatiquement l'accès aux postes qu'il supervise
        </div>
      </div>

      {/* Grouped Role Grid */}
      {grouped.map(group => (
        <div key={group.level} style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '0 2px',
          }}>
            {createElement(group.icon, { size: 14, color: group.color })}
            <span style={{ fontSize: 12, fontWeight: 700, color: group.color, textTransform: 'uppercase', letterSpacing: 1 }}>
              {group.label}
            </span>
            <div style={{ flex: 1, height: 1, background: `${group.color}20` }} />
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}>
            {group.roles.map(role => {
              const conf = ROLE_CONF[role.code] || { ...DEFAULT_CONF, label: role.name }
              const IconComponent = conf.icon
              const isSelected = selected?.id === role.id
              const isInherited = inheritedRoles.includes(role.code)
              const subCount = (ROLE_INHERITS[role.code] || []).length
              return (
                <button key={role.id} onClick={() => setSelected(role)} style={{
                  padding: '14px 10px', borderRadius: 12, textAlign: 'center',
                  background: isSelected ? `${conf.color}14` : isInherited ? `${conf.color}08` : colors.bgSurface,
                  border: `1.5px solid ${isSelected ? conf.color : isInherited ? `${conf.color}40` : colors.border}`,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  position: 'relative', overflow: 'hidden',
                  opacity: isInherited && !isSelected ? 0.75 : 1,
                }}>
                  {/* Badge hérité */}
                  {isInherited && !isSelected && (
                    <div style={{
                      position: 'absolute', top: 5, right: 5,
                      fontSize: 8, fontWeight: 700, color: 'white',
                      background: conf.color, borderRadius: 4,
                      padding: '2px 5px', letterSpacing: 0.3,
                    }}>inclus</div>
                  )}
                  {/* Badge nombre de sous-rôles */}
                  {subCount > 0 && !isInherited && (
                    <div style={{
                      position: 'absolute', top: 5, right: 5,
                      fontSize: 8, fontWeight: 700, color: conf.color,
                      background: `${conf.color}15`, borderRadius: 4,
                      padding: '2px 5px', letterSpacing: 0.3,
                    }}>+{subCount}</div>
                  )}
                  <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                    <IconComponent size={26} color={isSelected ? conf.color : isInherited ? conf.color : colors.textTertiary} />
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    color: isSelected || isInherited ? colors.textPrimary : colors.textSecondary,
                    marginBottom: 2, lineHeight: 1.3,
                  }}>{conf.label}</div>
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: 6, left: 6,
                      width: 18, height: 18, borderRadius: 6,
                      background: conf.color, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Inherited roles detail */}
      {selected && inheritedRoles.length > 0 && (
        <div style={{
          margin: '0 0 20px', padding: '14px 16px',
          background: `${selectedConf.color}08`,
          border: `1px solid ${selectedConf.color}25`,
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: selectedConf.color, marginBottom: 8 }}>
            {ROLE_CONF[selected.code]?.label} débloque automatiquement :
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {inheritedRoles.map(code => {
              const rc = ROLE_CONF[code]
              if (!rc) return null
              return (
                <div key={code} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 8,
                  background: 'white', border: `1px solid ${rc.color}30`,
                  fontSize: 11, fontWeight: 600, color: rc.color,
                }}>
                  {createElement(rc.icon, { size: 12 })}
                  {rc.label}
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 10, color: colors.textTertiary, marginTop: 8 }}>
            Tu verras les modules et données de ces postes en plus des tiens
          </div>
        </div>
      )}

      {/* Confirm button */}
      <div style={{ position: 'sticky', bottom: 0, padding: '16px 0', background: 'linear-gradient(transparent, #FFFFFF 30%)' }}>
        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          style={{
            width: '100%', padding: 14, borderRadius: 8,
            background: selected ? (selectedConf?.color || colors.accent) : colors.bgSurface,
            color: selected ? 'white' : colors.textTertiary,
            fontSize: 15, fontWeight: 600,
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
