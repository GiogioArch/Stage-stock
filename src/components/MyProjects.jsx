import React, { useState, createElement } from 'react'
import { db } from '../lib/supabase'
import { Pencil } from 'lucide-react'
import { ROLE_CONF } from './RolePicker'
import { useToast, useAuth } from '../shared/hooks'

const ALL_MODULES = ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'finance', 'forecast']

export default function MyProjects({ allProjects, onOpenProject, onProjectsChanged }) {
  const onToast = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deletingProject, setDeletingProject] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const active = allProjects.filter(p => p.status !== 'archived')
  const archived = allProjects.filter(p => p.status === 'archived')

  const handleDelete = async () => {
    if (!deletingProject) return
    setDeleting(true)
    try {
      const data = await db.rpc('delete_project_atomic', { p_org_id: deletingProject.org_id })
      if (data && !data.success) throw new Error(data.error)
      onToast('Projet supprimé')
      setDeletingProject(null)
      onProjectsChanged()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#8B6DB8')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#1E293B' }}>Mes projets</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
          {active.length} actif{active.length > 1 ? 's' : ''}
          {archived.length > 0 && ` — ${archived.length} archivé${archived.length > 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Edit project form */}
      {editingProject && (
        <EditProjectForm
          project={editingProject}
          onSaved={() => { setEditingProject(null); onProjectsChanged() }}
          onCancel={() => setEditingProject(null)}
        />
      )}

      {/* Delete confirmation */}
      {deletingProject && (
        <div className="card" style={{
          padding: 20, marginBottom: 14,
          border: '2px solid #8B6DB830', background: '#FDF0F4',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#8B6DB8', marginBottom: 8, textAlign: 'center' }}>
            Supprimer ce projet ?
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginBottom: 16, lineHeight: 1.5 }}>
            <strong>{deletingProject.org?.name}</strong><br />
            Cette action est irréversible. Toutes les données du projet seront perdues.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setDeletingProject(null)} style={{
              flex: 1, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: '#F1F5F9', color: '#94A3B8', cursor: 'pointer', border: '1px solid #E2E8F0',
            }}>Annuler</button>
            <button onClick={handleDelete} disabled={deleting} style={{
              flex: 1, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: '#8B6DB8', color: 'white', cursor: 'pointer', border: 'none',
              opacity: deleting ? 0.6 : 1,
            }}>{deleting ? 'Suppression...' : 'Supprimer'}</button>
          </div>
        </div>
      )}

      {/* Active projects */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {active.map(p => (
          <ProjectRow
            key={p.id}
            project={p}
            onOpen={() => onOpenProject(p)}
            onEdit={() => { setEditingProject(p); setDeletingProject(null) }}
            onDelete={() => { setDeletingProject(p); setEditingProject(null) }}
          />
        ))}
      </div>

      {/* Archived */}
      {archived.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 10, padding: '0 2px' }}>
            Archivés
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, opacity: 0.6 }}>
            {archived.map(p => (
              <ProjectRow
                key={p.id}
                project={p}
                onOpen={() => onOpenProject(p)}
                onEdit={() => { setEditingProject(p); setDeletingProject(null) }}
                onDelete={() => { setDeletingProject(p); setEditingProject(null) }}
              />
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
          onCreated={() => { setShowCreate(false); onProjectsChanged() }}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}

function ProjectRow({ project, onOpen, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)
  const roleConf = project.role_code ? ROLE_CONF[project.role_code] : null
  const statusColors = {
    active: { bg: '#5DAB8B15', color: '#5DAB8B', label: 'Actif' },
    invited: { bg: '#E8935A15', color: '#E8935A', label: 'Invitation' },
    archived: { bg: '#94A3B815', color: '#94A3B8', label: 'Archivé' },
  }
  const st = statusColors[project.status] || statusColors.active

  return (
    <div className="card" style={{
      padding: '18px 16px',
      borderLeft: `4px solid ${roleConf?.color || '#5B8DB8'}`,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onOpen} style={{
          display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0,
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(135deg, ${roleConf?.color || '#5B8DB8'}15, ${roleConf?.color || '#5B8DB8'}08)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          }}>{project.org?.logo || ''}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B' }}>{project.org?.name || 'Projet'}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                background: st.bg, color: st.color,
              }}>{st.label}</span>
              {project.is_admin && (
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, background: '#5B8DB815', color: '#5B8DB8' }}>Admin</span>
              )}
              {roleConf && (
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, background: `${roleConf.color}15`, color: roleConf.color }}>
                  {roleConf.icon && React.createElement(roleConf.icon, { size: 10 })} {roleConf.label}
                </span>
              )}
            </div>
            {project.created_at && (
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                Membre depuis {new Date(project.created_at).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>
        </button>

        {/* Menu button */}
        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }} style={{
          width: 32, height: 32, borderRadius: 8, fontSize: 16,
          background: showMenu ? '#E2E8F0' : 'transparent',
          border: 'none', cursor: 'pointer', color: '#94A3B8',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }} aria-label="Menu du projet">⋯</button>
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <div style={{
          position: 'absolute', top: 56, right: 16, zIndex: 10,
          background: '#F1F5F9', borderRadius: 12, padding: 6,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid #E2E8F0',
          minWidth: 140,
        }}>
          <button onClick={() => { setShowMenu(false); onEdit() }} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: 'none', border: 'none', cursor: 'pointer', color: '#1E293B',
          }}>
            {createElement(Pencil, { size: 14 })} Modifier
          </button>
          <button onClick={() => { setShowMenu(false); onDelete() }} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: 'none', border: 'none', cursor: 'pointer', color: '#8B6DB8',
          }}>
            <span></span> Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

function EditProjectForm({ project, onSaved, onCancel }) {
  const onToast = useToast()
  const [name, setName] = useState(project.org?.name || '')
  const [slug, setSlug] = useState(project.org?.slug || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await db.update('organizations', `id=eq.${project.org_id}`, {
        name: name.trim(),
        slug: slug || 'project',
      })
      onToast('Projet modifié')
      onSaved()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#8B6DB8')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 20, marginBottom: 14, border: '2px solid #5B8DB830' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 16, textAlign: 'center' }}>
        Modifier le projet
      </div>
      <div style={{ marginBottom: 14 }}>
        <label className="label">Nom du projet *</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label className="label">Identifiant</label>
        <input className="input" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          style={{ fontSize: 12, color: '#94A3B8' }} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700,
          background: '#E2E8F0', color: '#94A3B8', cursor: 'pointer', border: 'none',
        }}>Annuler</button>
        <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-primary" style={{ flex: 2 }}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

function CreateProjectForm({ onCreated, onCancel }) {
  const onToast = useToast()
  const { user } = useAuth()
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
        user_id: user?.id,
        org_id: org.id,
        module_access: ALL_MODULES,
        is_admin: true,
        status: 'active',
      })
      onToast('Projet créé !')
      onCreated()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#8B6DB8')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 20, border: '2px solid #5B8DB830' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 16, textAlign: 'center' }}>
        Nouveau projet
      </div>
      <div style={{ marginBottom: 14 }}>
        <label className="label">Nom du projet *</label>
        <input className="input" value={name} onChange={e => generateSlug(e.target.value)} placeholder="Ma tournée 2026" autoFocus />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label className="label">Identifiant</label>
        <input className="input" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="ma-tournee-2026" style={{ fontSize: 12, color: '#94A3B8' }} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700,
          background: '#E2E8F0', color: '#94A3B8', cursor: 'pointer', border: 'none',
        }}>Annuler</button>
        <button onClick={handleCreate} disabled={!name.trim() || saving} className="btn-primary" style={{ flex: 2 }}>
          {saving ? 'Création...' : 'Créer'}
        </button>
      </div>
    </div>
  )
}
