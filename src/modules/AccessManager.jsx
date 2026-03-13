import React, { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'
import { ROLE_CONF } from '../components/RolePicker'
import { MODULES } from './registry'
import { Modal } from '../components/UI'

export default function AccessManager({ membership, roles, userProfiles, onReload, onToast }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingMember, setEditingMember] = useState(null)
  const [inviteMode, setInviteMode] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  const isAdmin = membership?.is_admin

  useEffect(() => {
    loadMembers()
  }, [membership])

  const loadMembers = async () => {
    if (!membership?.org_id) return
    setLoading(true)
    try {
      const data = await db.get('project_members', `org_id=eq.${membership.org_id}&order=created_at.asc`)
      setMembers(data || [])
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    } finally {
      setLoading(false)
    }
  }

  // ─── Invite new member ───
  const handleInvite = async () => {
    if (!inviteEmail.trim() || !isAdmin) return
    try {
      await db.insert('project_members', {
        user_id: '00000000-0000-0000-0000-000000000000', // placeholder until user logs in
        org_id: membership.org_id,
        email: inviteEmail.trim(),
        module_access: ['dashboard', 'equipe'],
        is_admin: false,
        status: 'invited',
        invited_by: membership.user_id,
      })
      onToast('Invitation envoyée')
      setInviteEmail('')
      setInviteMode(false)
      loadMembers()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  // ─── Update member modules ───
  const updateMemberModules = async (memberId, newModules) => {
    if (!isAdmin) return
    try {
      await db.update('project_members', `id=eq.${memberId}`, {
        module_access: newModules,
        updated_at: new Date().toISOString(),
      })
      onToast('Accès mis à jour')
      loadMembers()
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  // ─── Toggle admin ───
  const toggleAdmin = async (memberId, currentAdmin) => {
    if (!isAdmin) return
    try {
      await db.update('project_members', `id=eq.${memberId}`, {
        is_admin: !currentAdmin,
        updated_at: new Date().toISOString(),
      })
      onToast(!currentAdmin ? 'Promu admin' : 'Admin retiré')
      loadMembers()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  // ─── Update role ───
  const updateRole = async (memberId, roleId) => {
    if (!isAdmin) return
    try {
      await db.update('project_members', `id=eq.${memberId}`, {
        role_id: roleId || null,
        updated_at: new Date().toISOString(),
      })
      onToast('Rôle mis à jour')
      loadMembers()
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  // ─── Disable member ───
  const disableMember = async (memberId) => {
    if (!isAdmin) return
    try {
      await db.update('project_members', `id=eq.${memberId}`, { status: 'disabled' })
      onToast('Membre désactivé')
      loadMembers()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    }
  }

  const sortedModules = [...MODULES].sort((a, b) => a.order - b.order)

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Header */}
      <div className="card" style={{
        padding: '16px', marginBottom: 16,
        background: 'linear-gradient(135deg, #9B7DC408, #9B7DC418)',
        border: '1.5px solid #9B7DC425',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042' }}>
              Membres du projet
            </div>
            <div style={{ fontSize: 12, color: '#9A8B94' }}>
              {members.filter(m => m.status === 'active').length} actif(s) · {members.filter(m => m.status === 'invited').length} invité(s)
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setInviteMode(true)} style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
              background: '#9B7DC4', color: 'white', border: 'none', cursor: 'pointer',
            }}>
              + Inviter
            </button>
          )}
        </div>
      </div>

      {/* Not admin notice */}
      {!isAdmin && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 16,
          background: '#FEF3CD', border: '1.5px solid #F0D78C',
          fontSize: 12, color: '#856404', fontWeight: 600,
        }}>
          Seuls les admins peuvent modifier les accès
        </div>
      )}

      {/* Member list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="loader" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.filter(m => m.status !== 'disabled').map(m => {
            const role = roles.find(r => r.id === m.role_id)
            const roleConf = role ? (ROLE_CONF[role.code] || { icon: '📋', color: '#9A8B94', label: role.name }) : null
            const isMe = m.user_id === membership.user_id
            const moduleCount = (m.module_access || []).length

            return (
              <div key={m.id} className="card" style={{
                padding: '12px 14px',
                borderLeft: `3px solid ${roleConf?.color || '#E8DED8'}`,
                opacity: m.status === 'invited' ? 0.7 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: roleConf ? `${roleConf.color}20` : '#F0E8E4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: roleConf ? 18 : 14, fontWeight: 900,
                    color: roleConf?.color || '#9A8B94',
                  }}>
                    {roleConf ? roleConf.icon : (m.display_name || m.email || '?')[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {m.display_name || m.email || 'Membre'}
                      </span>
                      {isMe && (
                        <span style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 4,
                          background: '#5DAB8B20', color: '#5DAB8B', fontWeight: 800,
                        }}>MOI</span>
                      )}
                      {m.is_admin && (
                        <span style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 4,
                          background: '#E8735A20', color: '#E8735A', fontWeight: 800,
                        }}>ADMIN</span>
                      )}
                      {m.status === 'invited' && (
                        <span style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 4,
                          background: '#E8935A20', color: '#E8935A', fontWeight: 800,
                        }}>INVITÉ</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#9A8B94', marginTop: 1 }}>
                      {roleConf ? roleConf.label : 'Aucun rôle'}
                      {' · '}{moduleCount} module{moduleCount > 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Edit button */}
                  {isAdmin && (
                    <button onClick={() => setEditingMember(m)} style={{
                      padding: '6px 10px', borderRadius: 8, fontSize: 12,
                      background: '#F8F0FA', border: '1.5px solid #E8DED8',
                      color: '#9A8B94', cursor: 'pointer', fontWeight: 700,
                    }}>
                      Gérer
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Invite Modal ─── */}
      {inviteMode && (
        <Modal title="Inviter un membre" onClose={() => setInviteMode(false)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#9A8B94' }}>Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@exemple.com"
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: '1.5px solid #E8DED8', fontSize: 14, marginTop: 6,
              }}
            />
          </div>
          <button onClick={handleInvite} disabled={!inviteEmail.trim()} style={{
            width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 800,
            background: inviteEmail.trim() ? '#9B7DC4' : '#E8DED8',
            color: 'white', border: 'none', cursor: inviteEmail.trim() ? 'pointer' : 'not-allowed',
          }}>
            Envoyer l'invitation
          </button>
        </Modal>
      )}

      {/* ─── Edit Member Modal ─── */}
      {editingMember && (
        <MemberEditor
          member={editingMember}
          roles={roles}
          modules={sortedModules}
          onUpdateModules={(mods) => updateMemberModules(editingMember.id, mods)}
          onUpdateRole={(roleId) => updateRole(editingMember.id, roleId)}
          onToggleAdmin={() => toggleAdmin(editingMember.id, editingMember.is_admin)}
          onDisable={() => { disableMember(editingMember.id); setEditingMember(null) }}
          onClose={() => setEditingMember(null)}
        />
      )}
    </div>
  )
}

