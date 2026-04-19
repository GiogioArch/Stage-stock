import React from 'react'
import { ROLE_CONF } from '../RolePicker'

export default function ProjectsTab({ user, membership, selectedOrg, allProjects, roles, onSwitchProject, onOpenProject }) {
  const projects = allProjects || []

  return (
    <div>
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Aucun projet</div>
          <div style={{ fontSize: 12 }}>Rejoignez ou cr\u00e9ez un projet pour commencer</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map(p => {
            const isActive = selectedOrg?.id === p.org_id
            const roleConf = p.role_code ? ROLE_CONF[p.role_code] : null
            return (
              <button
                key={p.id}
                onClick={() => onOpenProject && onOpenProject(p)}
                className="card"
                style={{
                  width: '100%', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                  borderLeft: `4px solid ${isActive ? '#6366F1' : '#E2E8F0'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: isActive ? '#6366F110' : '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 600, color: isActive ? '#6366F1' : '#94A3B8',
                  }}>
                    {(p.org?.name || 'P')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
                      {p.org?.name || 'Projet'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {p.is_admin && (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#6366F110', color: '#6366F1' }}>Admin</span>
                      )}
                      {roleConf && (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: `${roleConf.color}10`, color: roleConf.color }}>
                          {roleConf.label}
                        </span>
                      )}
                      {isActive && (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#16A34A10', color: '#16A34A' }}>Actif</span>
                      )}
                    </div>
                    {p.created_at && (
                      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                        Membre depuis {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <button onClick={onSwitchProject} style={{
        width: '100%', padding: 14, borderRadius: 8, marginTop: 12,
        fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
        background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#6366F1',
      }}>+ Changer de projet / Cr\u00e9er un projet</button>
    </div>
  )
}
