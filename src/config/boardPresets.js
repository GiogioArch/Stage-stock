/**
 * BoardPresets — Préréglages métier du Board par rôle
 *
 * Chaque rôle a une liste ordonnée de cartes visibles par défaut sur le Board.
 * Appliqué :
 *   1. À la création du projet (selectedRoles → board_config.board_order)
 *   2. Via un bouton "Recommandé pour mon métier" dans le mode édition du Board
 *
 * Format board_config (JSONB dans project_members) :
 *   {
 *     board_order: ['tournee', 'stock', ...],  // ordre d'affichage
 *     hidden:      ['achats', ...],            // clés masquées
 *     sections:    { alerts: true, ... }       // sections hors grille
 *   }
 */

// ─── Presets par rôle (12 rôles) — board_order = grille MODULES (stock/tournee/...) ───
// NB : l'ordre global des widgets top-level (ventes_kpis, stock_kpis, alerts, modules_grid, ...)
// est géré séparément par DEFAULT_WIDGET_ORDER dans useBoardConfig.js.
export const BOARD_PRESETS = {
  TM:   ['tournee', 'finance', 'equipe', 'achats', 'stock', 'alertes', 'forecast', 'transport'],
  PM:   ['tournee', 'finance', 'equipe', 'achats', 'stock', 'alertes', 'packing'],
  TD:   ['tournee', 'equipe', 'stock', 'packing', 'alertes'],
  SE:   ['tournee', 'equipe', 'stock', 'packing'],
  LD:   ['tournee', 'equipe', 'stock', 'packing'],
  SM:   ['tournee', 'equipe', 'stock', 'packing'],
  BL:   ['tournee', 'equipe', 'stock'],
  MM:   ['tournee', 'articles', 'stock', 'forecast', 'ventes', 'alertes'],
  LOG:  ['tournee', 'stock', 'transport', 'alertes', 'inventaire'],
  SAFE: ['tournee', 'equipe'],
  AA:   ['tournee', 'equipe'],
  PA:   ['tournee', 'equipe', 'achats', 'stock', 'alertes'],
}

// ─── Ordre par défaut des widgets top-level du Board par rôle ───
// Pour le TM (Tour Manager) : ventes + stock en priorité pour voir les KPIs business d'abord.
export const WIDGET_ORDER_PRESETS = {
  TM:   ['ventes_kpis', 'stock_kpis', 'alerts', 'modules_grid', 'forecast', 'quick_actions', 'packing_progress', 'top_ventes', 'upcoming_events'],
  PM:   ['ventes_kpis', 'stock_kpis', 'alerts', 'modules_grid', 'forecast', 'quick_actions', 'packing_progress', 'top_ventes', 'upcoming_events'],
  MM:   ['ventes_kpis', 'stock_kpis', 'alerts', 'modules_grid', 'forecast', 'top_ventes', 'quick_actions', 'packing_progress', 'upcoming_events'],
  LOG:  ['stock_kpis', 'alerts', 'modules_grid', 'ventes_kpis', 'forecast', 'quick_actions', 'packing_progress', 'top_ventes', 'upcoming_events'],
}

// ─── Défaut si aucun rôle match (nouvel user sans rôle) ───
export const DEFAULT_BOARD_PRESET = ['tournee', 'stock', 'articles', 'equipe']

/**
 * buildBoardConfigFromRoles — Construit un board_config depuis une liste de codes de rôles.
 *
 * Retourne l'objet JSONB prêt à insérer dans project_members.board_config
 * au format { board_order: [...], hidden: [], sections: {} }.
 *
 * L'ordre respecte le 1er rôle trouvé puis enchaîne les cartes uniques des rôles suivants.
 *
 * @param {string[]} roleCodes — Codes de rôles (ex: ['TM', 'PM'])
 * @returns {{ board_order: string[], hidden: string[], sections: object }}
 */
export function buildBoardConfigFromRoles(roleCodes = []) {
  const order = []
  const seen = new Set()

  roleCodes.forEach(code => {
    const preset = BOARD_PRESETS[code] || []
    preset.forEach(key => {
      if (!seen.has(key)) {
        seen.add(key)
        order.push(key)
      }
    })
  })

  if (order.length === 0) {
    DEFAULT_BOARD_PRESET.forEach(key => {
      if (!seen.has(key)) {
        seen.add(key)
        order.push(key)
      }
    })
  }

  // Widget order: prend le premier rôle trouvé qui a un preset widget, sinon défaut
  let widgetOrder = null
  for (const code of roleCodes) {
    if (WIDGET_ORDER_PRESETS[code]) {
      widgetOrder = WIDGET_ORDER_PRESETS[code]
      break
    }
  }

  return {
    board_order: order,
    hidden: [],
    sections: {},
    ...(widgetOrder ? { widget_order: widgetOrder } : {}),
  }
}
