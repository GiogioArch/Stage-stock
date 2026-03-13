import React, { useState } from 'react'
import { db } from '../lib/supabase'
import { ROLE_CONF } from './RolePicker'

const ALL_MODULES = ['dashboard', 'equipe', 'articles', 'depots', 'stock', 'tournee', 'alertes', 'finance', 'forecast']

export default function MyProjects({ userId, allProjects, onOpenProject, onProjectsChanged, onToast }) {
  const [showCreate, setShowCreate] = useState(false)

  const active = allProjects.filter(p => p.status !== 'archived')
  const archived = allProjects.filter(p => p.status === 'archived')

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#3D3042' }}>Mes projets</div>
        <div style={{ fontSize: 12, color: '#9A8B94', marginTop: 2 }}>
          {active.length} actif{active.length > 1 ? 's' : ''}
          {archived.length > 0 && ` — ${archived.length} archivé${archived.length > 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Active projects */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {active.map(p => (
          <ProjectRow
            key={p.id}
            project={p}
            onOpen={() => onOpenProject(p)}
          />
        ))}
      </div>

      {/* Archived */}
      {archived.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#9A8B94', marginBottom: 10, padding: '0 2px' }}>
            Archivés
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, opacity: 0.6 }}>
            {archived.map(p => (
              <ProjectRow key={p.id} project={p} onOpen={() => onOpenProject(p)} />
            ))}
          </div>
        </>
      )}

      {/* Create / Join */}
      {!showCreate ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ flex: 1 }}>
            + Créer un projet
          </button>
        </div>
      ) : (
        <CreateProjectForm
          userId={userId}
          onCreated={() => { setShowCreate(false); onProjectsChanged() }}
          onCancel={() => setShowCreate(false)}
          onToast={onToast}
        />
      )}
    </div>
  )
}

function ProjectRow({ project, onOpen }) {
  const roleConf = project.role_code ? ROLE_CONF[project.role_code] : null
  const statusColors = {
    active: { bg: '#5DAB8B15', color: '#5DAB8B', label: 'Actif' },
    invited: { bg: '#E8935A15', color: '#E8935A', label: 'Invitation' },
    archived: { bg: '#9A8B9415', color: '#9A8B94', label: 'Archivé' },
  }
  const st = statusColors[project.status] || statusColors.active

  return (
    <button onClick={onOpen} className="card" style={{
      width: '100%', padding: '18px 16px', textAlign: 'left', cursor: 'pointer',
      borderLeft: `4px solid ${roleConf?.color || '#E8735A'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 50, height: 50, borderRadius: 16,
          background: `linear-gradient(135deg, ${roleConf?.color || '#E8735A'}15, ${roleConf?.color || '#E8735A'}08)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        }}>{project.org?.logo || '🎪'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#3D3042' }}>{project.org?.name || 'Projet'}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
              background: st.bg, color: st.color,
            }}>{st.label}</span>
            {project.is_admin && (
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800, background: '#E8735A15', color: '#E8735A' }}>Admin</span>
            )}
            {roleConf && (
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800, background: `${roleConf.color}15`, color: roleConf.color }}>
                {roleConf.icon} {roleConf.label}
              </span>
            )}
          </div>
          {project.created_at && (
            <div style={{ fontSize: 10, color: '#B8A0AE', marginTop: 4 }}>
              Membre depuis {new Date(project.created_at).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
        <div style={{ fontSize: 20, color: '#B8A0AE' }}>→</div>
      </div>
    </button>
  )
}

function CreateProjectForm({ userId, onCreated, onCancel, onToast }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)

  const generateSlug = (val) => {
    setName(val)
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 30))
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const orgs = await db.insert('organizations', {
        name: name.trim(),
        slug: slug || 'project',
      })
      const org = orgs[0]
      await db.insert('project_members', {
        user_id: userId,
        org_id: org.id,
        module_access: ALL_MODULES,
        is_admin: true,
        status: 'active',
      })
      onToast('Projet créé !')
      onCreated()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 20, border: '2px solid #E8735A30' }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#3D3042', marginBottom: 16, textAlign: 'center' }}>
        Nouveau projet
      </div>
      <div style={{ marginBottom: 14 }}>
        <label className="label">Nom du projet *</label>
        <input className="input" value={name} onChange={e => generateSlug(e.target.value)} placeholder="Ma tournée 2026" autoFocus />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label className="label">Identifiant</label>
        <input className="input" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="ma-tournee-2026" style={{ fontSize: 12, color: '#B8A0AE' }} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: 12, borderRadius: 14, fontSize: 13, fontWeight: 700,
          background: '#F0E8E4', color: '#9A8B94', cursor: 'pointer', border: 'none',
        }}>Annuler</button>
        <button onClick={handleCreate} disabled={!name.trim() || saving} className="btn-primary" style={{ flex: 2 }}>
          {saving ? '⏳ Création...' : 'Créer'}
        </button>
      </div>
    </div>
  )
}
