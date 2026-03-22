import {
  Target, Clapperboard, Volume2, Lightbulb, Guitar, Drama,
  Settings, Shirt, Truck, Shield, Mic, ClipboardList,
} from 'lucide-react'

// Role display config — shared across modules
export const ROLE_CONF = {
  TM:   { label: 'Tour Manager',        icon: Target,        color: '#5B8DB8' },
  PM:   { label: 'Chef de Production',   icon: Clapperboard,  color: '#8B6DB8' },
  SE:   { label: 'Ingé Son',             icon: Volume2,       color: '#5B8DB8' },
  LD:   { label: 'Régisseur Lumière',    icon: Lightbulb,     color: '#E8935A' },
  BL:   { label: 'Backline',             icon: Guitar,        color: '#D4648A' },
  SM:   { label: 'Régisseur Scène',      icon: Drama,         color: '#5DAB8B' },
  TD:   { label: 'Directeur Technique',  icon: Settings,      color: '#14B8A6' },
  MM:   { label: 'Merch Manager',        icon: Shirt,         color: '#D4648A' },
  LOG:  { label: 'Logistique',           icon: Truck,         color: '#5B8DB8' },
  SAFE: { label: 'Sécurité',             icon: Shield,        color: '#D4648A' },
  AA:   { label: 'Assistant Artiste',    icon: Mic,           color: '#8B6DB8' },
  PA:   { label: 'Assistant Production', icon: ClipboardList, color: '#5DAB8B' },
}

// ═══════════════════════════════════════════════
// HIÉRARCHIE DES RÔLES
// Un rôle senior hérite automatiquement des accès
// de tous ses sous-rôles (récursif)
// ═══════════════════════════════════════════════
export const ROLE_INHERITS = {
  TM:   ['PM', 'TD', 'SE', 'LD', 'SM', 'BL', 'MM', 'LOG', 'SAFE', 'AA', 'PA'],
  PM:   ['TD', 'SE', 'LD', 'SM', 'BL', 'PA'],
  TD:   ['SE', 'LD', 'SM', 'BL'],
  SM:   ['BL'],
  SE:   ['BL'],
  LD:   [],
  BL:   [],
  MM:   [],
  LOG:  [],
  SAFE: [],
  AA:   [],
  PA:   [],
}

// Modules par rôle (accès de base pour chaque métier)
export const ROLE_MODULES = {
  TM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'finance', 'forecast', 'ventes', 'achats', 'inventaire', 'transport', 'timeline'],
  PM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'finance', 'forecast', 'achats', 'inventaire', 'timeline'],
  TD:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'inventaire', 'timeline'],
  SE:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'timeline'],
  LD:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'timeline'],
  SM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'timeline'],
  BL:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes'],
  MM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'ventes', 'forecast'],
  LOG:  ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'transport', 'inventaire'],
  SAFE: ['dashboard', 'equipe', 'tournee', 'alertes', 'timeline'],
  AA:   ['dashboard', 'equipe', 'tournee', 'alertes', 'timeline'],
  PA:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'alertes', 'achats', 'inventaire'],
}

// Calcule tous les modules accessibles = propres + hérités (récursif, sans doublons)
export function getInheritedModules(roleCode) {
  const visited = new Set()
  const modules = new Set()

  function collect(code) {
    if (visited.has(code)) return
    visited.add(code)
    const own = ROLE_MODULES[code] || []
    own.forEach(m => modules.add(m))
    const subs = ROLE_INHERITS[code] || []
    subs.forEach(sub => collect(sub))
  }

  collect(roleCode)
  return [...modules]
}
