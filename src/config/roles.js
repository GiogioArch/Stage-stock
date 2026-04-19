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
// FICHES MÉTIER — tagline, recommended, filière
// Utilisé par l'entonnoir d'onboarding (Melodie.jsx)
// ═══════════════════════════════════════════════
// filiere : 'direction' | 'technique' | 'operationnel'
export const ROLE_PROFILES = {
  TM: {
    filiere: 'direction',
    tagline: 'Tu supervises toute la tournée — décisions, budgets, équipe.',
    recommended: 'tu signes les chèques et tu prends les décisions finales.',
  },
  PM: {
    filiere: 'direction',
    tagline: 'Tu orchestres la production — planning, équipes techniques, faisabilité.',
    recommended: 'tu fais tourner la machine entre artistes, techniciens et lieux.',
  },
  PA: {
    filiere: 'direction',
    tagline: 'Tu épaules la prod au quotidien — logistique, suivi, coordination.',
    recommended: 'tu gères le détail qui fait que tout roule.',
  },
  TD: {
    filiere: 'technique',
    tagline: 'Tu pilotes toute la technique — son, lumière, scène, régie.',
    recommended: 'tu es le chef d\'orchestre technique de la tournée.',
  },
  SE: {
    filiere: 'technique',
    tagline: 'Tu gères le son — façade, retours, balances, micros.',
    recommended: 'tu fais sonner l\'artiste soir après soir.',
  },
  LD: {
    filiere: 'technique',
    tagline: 'Tu crées les ambiances lumière — conduite, projecteurs, effets.',
    recommended: 'tu habilles le show en lumière et en couleurs.',
  },
  SM: {
    filiere: 'technique',
    tagline: 'Tu tiens la scène — plateau, montage, changements, timing.',
    recommended: 'tu donnes le top du rideau à la fin du show.',
  },
  BL: {
    filiere: 'technique',
    tagline: 'Tu prépares les instruments — guitares, claviers, batterie, accordages.',
    recommended: 'tu veilles sur les instruments comme sur tes bébés.',
  },
  MM: {
    filiere: 'operationnel',
    tagline: 'Tu gères le merch — stocks, ventes, réassort, caisse.',
    recommended: 'tu transformes les fans en clients et tu comptes la caisse.',
  },
  LOG: {
    filiere: 'operationnel',
    tagline: 'Tu gères la logistique — transport, flight cases, chargements.',
    recommended: 'tu sais où est chaque carton à chaque instant.',
  },
  AA: {
    filiere: 'operationnel',
    tagline: 'Tu accompagnes l\'artiste — loge, planning, besoins perso.',
    recommended: 'tu es l\'ombre de l\'artiste, du réveil au bis final.',
  },
  SAFE: {
    filiere: 'operationnel',
    tagline: 'Tu assures la sécurité — public, artiste, équipe, matériel.',
    recommended: 'tu anticipes les risques avant qu\'ils arrivent.',
  },
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
  TM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'finance', 'forecast', 'ventes', 'achats', 'inventaire', 'transport', 'timeline'],
  PM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'finance', 'forecast', 'achats', 'inventaire', 'timeline'],
  TD:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'inventaire', 'timeline'],
  SE:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'timeline'],
  LD:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'timeline'],
  SM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'timeline'],
  BL:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee'],
  MM:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'ventes', 'forecast'],
  LOG:  ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'transport', 'inventaire'],
  SAFE: ['dashboard', 'equipe', 'tournee', 'timeline'],
  AA:   ['dashboard', 'equipe', 'tournee', 'timeline'],
  PA:   ['dashboard', 'equipe', 'articles', 'stock', 'tournee', 'achats', 'inventaire'],
}

// ═══════════════════════════════════════════════
// ROLES — tableau consolidé
// Sert aux composants (RolePicker, Onboarding, ProfilePage).
// Chaque entrée = union de ROLE_CONF + ROLE_PROFILES + modules.
// ═══════════════════════════════════════════════
export const ROLES = Object.keys(ROLE_CONF).map(code => ({
  code,
  label: ROLE_CONF[code].label,
  icon: ROLE_CONF[code].icon,
  color: ROLE_CONF[code].color,
  filiere: ROLE_PROFILES[code]?.filiere || 'operationnel',
  tagline: ROLE_PROFILES[code]?.tagline || '',
  recommended: ROLE_PROFILES[code]?.recommended || '',
  modules: ROLE_MODULES[code] || [],
}))

// Rôles groupés par filière (ordre d'affichage recommandé)
export const ROLES_BY_FILIERE = {
  direction:    ['TM', 'PM', 'PA'],
  technique:    ['TD', 'SE', 'LD', 'SM', 'BL'],
  operationnel: ['MM', 'LOG', 'AA', 'SAFE'],
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
