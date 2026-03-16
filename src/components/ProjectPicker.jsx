import React, { useState, useEffect } from 'react'
import { db } from '../lib/supabase'

const ALL_MODULES = ['dashboard', 'equipe', 'articles', 'depots', 'stock', 'tournee', 'alertes', 'finance', 'forecast']

export default function ProjectPicker({ userId, onProjectSelected, onToast }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [userId])

  const loadProjects = async () => {
    setLoading(true)
    try {
      // Get all project memberships for this user
      const memberships = await db.get('project_members', `user_id=eq.${userId}&status=neq.disabled`)
      if (!memberships || memberships.length === 0) {
        // No memberships — auto-create one for default org
        try {
          await db.insert('project_members', {
            user_id: userId,
            org_id: '00000000-0000-0000-0000-000000000001',
            module_access: ['dashboard', 'equipe', 'articles', 'depots', 'stock', 'tournee', 'alertes'],
            is_admin: false,
            status: 'active',
          })
        } catch {}
        // Reload
        const retry = await db.get('project_members', `user_id=eq.${userId}&status=neq.disabled`)
        await enrichWithOrgs(retry || [])
      } else {
        await enrichWithOrgs(memberships)
      }
    } catch (e) {
      onToast('Erreur: ' + e.message, '#8B1A2B')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const enrichWithOrgs = async (memberships) => {
    // Get all org details
    try {
      const orgs = await db.get('organizations')
      const orgMap = {}
      ;(orgs || []).forEach(o => { orgMap[o.id] = o })
      const enriched = memberships.map(m => ({
        ...m,
        org: orgMap[m.org_id] || { name: 'Projet', slug: 'default' },
      }))
      setProjects(enriched)

      // Auto-select if only one project
      if (enriched.length === 1) {
        onProjectSelected(enriched[0])
      }
    } catch {
      setProjects(memberships.map(m => ({ ...m, org: { name: 'Projet', slug: 'default' } })))
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
        background: 'linear-gradient(180deg, #080808 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
      }}>
        <div className="loader" />
        <div style={{ color: '#6B6058', fontSize: 13 }}>Chargement des projets...</div>
      </div>
    )
  }

  // If auto-selected (1 project), show nothing (will redirect)
  if (projects.length === 1) return null

  return (
    <div style={{
      minHeight: '100vh', padding: '24px 16px',
      background: 'linear-gradient(180deg, #080808 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'linear-gradient(135deg, #C8A46A, #A8883D)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, boxShadow: '0 6px 24px rgba(232,115,90,0.25)',
          marginBottom: 14,
        }}>🎪</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#C8A46A', marginBottom: 4 }}>
          STAGE STOCK
        </div>
        <div style={{ fontSize: 14, color: '#8A7D75', fontWeight: 600 }}>
          Sélectionne un projet
        </div>
      </div>

      {/* Project list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400, margin: '0 auto' }}>
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => onProjectSelected(p)}
            style={{
              padding: '20px 18px', borderRadius: 18, textAlign: 'left',
              background: 'white', cursor: 'pointer',
              border: '2px solid #1a1a1a',
              boxShadow: '0 2px 12px rgba(180,150,130,0.08)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #C8A46A15, #9B7DC415)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                {p.org.logo || '🎪'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#F0ECE2' }}>
                  {p.org.name}
                </div>
                <div style={{ fontSize: 12, color: '#8A7D75', marginTop: 2 }}>
                  {p.is_admin ? '👑 Admin' : '👤 Membre'}
                  {p.role_id && ' — '}
                  {p.status === 'invited' && (
                    <span style={{ color: '#C8A46A', fontWeight: 700 }}>Invitation en attente</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 18, color: '#6B6058' }}>→</div>
            </div>
          </button>
        ))}
      </div>

      {/* Create project */}
      {!showCreate ? (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '12px 24px', borderRadius: 14, fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(135deg, #C8A46A, #8B1A2B)',
            color: 'white', cursor: 'pointer', border: 'none',
            boxShadow: '0 4px 16px rgba(232,115,90,0.2)',
          }}>
            + Créer un nouveau projet
          </button>
        </div>
      ) : (
        <CreateProjectForm
          userId={userId}
          onCreated={() => loadProjects()}
          onCancel={() => setShowCreate(false)}
          onToast={onToast}
        />
      )}
    </div>
  )
}

// ─── Create Project Form ───
function CreateProjectForm({ userId, onCreated, onCancel, onToast }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)

  const generateSlug = (val) => {
    setName(val)
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 30))
  }

  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      // 1. Create org
      const orgs = await db.insert('organizations', {
        name: name.trim(),
        slug: slug || 'project',
      })
      if (!orgs || !orgs[0] || !orgs[0].id) {
        throw new Error('La création du projet a échoué — vérifie que la policy org_insert existe dans Supabase')
      }
      const org = orgs[0]

      // 2. Create membership as admin with all modules
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
      const msg = e.message || 'Erreur inconnue'
      setError(msg)
      onToast('Erreur: ' + msg, '#8B1A2B')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '24px auto 0', padding: '20px', background: 'white', borderRadius: 18, border: '2px solid #C8A46A30', boxShadow: '0 4px 20px rgba(232,115,90,0.1)' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#F0ECE2', marginBottom: 16, textAlign: 'center' }}>
        Nouveau projet
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#8A7D75', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Nom du projet *</label>
        <input
          className="input"
          value={name}
          onChange={e => generateSlug(e.target.value)}
          placeholder="Ma tournée 2026"
          autoFocus
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#8A7D75', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Identifiant</label>
        <input
          className="input"
          value={slug}
          onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="ma-tournee-2026"
          style={{ fontSize: 12, color: '#6B6058' }}
        />
      </div>
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 12,
          background: '#FFF0F0', border: '1px solid #8B1A2B40',
          fontSize: 12, color: '#8B1A2B', fontWeight: 600, lineHeight: 1.4,
        }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '12px', borderRadius: 14, fontSize: 13, fontWeight: 700,
          background: '#1a1a1a', color: '#8A7D75', cursor: 'pointer', border: 'none',
        }}>Annuler</button>
        <button onClick={handleCreate} disabled={!name.trim() || saving} style={{
          flex: 2, padding: '12px', borderRadius: 14, fontSize: 13, fontWeight: 800,
          background: !name.trim() || saving ? '#222222' : 'linear-gradient(135deg, #C8A46A, #8B1A2B)',
          color: 'white', cursor: !name.trim() || saving ? 'default' : 'pointer', border: 'none',
        }}>{saving ? '⏳ Création...' : 'Créer le projet'}</button>
      </div>
    </div>
  )
}
