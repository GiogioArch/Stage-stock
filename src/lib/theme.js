/**
 * BackStage Design System — Source unique de vérité
 *
 * TOUT composant qui a besoin d'une couleur, d'un espacement ou d'une typo
 * importe depuis ce fichier. Plus JAMAIS de #hex hardcodé dans un .jsx.
 */

// ─── Modules (palette NON NÉGOCIABLE — cf. CLAUDE.md) ───
export const MODULES = {
  stock:      { label: 'Stock',      color: '#5B8DB8', bg: '#E8F0FE', gradient: ['#5B8DB8', '#4A7DA8'], icon: 'Package' },
  tournee:    { label: 'Tournée',    color: '#E8735A', bg: '#FDE8E4', gradient: ['#E8735A', '#D4648A'], icon: 'Calendar' },
  packing:    { label: 'Packing',    color: '#5DAB8B', bg: '#E4F5EF', gradient: ['#5DAB8B', '#4A9A7A'], icon: 'ClipboardCheck' },
  scanner:    { label: 'Scanner',    color: '#8B6DB8', bg: '#F0E8FE', gradient: ['#8B6DB8', '#6B4D98'], icon: 'ScanLine' },
  finance:    { label: 'Finance',    color: '#E8935A', bg: '#FEF0E4', gradient: ['#E8935A', '#D07A42'], icon: 'Coins' },
  achats:     { label: 'Achats',     color: '#D4648A', bg: '#FDE4EE', gradient: ['#D4648A', '#B84D72'], icon: 'ShoppingCart' },
  articles:   { label: 'Articles',   color: '#8B6DB8', bg: '#F0E8FE', gradient: ['#8B6DB8', '#6B4D98'], icon: 'Tag' },
  equipe:     { label: 'Équipe',     color: '#E8735A', bg: '#FDE8E4', gradient: ['#E8735A', '#D4648A'], icon: 'Users' },
  alertes:    { label: 'Alertes',    color: '#D4648A', bg: '#FDE4EE', gradient: ['#D4648A', '#B84D72'], icon: 'Bell' },
  previsions: { label: 'Prévisions', color: '#E8935A', bg: '#FEF0E4', gradient: ['#E8935A', '#D07A42'], icon: 'TrendingUp' },
}

// ─── Couleurs sémantiques (JAMAIS modifiées par module) ───
export const SEMANTIC = {
  success: '#5DAB8B',
  danger:  '#D4648A',
  warning: '#E8935A',
  info:    '#5B8DB8',
  melodie: '#8B6DB8',
}

// ─── Palette de base ───
export const BASE = {
  text:         '#0F172A',
  textSoft:     '#64748B',
  textMuted:    '#94A3B8',
  textDisabled: '#CBD5E1',
  bg:           '#FFFFFF',
  bgSurface:    '#F8FAFC',
  bgHover:      '#F1F5F9',
  bgActive:     '#E2E8F0',
  border:       '#E2E8F0',
  borderHover:  '#CBD5E1',
  white:        '#FFFFFF',
}

// ─── Purple premium (v9.3 refonte) ───
export const ACCENT = {
  main:     '#7C3AED',
  hover:    '#6D28D9',
  light:    '#8B5CF6',
  deep:     '#5B21B6',
  soft:     'rgba(124,58,237,0.08)',
  subtle:   'rgba(124,58,237,0.12)',
  gradient: 'linear-gradient(135deg, #8B5CF6 0%, #5B21B6 100%)',
  gold:     '#D4A843',
}

// ─── Catégories produit ───
export const CATEGORIES = {
  merch:       { label: 'Merchandising', color: '#8B6DB8', bg: 'rgba(139,109,184,0.08)' },
  materiel:    { label: 'Matériel',      color: '#5B8DB8', bg: 'rgba(91,141,184,0.08)' },
  consommable: { label: 'Consommables',  color: '#5DAB8B', bg: 'rgba(93,171,139,0.08)' },
}

// ─── Espacement ───
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

// ─── Typographie ───
export const TYPO = {
  h1:       { fontSize: 22, fontWeight: 800, lineHeight: 1.2 },
  h2:       { fontSize: 18, fontWeight: 800, lineHeight: 1.3 },
  h3:       { fontSize: 15, fontWeight: 700, lineHeight: 1.4 },
  body:     { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  bodyBold: { fontSize: 14, fontWeight: 600, lineHeight: 1.5 },
  caption:  { fontSize: 12, fontWeight: 600, lineHeight: 1.4 },
  micro:    { fontSize: 11, fontWeight: 600, lineHeight: 1.3 },
  label:    { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  overline: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 },
}

// ─── Ombres ───
export const SHADOW = {
  sm:    '0 1px 2px rgba(0,0,0,0.04)',
  card:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  md:    '0 2px 8px rgba(0,0,0,0.08)',
  lg:    '0 4px 16px rgba(0,0,0,0.12)',
  modal: '0 12px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
}

// ─── Rayons ───
export const RADIUS = {
  sm:    8,
  md:    10,
  lg:    12,
  xl:    16,
  pill:  20,
  modal: 20,
  round: 999,
}

// ─── Helper principal ───
export function getModuleTheme(moduleKey) {
  const mod = MODULES[moduleKey] || MODULES.stock
  return {
    ...mod,
    gradientCSS: `linear-gradient(135deg, ${mod.gradient[0]}, ${mod.gradient[1]})`,
    pillActive:   { background: BASE.text, color: BASE.white, border: 'none', fontWeight: 700 },
    pillInactive: { background: BASE.bgHover, color: BASE.textMuted, border: 'none', fontWeight: 600 },
    tint08: `rgba(${hexToRgb(mod.color)}, 0.08)`,
    tint15: `rgba(${hexToRgb(mod.color)}, 0.15)`,
    tint25: `rgba(${hexToRgb(mod.color)}, 0.25)`,
    shadowTinted: `0 2px 8px rgba(${hexToRgb(mod.color)}, 0.25)`,
    statBox: {
      background: 'rgba(255,255,255,0.18)',
      borderRadius: RADIUS.md,
      padding: `${SPACE.sm}px ${SPACE.lg}px`,
    },
  }
}

// ─── Utilitaire hex → rgb ───
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