// ─── Member Editor Modal ───
function MemberEditor({ member, roles, modules, onUpdateModules, onUpdateRole, onToggleAdmin, onDisable, onClose }) {
  const [localModules, setLocalModules] = useState(member.module_access || [])
  const [localRoleId, setLocalRoleId] = useState(member.role_id || '')

  const toggleModule = (moduleId) => {
    const mod = modules.find(m => m.id === moduleId)
    if (mod?.alwaysActive) return
    setLocalModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const handleSave = () => {
    onUpdateModules(localModules)
    if (localRoleId !== (member.role_id || '')) {
      onUpdateRole(localRoleId || null)
    }
    onClose()
  }

  const role = roles.find(r => r.id === member.role_id)
  const roleConf = role ? (ROLE_CONF[role.code] || null) : null

  return (
    <Modal title="Gérer les accès" onClose={onClose}>
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Member info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
          padding: '12px 14px', borderRadius: 14, background: '#F8F0FA',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: roleConf ? `${roleConf.color}20` : '#E8DED8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            {roleConf ? roleConf.icon : '👤'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{member.display_name || member.email || 'Membre'}</div>
            <div style={{ fontSize: 11, color: '#9A8B94' }}>{member.email || ''}</div>
          </div>
        </div>

        {/* Role selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#9A8B94', marginBottom: 6, display: 'block' }}>
            Rôle métier
          </label>
          <select
            value={localRoleId}
            onChange={e => setLocalRoleId(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1.5px solid #E8DED8', fontSize: 13, background: 'white',
            }}
          >
            <option value="">Aucun rôle</option>
            {roles.map(r => {
              const rc = ROLE_CONF[r.code]
              return (
                <option key={r.id} value={r.id}>
                  {rc?.icon || ''} {rc?.label || r.name} ({r.code})
                </option>
              )
            })}
          </select>
        </div>

        {/* Admin toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderRadius: 12, background: '#FFF8F0',
          border: '1.5px solid #E8DED8', marginBottom: 16,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Administrateur</div>
            <div style={{ fontSize: 11, color: '#9A8B94' }}>Peut gérer les membres et les accès</div>
          </div>
          <button onClick={onToggleAdmin} style={{
            width: 44, height: 26, borderRadius: 13, cursor: 'pointer', border: 'none',
            background: member.is_admin ? '#5DAB8B' : '#E8DED8',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10, background: 'white',
              position: 'absolute', top: 3,
              left: member.is_admin ? 21 : 3,
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }} />
          </button>
        </div>

        {/* Module access */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#9A8B94', marginBottom: 8, display: 'block' }}>
            Accès aux modules
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {modules.map(mod => {
              const isActive = localModules.includes(mod.id)
              const isRequired = mod.alwaysActive
              return (
                <button
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  disabled={isRequired}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                    background: isActive ? `${mod.color}08` : 'white',
                    border: `1.5px solid ${isActive ? mod.color + '30' : '#F0E8E4'}`,
                    cursor: isRequired ? 'default' : 'pointer',
                    opacity: isRequired ? 0.6 : 1,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{mod.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? mod.color : '#9A8B94' }}>
                      {mod.name}
                    </div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${isActive ? mod.color : '#D8CDD2'}`,
                    background: isActive ? mod.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 12, fontWeight: 900,
                  }}>
                    {isActive ? '✓' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} style={{
            flex: 1, padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 800,
            background: '#9B7DC4', color: 'white', border: 'none', cursor: 'pointer',
          }}>
            Sauvegarder
          </button>
          <button onClick={onDisable} style={{
            padding: '14px 16px', borderRadius: 14, fontSize: 14, fontWeight: 800,
            background: '#FDF0F4', color: '#D4648A', border: '1.5px solid #D4648A30',
            cursor: 'pointer',
          }}>
            Désactiver
          </button>
        </div>
      </div>
    </Modal>
  )
}
