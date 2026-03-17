// Melodie — Chatbot IA Stage Stock
// Cloudflare Pages Function → Workers AI (Llama 3.1 8B)

const SYSTEM_PROMPT = `Tu es Melodie, l'assistante virtuelle de Stage Stock, une application de gestion de stock et de logistique pour les professionnels du spectacle vivant (tournees, festivals, compagnies).

Tu es chaleureuse, professionnelle et efficace. Tu tutoies l'utilisateur.

Tu peux aider avec :
- La gestion du stock (produits, depots, mouvements d'entree/sortie/transfert)
- La preparation des concerts (packing lists, checklists)
- Le merchandising (t-shirts, affiches, media, accessoires)
- Le materiel technique (son, lumiere, scene, instruments)
- Les consommables (cables, piles, gaffer, cordes)
- La gestion d'equipe (roles, missions, planning)
- La tournee (calendrier, lieux, capacites)
- Les previsions de vente (forecast par format de concert)
- La comptabilite simplifiee (amortissement, valeur du stock)

Regles :
1. Reponds toujours en francais
2. Sois concise mais complete (max 3-4 phrases par reponse sauf si l'utilisateur demande plus de details)
3. Si tu ne connais pas une info specifique au projet de l'utilisateur, guide-le vers le bon module de l'app
4. Pour les questions comptables, rappelle que les durees d'amortissement doivent etre validees par un expert-comptable
5. N'invente jamais de donnees chiffrees. Si tu n'as pas les chiffres, dis-le
6. Utilise des listes a puces pour les reponses structurees

Modules de l'application :
- Dashboard : vue d'ensemble, KPIs, prochains concerts
- Articles : catalogue produits avec familles/sous-familles
- Depots : lieux de stockage (entrepot, vehicule, salle)
- Stock : quantites par lieu, mouvements
- Tournee : calendrier des evenements, fiches concert
- Equipe : membres, roles (12 metiers du spectacle), planning
- Alertes : notifications stock bas, concerts imminents
- Finance : valeur du stock, amortissements
- Forecast : previsions de vente merchandising

Les 12 roles : Tour Manager, Chef de prod, Ingenieur son, Eclairagiste, Blackliner, Scene Manager, Technicien, Merch Manager, Logisticien, Securite, Artiste, Assistant prod.`

export async function onRequestPost(context) {
  try {
    const { messages, userContext } = await context.request.json()

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Messages requis' }, { status: 400 })
    }

    // Build context-aware system prompt
    let systemContent = SYSTEM_PROMPT
    if (userContext) {
      systemContent += `\n\nContexte utilisateur :`
      if (userContext.name) systemContent += `\n- Prenom : ${userContext.name}`
      if (userContext.role) systemContent += `\n- Role : ${userContext.role}`
      if (userContext.project) systemContent += `\n- Projet : ${userContext.project}`
      if (userContext.nextEvent) systemContent += `\n- Prochain evenement : ${userContext.nextEvent}`
      if (userContext.stats) systemContent += `\n- Stats : ${userContext.stats}`
    }

    const fullMessages = [
      { role: 'system', content: systemContent },
      ...messages.slice(-10) // Keep last 10 messages for context window
    ]

    // Try Workers AI binding first
    if (context.env?.AI) {
      const result = await context.env.AI.run(
        '@cf/meta/llama-3.1-8b-instruct',
        {
          messages: fullMessages,
          max_tokens: 512,
          temperature: 0.7,
        }
      )

      return Response.json({
        response: result.response,
        model: 'llama-3.1-8b',
      }, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    }

    // Fallback: no AI binding configured
    return Response.json({
      response: getFallbackResponse(messages[messages.length - 1]?.content || ''),
      model: 'fallback',
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })

  } catch (error) {
    console.error('Chat error:', error)
    return Response.json({
      response: "Desole, j'ai rencontre un probleme technique. Reessaie dans un instant.",
      model: 'error',
    }, {
      status: 200, // Return 200 so frontend doesn't break
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }
}

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}

// Rule-based fallback when AI binding is not configured
function getFallbackResponse(message) {
  const msg = message.toLowerCase()

  if (msg.match(/bonjour|salut|hello|hey|coucou/))
    return "Salut ! Je suis Melodie, ton assistante Stage Stock. Comment je peux t'aider ?"

  if (msg.match(/stock|quantit|combien/))
    return "Pour voir ton stock, va dans l'onglet Stock ou Depots. Tu y trouveras les quantites par lieu et par produit. Tu peux aussi faire un mouvement (entree, sortie, transfert) depuis le bouton + en bas."

  if (msg.match(/concert|evenement|date|tournee/))
    return "Consulte l'onglet Tournee pour voir toutes tes dates. Chaque fiche concert contient la packing list, les checklists et les infos logistiques."

  if (msg.match(/packing|pack|prepar/))
    return "La packing list se genere automatiquement dans chaque fiche concert (onglet Tournee > clique sur un evenement > onglet Pack). Elle est basee sur les besoins par role."

  if (msg.match(/equipe|membre|role/))
    return "L'onglet Equipe te montre tous les membres du projet avec leurs roles et missions. Tu peux voir le planning par jour et les taches assignees."

  if (msg.match(/merch|tshirt|vente/))
    return "Le merchandising se gere dans Articles (famille Merchandising). Pour les previsions de vente, utilise l'onglet Forecast qui calcule par format de concert."

  if (msg.match(/alert|notif|rappel/))
    return "L'onglet Alertes centralise les notifications : stock bas, concerts imminents, checklists incompletes. Active les alertes dans les reglages."

  if (msg.match(/aide|help|comment/))
    return "Je peux t'aider sur : le stock, les concerts, la packing list, l'equipe, le merch, les alertes, la finance. Pose-moi ta question !"

  if (msg.match(/merci|thanks/))
    return "De rien ! N'hesite pas si tu as d'autres questions."

  return "Je suis la pour t'aider avec Stage Stock ! Tu peux me poser des questions sur le stock, les concerts, l'equipe, le merch, les alertes... Qu'est-ce que tu veux savoir ?"
}
