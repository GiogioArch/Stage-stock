import React, { useState, useCallback } from 'react'
import { db, safe } from '../lib/supabase'
import { ROLE_CONF } from './RolePicker'
import { useApp } from '../contexts/AppContext'
import IdentityTab from './profile/IdentityTab'
import ProTab from './profile/ProTab'
import ProjectsTab from './profile/ProjectsTab'
import GearTab from './profile/GearTab'
import CalendarTab from './profile/CalendarTab'
import FinancesTab from './profile/FinancesTab'

const TABS = [
  { id: 'identity', label: 'Identit\u00e9' },
  { id: 'pro', label: 'Pro' },
  { id: 'projects', label: 'Projets' },
  { id: 'gear', label: 'Mat\u00e9riel' },
  { id: 'calendar', label: 'Calendrier' },
  { id: 'finances', label: 'Finances' },
]

export default function ProfilePage({
  user: userProp, userProfile: userProfileProp, userRole: userRoleProp, userDetails: initialDetails,
  membership: membershipProp, selectedOrg: selectedOrgProp, allProjects, roles,
  userGear, userAvailability, userIncome, allEvents,
  onClose, onToast: onToastProp, onReload: onReloadProp, onLogout, onSwitchProject, onOpenProject,
}) {
  // Context with prop fallback for backward compatibility
  const app = useApp()
  const user = userProp || app.user
  const userProfile = userProfileProp !== undefined ? userProfileProp : app.userProfile
  const userRole = userRoleProp !== undefined ? userRoleProp : app.userRole
  const membership = membershipProp !== undefined ? membershipProp : app.membership
  const selectedOrg = selectedOrgProp !== undefined ? selectedOrgProp : app.selectedOrg
  const onToast = onToastProp || app.showToast
  const onReload = onReloadProp || app.loadAll
  const [tab, setTab] = useState('identity')
  const [editing, setEditing] = useState(!initialDetails)
  const [details, setDetails] = useState(initialDetails || { account_type: 'physical' })
  const [form, setForm] = useState({ ...details })
  const [saving, setSaving] = useState(false)
  const [showIban, setShowIban] = useState(false)
  const [showSS, setShowSS] = useState(false)

  const roleConf = userRole ? (ROLE_CONF[userRole.code] || { icon: '', color: '#94A3B8', label: userRole.name }) : null
  const isPhysical = (editing ? form.account_type : details.account_type) !== 'legal'

  const set = useCallback((key, val) => setForm(prev => ({ ...prev, [key]: val })), [])

  // ─── Save ───
  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        user_id: user.id,
        siret: (form.siret || '').replace(/[^0-9]/g, ''),
        siren: isPhysical ? form.siren : (form.siret || '').replace(/[^0-9]/g, '').slice(0, 9),
        profile_completed: true,
        updated_at: new Date().toISOString(),
      }
      delete payload.id
      delete payload.created_at

      if (details.id) {
        await db.update('user_details', `id=eq.${details.id}`, payload)
      } else {
        await db.upsert('user_details', payload)
      }

      const [refreshed] = await safe('user_details', `user_id=eq.${user.id}`)
      if (refreshed) {
        setDetails(refreshed)
        setForm({ ...refreshed })
      }
      setEditing(false)
      onToast('Profil enregistr\u00e9')
      if (onReload) onReload()
    } catch (e) {
      onToast('Erreur : ' + e.message, '#7C3AED')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = () => {
    setForm({ ...details })
    setEditing(true)
  }
  const cancelEdit = () => {
    if (details.id) {
      setForm({ ...details })
      setEditing(false)
    }
  }

  // inline = rendered as a tab (no fixed overlay)
  const inline = !selectedOrg && !membership

  // ─── Render ───
  return (
    <div style={inline ? {} : {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'linear-gradient(180deg, #FFF8F0 0%, #F8FAFC 30%, #F8FAFC 70%, #F8FAFC 100%)',
      overflow: 'auto',
    }}>
      {/* Header — only show back button when overlay */}
      {!inline && (
        <header style={{
          padding: '16px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#94A3B8', cursor: 'pointer',
          }}>\u2190 Retour</button>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#7C3AED' }}>Mon profil</div>
          <div style={{ width: 80 }} />
        </header>
      )}

      {/* Avatar + name banner */}
      <div style={{ textAlign: 'center', padding: '20px 16px 8px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
          background: details.avatar_url ? `url(${details.avatar_url}) center/cover` : (roleConf ? `${roleConf.color}15` : '#E2E8F0'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, border: `3px solid ${roleConf?.color || '#E2E8F0'}40`,
        }}>
          {!details.avatar_url && (roleConf?.icon || '')}
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
          {isPhysical
            ? [details.first_name, details.last_name].filter(Boolean).join(' ') || details.stage_name || membership?.display_name || user.email
            : details.company_name || membership?.display_name || user.email
          }
        </div>
        <div style={{
          display: 'inline-block', marginTop: 6, padding: '3px 12px', borderRadius: 8,
          background: isPhysical ? '#7C3AED15' : '#2563EB15',
          color: isPhysical ? '#7C3AED' : '#2563EB',
          fontSize: 11, fontWeight: 600,
        }}>
          {isPhysical ? 'Personne physique' : 'Personne morale'}
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{user.email}</div>
      </div>

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
            background: tab === t.id ? '#7C3AED' : 'white',
            color: tab === t.id ? 'white' : '#94A3B8',
            border: `1px solid ${tab === t.id ? '#7C3AED' : '#E2E8F0'}`,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px 120px' }}>
        {tab === 'identity' && (
          <IdentityTab
            form={form} details={details} editing={editing} isPhysical={isPhysical}
            set={set} onSave={handleSave} onEdit={startEdit} onCancel={cancelEdit} saving={saving}
          />
        )}
        {tab === 'pro' && (
          <ProTab
            form={form} details={details} editing={editing} isPhysical={isPhysical}
            set={set} onSave={handleSave} onEdit={startEdit} onCancel={cancelEdit} saving={saving}
            showIban={showIban} setShowIban={setShowIban}
            showSS={showSS} setShowSS={setShowSS}
          />
        )}
        {tab === 'projects' && (
          <ProjectsTab
            user={user} membership={membership} selectedOrg={selectedOrg}
            allProjects={allProjects || []} roles={roles}
            onSwitchProject={onSwitchProject} onOpenProject={onOpenProject}
          />
        )}
        {tab === 'gear' && (
          <GearTab user={user} gear={userGear || []} onToast={onToast} onReload={onReload} />
        )}
        {tab === 'calendar' && (
          <CalendarTab user={user} events={allEvents || []} availability={userAvailability || []} onToast={onToast} onReload={onReload} />
        )}
        {tab === 'finances' && (
          <FinancesTab user={user} income={userIncome || []} events={allEvents || []} onToast={onToast} onReload={onReload} />
        )}
      </div>

      {/* Bottom actions — only in overlay mode */}
      {!inline && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '12px 16px', display: 'flex', gap: 8,
          background: 'linear-gradient(180deg, transparent 0%, #FFF8F0 30%)',
          paddingTop: 24,
        }}>
          <button onClick={onSwitchProject} style={{
            flex: 1, padding: '12px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: '#EEF4FA', border: '1px solid #2563EB30', color: '#2563EB', cursor: 'pointer',
          }}> Changer projet</button>
          <button onClick={() => { onClose(); onLogout() }} style={{
            flex: 1, padding: '12px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: '#FDF0F4', border: '1px solid #7C3AED30', color: '#7C3AED', cursor: 'pointer',
          }}> D\u00e9connexion</button>
        </div>
      )}
    </div>
  )
}
