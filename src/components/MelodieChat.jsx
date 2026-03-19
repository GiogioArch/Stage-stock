import React, { useState, useRef, useEffect, createElement } from 'react'
import { MessageCircle, X, Send, Loader2, Music } from 'lucide-react'

// ─── Design tokens ───
const C = {
  melodie: '#8B6DB8',
  accent: '#5B8DB8',
  text: '#1E293B',
  textSoft: '#64748B',
  textMuted: '#94A3B8',
  bg: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',
}

// ─── Quick suggestions ───
const SUGGESTIONS = [
  "C'est quand mon prochain concert ?",
  'Combien de stock j\'ai ?',
  'J\'ai des alertes ?',
  'Comment ajouter un produit ?',
]

// ─── Avatar ───
function Avatar({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: `linear-gradient(135deg, ${C.melodie}, ${C.accent})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {createElement(Music, { size: size * 0.5, color: 'white' })}
    </div>
  )
}

// ─── Réponses intelligentes avec accès aux données réelles ───
function getResponse(message, ctx = {}) {
  const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const { events, data, userRole, orgName } = ctx

  // Helpers pour données contextuelles
  const now = new Date().toISOString().split('T')[0]
  const upcoming = events?.filter(e => e.date >= now) || []
  const nextEv = upcoming[0]
  const totalStock = data?.stock?.reduce((s, st) => s + (st.quantity || 0), 0) || 0
  const nbProducts = data?.products?.length || 0
  const nbLocations = data?.locations?.length || 0
  const alerts = data?.alerts || []
  const ruptures = alerts.filter(a => a.level === 'rupture')

  // Salutations
  if (msg.match(/\b(bonjour|salut|hello|hey|coucou|yo)\b/))
    return `Salut ! Je suis **Mélodie**, ton assistante BackStage. Comment je peux t'aider ?`

  // Prochaine date / prochain concert
  if (msg.match(/\b(prochain|prochaine|next|date|quand)\b/) && msg.match(/\b(concert|date|événement|spectacle|show)\b/)) {
    if (!nextEv) return "Tu n'as aucun événement à venir pour le moment. Ajoute-en un dans l'onglet **Tournée** !"
    const d = Math.ceil((new Date(nextEv.date) - new Date()) / 86400000)
    return `Ton prochain événement est **${nextEv.name || nextEv.lieu}** le **${new Date(nextEv.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}** (dans ${d} jour${d > 1 ? 's' : ''}).\n\n- Lieu : ${nextEv.ville || '?'}\n- Format : ${nextEv.format || '?'}\n- Capacité : ${nextEv.capacite || '?'} pers.\n\nClique sur la carte du prochain événement sur le tableau de bord pour voir la fiche complète.`
  }

  // Stock contextuel
  if (msg.match(/\b(stock|quantite|combien|inventaire|comptage)\b/)) {
    let resp = `Tu as actuellement **${totalStock} unités** en stock, réparties sur **${nbLocations} dépôt${nbLocations > 1 ? 's' : ''}** avec **${nbProducts} référence${nbProducts > 1 ? 's' : ''}**.`
    if (ruptures.length > 0) resp += `\n\n**Attention** : ${ruptures.length} rupture${ruptures.length > 1 ? 's' : ''} détectée${ruptures.length > 1 ? 's' : ''} !`
    if (alerts.length > ruptures.length) resp += `\n${alerts.length - ruptures.length} alerte${alerts.length - ruptures.length > 1 ? 's' : ''} stock bas.`
    return resp
  }

  // Produit / Article
  if (msg.match(/\b(produit|article|ajouter|creer|nouveau|reference|sku)\b/))
    return "Pour ajouter un produit :\n1. Va dans l'onglet **Articles**\n2. Clique sur le bouton **+** en bas\n3. Remplis le nom, la catégorie, le SKU\n4. Enregistre\n\nTu peux aussi importer en masse via un fichier CSV."

  // Concert / Événement (info contextuelle)
  if (msg.match(/\b(concert|événement|tournee|spectacle|festival)\b/)) {
    let resp = `Tu as **${upcoming.length} événement${upcoming.length > 1 ? 's' : ''} à venir** et **${(events?.length || 0) - upcoming.length} passé${(events?.length || 0) - upcoming.length > 1 ? 's' : ''}**.`
    if (nextEv) {
      const d = Math.ceil((new Date(nextEv.date) - new Date()) / 86400000)
      resp += `\n\nProchain : **${nextEv.name || nextEv.lieu}** dans ${d} jour${d > 1 ? 's' : ''}.`
    }
    resp += `\n\nChaque fiche concert contient :\n- Les infos logistiques\n- La packing list automatique\n- Les checklists par rôle\n- Le prévisionnel de ventes`
    return resp
  }

  // Packing
  if (msg.match(/\b(packing|pack|preparer|preparation|valise)\b/))
    return "La **packing list** se génère automatiquement pour chaque concert :\n1. Va dans **Tournée** > clique sur un événement\n2. Onglet **Pack**\n3. Coche les items au fur et à mesure\n\nElle est basée sur les besoins de ton rôle."

  // Équipe
  if (msg.match(/\b(equipe|membre|role|collegue|planning)\b/))
    return "L'onglet **Équipe** te montre tous les membres du projet avec leurs rôles et missions. Les 12 rôles du spectacle sont pris en charge : Tour Manager, Chef de prod, Ingé son, etc."

  // Merch / Vente
  if (msg.match(/\b(merch|tshirt|vente|merchandising|boutique|textile)\b/))
    return "Le merchandising se gère dans **Articles** (famille Merchandising). Pour les prévisions de vente, utilise l'onglet **Forecast** qui calcule par format de concert et par territoire."

  // Alertes contextuelles
  if (msg.match(/\b(alerte|notif|rappel|rupture|seuil)\b/)) {
    if (alerts.length === 0) return "Tout va bien ! Aucune alerte en cours. Ton stock est dans les clous."
    let resp = `Tu as **${alerts.length} alerte${alerts.length > 1 ? 's' : ''}** en cours :`
    if (ruptures.length > 0) resp += `\n- **${ruptures.length} rupture${ruptures.length > 1 ? 's' : ''}** : ${ruptures.slice(0, 3).map(r => r.name).join(', ')}${ruptures.length > 3 ? '...' : ''}`
    const low = alerts.filter(a => a.level !== 'rupture')
    if (low.length > 0) resp += `\n- **${low.length} stock${low.length > 1 ? 's' : ''} bas** : ${low.slice(0, 3).map(r => r.name).join(', ')}${low.length > 3 ? '...' : ''}`
    resp += `\n\nClique sur le bandeau d'alertes du tableau de bord pour le détail.`
    return resp
  }

  // Finance
  if (msg.match(/\b(finance|argent|budget|cout|prix|amortissement|comptable|depense)\b/))
    return "Le module **Finance** te donne :\n- La valeur totale de ton stock\n- Les amortissements des immobilisations (> 500€ HT)\n- Le suivi revenus/dépenses par événement\n\nRappel : les durées d'amortissement doivent être validées par un expert-comptable."

  // Scanner
  if (msg.match(/\b(scanner|scan|code.?barre|barcode|camera)\b/))
    return "Le **Scanner** te permet de scanner un code-barres avec la caméra de ton téléphone. Le produit est reconnu automatiquement et tu peux faire un mouvement de stock en un clic."

  // Achats
  if (msg.match(/\b(achat|commande|fournisseur|commander|acheter)\b/))
    return "Le module **Achats** gère tes commandes fournisseurs :\n- Créer une commande avec les lignes produits\n- Suivre le statut (brouillon → envoyé → confirmé → reçu)\n- Gérer ta liste de fournisseurs"

  // Dépôt / Lieu
  if (msg.match(/\b(depot|lieu|entrepot|vehicule|stockage|local)\b/))
    return "Les **dépôts** sont les lieux de stockage de tes produits. Tu peux en créer de 4 types :\n- **Fixe** : entrepôt, local\n- **Mobile** : véhicule, flight case\n- **Éphémère** : backstage d'un concert\n- **Temporaire** : stockage ponctuel"

  // Aide générale
  if (msg.match(/\b(aide|help|comment|quoi|fonctionn)\b/))
    return "Je peux t'aider sur :\n- **Stock** : quantités, mouvements, inventaire\n- **Concerts** : tournée, packing, checklists\n- **Articles** : catalogue, ajout, import\n- **Équipe** : rôles, membres, planning\n- **Finance** : valeur stock, amortissements\n- **Achats** : commandes, fournisseurs\n\nPose-moi ta question !"

  // Remerciements
  if (msg.match(/\b(merci|thanks|top|genial|super|parfait)\b/))
    return "De rien ! N'hésite pas si tu as d'autres questions. Je suis là pour ça ! 🎶"

  // Fallback
  return "Je suis là pour t'aider avec **BackStage** ! Tu peux me poser des questions sur le stock, les concerts, l'équipe, le merch, les alertes, la finance... Qu'est-ce que tu veux savoir ?"
}

export default function MelodieChat({ user, userRole, orgName, events, data }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pulse, setPulse] = useState(true)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  useEffect(() => {
    if (open && messages.length === 0) {
      const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
      setMessages([{
        role: 'assistant',
        content: `Salut${name ? ` ${name}` : ''} ! Je suis **Mélodie**, ton assistante BackStage.\n\nJe connais ton projet et tes données. Demande-moi par exemple :\n- C'est quand mon prochain concert ?\n- Combien j'ai de stock ?\n- J'ai des alertes ?\n\nPose-moi ta question !`,
      }])
    }
  }, [open])

  const sendMessage = () => {
    const text = input.trim()
    if (!text || loading) return

    setPulse(false)
    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Réponse contextuelle avec accès aux données
    setTimeout(() => {
      const response = getResponse(text, { events, data, userRole, orgName })
      setMessages([...newMessages, { role: 'assistant', content: response }])
      setLoading(false)
    }, 400 + Math.random() * 400)
  }

  // ─── Floating button ───
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir Mélodie"
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 150,
          width: 52, height: 52, borderRadius: 26,
          background: `linear-gradient(135deg, ${C.melodie}, ${C.accent})`,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 20px ${C.melodie}40`,
          animation: pulse ? 'pulse 2s infinite' : undefined,
        }}
      >
        {createElement(MessageCircle, { size: 24, color: 'white' })}
        {pulse && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 12, height: 12, borderRadius: 6,
            background: '#5DAB8B', border: '2px solid white',
          }} />
        )}
      </button>
    )
  }

  // ─── Chat window ───
  return (
    <div style={{
      position: 'fixed', bottom: 0, right: 0, zIndex: 250,
      width: '100%', maxWidth: 400, height: '70vh', maxHeight: 540,
      display: 'flex', flexDirection: 'column',
      background: C.bg,
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      animation: 'slideUp 0.25s ease',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: `linear-gradient(135deg, ${C.melodie}, ${C.accent})`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Avatar size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Mélodie</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Assistante BackStage</div>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Fermer" style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {createElement(X, { size: 18, color: 'white' })}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: 12,
        WebkitOverflowScrolling: 'touch',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, marginBottom: 10,
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
          }}>
            {msg.role === 'assistant' && <Avatar size={26} />}
            <div style={{
              maxWidth: '80%', padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? `${C.accent}12` : C.surface,
              border: `1px solid ${msg.role === 'user' ? `${C.accent}20` : C.border}`,
              fontSize: 13, lineHeight: 1.5, color: C.text,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {formatMessage(msg.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-end' }}>
            <Avatar size={26} />
            <div style={{
              padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
              background: C.surface, border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: C.melodie, animation: 'bounce 1s infinite', animationDelay: '0s' }} />
                <span style={{ width: 6, height: 6, borderRadius: 3, background: C.melodie, animation: 'bounce 1s infinite', animationDelay: '0.15s' }} />
                <span style={{ width: 6, height: 6, borderRadius: 3, background: C.melodie, animation: 'bounce 1s infinite', animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        {messages.length <= 1 && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => { setInput(s); inputRef.current?.focus() }} style={{
                padding: '6px 12px', borderRadius: 20,
                background: `${C.melodie}08`, border: `1px solid ${C.melodie}20`,
                fontSize: 11, color: C.melodie, fontWeight: 500, cursor: 'pointer',
              }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px', borderTop: `1px solid ${C.border}`,
        background: C.surface, display: 'flex', gap: 8, alignItems: 'center',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Pose ta question..."
          disabled={loading}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 12,
            border: `1px solid ${C.border}`, background: C.bg,
            fontSize: 14, color: C.text, outline: 'none',
          }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || loading} aria-label="Envoyer" style={{
          width: 40, height: 40, borderRadius: 12,
          background: input.trim() ? C.accent : C.border,
          border: 'none', cursor: input.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        }}>
          {loading
            ? createElement(Loader2, { size: 18, color: 'white', className: 'spin' })
            : createElement(Send, { size: 18, color: 'white' })
          }
        </button>
      </div>
    </div>
  )
}

// ─── Simple markdown formatting ───
function formatMessage(text) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}
