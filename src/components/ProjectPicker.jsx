import React, { useState, useEffect } from 'react'
import { db } from '../lib/supabase'

export default function ProjectPicker({ userId, onProjectSelected, onToast }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

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
      onToast('Erreur: ' + e.message, '#D4648A')
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
        background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
      }}>
        <div className="loader" />
        <div style={{ color: '#B8A0AE', fontSize: 13 }}>Chargement des projets...</div>
      </div>
    )
  }

  // If auto-selected (1 project), show nothing (will redirect)
  if (projects.length === 1) return null

  return (
    <div style={{
      minHeight: '100vh', padding: '24px 16px',
      background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'linear-gradient(135deg, #F7A072, #E8735A)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, boxShadow: '0 6px 24px rgba(232,115,90,0.25)',
          marginBottom: 14,
        }}>🎪</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#E8735A', marginBottom: 4 }}>
          STAGE STOCK
        </div>
        <div style={{ fontSize: 14, color: '#9A8B94', fontWeight: 600 }}>
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
              border: '2px solid #F0E8E4',
              boxShadow: '0 2px 12px rgba(180,150,130,0.08)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #E8735A15, #9B7DC415)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                {p.org.logo || '🎪'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#3D3042' }}>
                  {p.org.name}
                </div>
                <div style={{ fontSize: 12, color: '#9A8B94', marginTop: 2 }}>
                  {p.is_admin ? '👑 Admin' : '👤 Membre'}
                  {p.role_id && ' — '}
                  {p.status === 'invited' && (
                    <span style={{ color: '#E8935A', fontWeight: 700 }}>Invitation en attente</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 18, color: '#B8A0AE' }}>→</div>
            </div>
          </button>
        ))}
      </div>

      {/* Create project button (future) */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button style={{
          padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: 'transparent', border: '1.5px dashed #E8DED8',
          color: '#B8A0AE', cursor: 'pointer',
        }}>
          + Créer un nouveau projet
        </button>
      </div>
    </div>
  )
}
