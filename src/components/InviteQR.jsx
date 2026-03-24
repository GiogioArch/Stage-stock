import React, { useState, useEffect, useRef, useCallback } from 'react'
import { QrCode, Copy, Share2, RefreshCw, Check, Users, Link } from 'lucide-react'
import { db } from '../lib/supabase'
import { useToast } from '../shared/hooks'

const ACCENT = '#8B6DB8'
const ACCENT_BG = '#F0E8FE'

function generateToken(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  for (let i = 0; i < len; i++) result += chars[arr[i] % chars.length]
  return result
}

function getAppUrl() {
  return window.location.origin + window.location.pathname.replace(/\/$/, '')
}

export default function InviteQR({ membership, onClose }) {
  const onToast = useToast()
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [existingInvites, setExistingInvites] = useState([])
  const canvasRef = useRef(null)

  const inviteUrl = token ? `${getAppUrl()}?invite=${token}` : ''

  // Load existing active invites
  useEffect(() => {
    loadExistingInvites()
  }, [membership])

  const loadExistingInvites = async () => {
    if (!membership?.org_id) return
    try {
      const invites = await db.get('project_invitations',
        `org_id=eq.${membership.org_id}&accepted_at=is.null&order=created_at.desc&limit=5`)
      setExistingInvites(invites || [])
      // Auto-select the most recent valid invite
      if (invites && invites.length > 0) {
        const valid = invites.find(i => !i.expires_at || new Date(i.expires_at) > new Date())
        if (valid) setToken(valid.token)
      }
    } catch { /* ignore */ }
  }

  // Generate new invite token
  const generateInvite = async () => {
    setLoading(true)
    try {
      const newToken = generateToken(8)
      const expires = new Date()
      expires.setDate(expires.getDate() + 30) // 30 days validity

      await db.insert('project_invitations', {
        project_id: membership.org_id, // legacy column
        org_id: membership.org_id,
        token: newToken,
        role: 'member',
        invited_by: membership.user_id,
        expires_at: expires.toISOString(),
      })

      setToken(newToken)
      onToast('Lien d\'invitation généré')
      loadExistingInvites()
    } catch (e) {
      onToast('Erreur: ' + e.message, '#D4648A')
    } finally {
      setLoading(false)
    }
  }

  // Generate QR code on canvas
  useEffect(() => {
    if (!token || !canvasRef.current) return
    renderQR(canvasRef.current, inviteUrl)
  }, [token, inviteUrl])

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      onToast('Lien copié')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = inviteUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      onToast('Lien copié')
      setTimeout(() => setCopied(false), 2000)
    }
  }, [inviteUrl, onToast])

  // Share via Web Share API
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoins BackStage',
          text: 'Rejoins l\'équipe sur BackStage pour gérer la tournée !',
          url: inviteUrl,
        })
      } catch { /* user cancelled */ }
    } else {
      handleCopy()
    }
  }, [inviteUrl, handleCopy])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 400,
        maxHeight: '85vh', overflow: 'auto', padding: '24px 20px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px',
            background: ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={24} color={ACCENT} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1E293B' }}>Inviter l'équipe</div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Partage ce QR code ou ce lien pour que tes collaborateurs rejoignent le projet
          </div>
        </div>

        {/* QR Code */}
        {token ? (
          <>
            <div style={{
              background: '#FFFFFF', borderRadius: 16, padding: 20,
              border: `2px solid ${ACCENT}20`, textAlign: 'center', marginBottom: 16,
            }}>
              <canvas
                ref={canvasRef}
                style={{ width: 200, height: 200, imageRendering: 'pixelated' }}
              />
              <div style={{
                marginTop: 12, fontSize: 20, fontWeight: 700, color: ACCENT,
                letterSpacing: 4, fontFamily: 'monospace',
              }}>
                {token}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                Valide 30 jours
              </div>
            </div>

            {/* Invite URL */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 10,
              background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: 12,
            }}>
              <Link size={14} color="#94A3B8" />
              <div style={{
                flex: 1, fontSize: 11, color: '#64748B', fontFamily: 'monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {inviteUrl}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={handleCopy} style={{
                flex: 1, padding: '12px 8px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: copied ? '#5DAB8B' : ACCENT, color: 'white',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copié !' : 'Copier le lien'}
              </button>
              <button onClick={handleShare} style={{
                flex: 1, padding: '12px 8px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: '#E8735A', color: 'white',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Share2 size={16} />
                Partager
              </button>
            </div>

            {/* Regenerate */}
            <button onClick={generateInvite} disabled={loading} style={{
              width: '100%', padding: 10, borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <RefreshCw size={14} />
              Générer un nouveau code
            </button>
          </>
        ) : (
          /* No invite yet */
          <button onClick={generateInvite} disabled={loading} style={{
            width: '100%', padding: 16, borderRadius: 12, fontSize: 15, fontWeight: 600,
            background: ACCENT, color: 'white', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? (
              <RefreshCw size={18} className="spin" />
            ) : (
              <QrCode size={18} />
            )}
            {loading ? 'Génération...' : 'Générer le QR code d\'invitation'}
          </button>
        )}

        {/* Close */}
        <button onClick={onClose} style={{
          width: '100%', padding: 12, borderRadius: 10, marginTop: 12,
          fontSize: 13, fontWeight: 600, background: 'none', color: '#94A3B8',
          border: '1px solid #E2E8F0', cursor: 'pointer',
        }}>
          Fermer
        </button>
      </div>
    </div>
  )
}

// ─── Minimal QR Code renderer using qrcode library ───
async function renderQR(canvas, text) {
  try {
    const QRCode = (await import('qrcode')).default
    await QRCode.toCanvas(canvas, text, {
      width: 200,
      margin: 2,
      color: { dark: '#1E293B', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
  } catch (e) {
    // Fallback: draw placeholder
    const ctx = canvas.getContext('2d')
    canvas.width = 200
    canvas.height = 200
    ctx.fillStyle = '#F1F5F9'
    ctx.fillRect(0, 0, 200, 200)
    ctx.fillStyle = '#94A3B8'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('QR Code', 100, 100)
  }
}
