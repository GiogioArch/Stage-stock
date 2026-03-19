import React, { useState, useMemo, createElement } from 'react'
import { Pencil, PackageOpen } from 'lucide-react'
import { getMoveConf, fmtDate, Badge } from './UI'
import { getModuleTheme, BASE, SEMANTIC, SPACE, TYPO, RADIUS, SHADOW } from '../lib/theme'
import { SubTabs } from '../design'

const theme = getModuleTheme('stock')

function hexToRgbLocal(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

export default function DepotDetail({
  location, stock, products, movements, families, subfamilies,
  onClose, onMovement, onToast, onEdit, onDelete, onReload, embedded,
}) {
  const [section, setSection] = useState('inventory')

  // ─── Stock in this location ───
  const locStock = useMemo(() =>
    (stock || []).filter(s => s.location_id === location.id && s.quantity > 0),
    [stock, location.id]
  )

  const productDetails = useMemo(() =>
    locStock.map(s => {
      const p = (products || []).find(pr => pr.id === s.product_id)
      if (!p) return null
      const sf = (subfamilies || []).find(sf => sf.id === p.subfamily_id)
      const f = sf ? (families || []).find(fm => fm.id === sf.family_id) : null
      return { ...p, qty: s.quantity, subfamily: sf, family: f }
    }).filter(Boolean).sort((a, b) => b.qty - a.qty),
    [locStock, products, subfamilies, families]
  )

  // ─── Movement history for this location ───
  const locMovements = useMemo(() =>
    (movements || []).filter(m => m.from_loc === location.id || m.to_loc === location.id)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 50),
    [movements, location.id]
  )

  // ─── Stats ───
  const totalQty = locStock.reduce((s, item) => s + (item.quantity || 0), 0)
  const nbProducts = new Set(locStock.map(s => s.product_id)).size
  const totalValue = productDetails.reduce((s, p) => s + (p.qty * (p.sale_price || 0)), 0)

  // ─── Group by family ───
  const byFamily = useMemo(() => {
    const map = {}
    productDetails.forEach(p => {
      const fname = p.family?.name || 'Sans famille'
      if (!map[fname]) map[fname] = { name: fname, items: [], qty: 0, value: 0 }
      map[fname].items.push(p)
      map[fname].qty += p.qty
      map[fname].value += p.qty * (p.sale_price || 0)
    })
    return Object.values(map).sort((a, b) => b.qty - a.qty)
  }, [productDetails])

  // ─── Alerts (low stock) ───
  const alerts = useMemo(() =>
    productDetails.filter(p => {
      const minStock = p.min_stock || 5
      return p.qty <= minStock
    }),
    [productDetails]
  )

  const pName = (id) => (products || []).find(p => p.id === id)?.name || '?'
  const lName = (id) => location.id === id ? location.name : '?'

  const SECTIONS = [
    { id: 'inventory', label: 'Inventaire', icon: '' },
    { id: 'movements', label: 'Mouvements', icon: '' },
    { id: 'value', label: 'Valeur', icon: '' },
    { id: 'alerts', label: 'Alertes', icon: '', count: alerts.length },
  ]

  return (
    <div style={{
      ...(!embedded ? { position: 'fixed', inset: 0, zIndex: 1000 } : {}),
      background: `linear-gradient(180deg, ${BASE.bg} 0%, ${BASE.bgSurface} 30%, ${BASE.bgSurface} 70%, ${BASE.bgSurface} 100%)`,
      overflow: embedded ? undefined : 'auto',
    }}>
      {/* Header */}
      <header style={{
        padding: `${SPACE.lg}px ${SPACE.lg + 2}px 0`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onClose} style={{
          padding: `${SPACE.sm}px ${SPACE.lg}px`, borderRadius: RADIUS.lg, ...TYPO.bodyBold,
          background: BASE.bgHover, border: `1px solid ${BASE.border}`, color: BASE.textMuted, cursor: 'pointer',
        }}>← Retour</button>
        <div style={{ ...TYPO.h3, color: location.color || theme.color }}>
          {location.icon || ''} {location.name}
        </div>
        <div style={{ display: 'flex', gap: SPACE.xs + 2 }}>
          {onEdit && (
            <button onClick={() => onEdit(location)} style={{
              padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: RADIUS.md, ...TYPO.caption,
              background: theme.tint08, border: `1px solid ${theme.tint25}`, color: theme.color, cursor: 'pointer',
            }} aria-label="Modifier">{createElement(Pencil, { size: 14 })}</button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(location)} aria-label="Supprimer" style={{
              padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: RADIUS.md, ...TYPO.caption,
              background: `rgba(${hexToRgbLocal(SEMANTIC.danger)}, 0.08)`, border: `1px solid rgba(${hexToRgbLocal(SEMANTIC.danger)}, 0.18)`, color: SEMANTIC.danger, cursor: 'pointer',
            }}></button>
          )}
        </div>
      </header>

      {/* KPI Banner */}
      <div className="card" style={{
        margin: `${SPACE.lg}px ${SPACE.lg}px 0`, padding: `${SPACE.lg + 2}px ${SPACE.lg}px`,
        background: `linear-gradient(135deg, ${(location.color || theme.color)}08, ${(location.color || theme.color)}18)`,
        border: `1px solid ${(location.color || theme.color)}25`,
      }}>
        {location.description && (
          <div style={{ ...TYPO.caption, color: BASE.textMuted, marginBottom: SPACE.md }}>{location.description}</div>
        )}
        <div style={{ display: 'flex', gap: SPACE.sm }}>
          <KpiBox label="Références" value={nbProducts} color={location.color || theme.color} />
          <KpiBox label="Unités" value={totalQty} color={SEMANTIC.success} />
          <KpiBox label="Valeur" value={`${Math.round(totalValue)}€`} color={SEMANTIC.warning} />
          {alerts.length > 0 && (
            <KpiBox label="Alertes" value={alerts.length} color={SEMANTIC.danger} />
          )}
        </div>
      </div>

      {/* Section tabs */}
      <SubTabs tabs={SECTIONS} active={section} onChange={setSection} />

      {/* Content */}
      <div style={{ padding: `${SPACE.md}px ${SPACE.lg}px ${embedded ? SPACE.xxl + 'px' : '100px'}` }}>

        {/* ─── Inventory ─── */}
        {section === 'inventory' && (
          <div>
            {/* Quick action */}
            {onMovement && (
              <div style={{ display: 'flex', gap: SPACE.sm, marginBottom: SPACE.md }}>
                <button onClick={() => onMovement('in', location.id)} style={{
                  flex: 1, padding: `${SPACE.md}px ${SPACE.sm}px`, borderRadius: RADIUS.lg, ...TYPO.caption,
                  background: `rgba(${hexToRgbLocal(SEMANTIC.success)}, 0.08)`, border: `1px solid rgba(${hexToRgbLocal(SEMANTIC.success)}, 0.18)`, color: SEMANTIC.success, cursor: 'pointer',
                }}>+ Entrée</button>
                <button onClick={() => onMovement('out', location.id)} style={{
                  flex: 1, padding: `${SPACE.md}px ${SPACE.sm}px`, borderRadius: RADIUS.lg, ...TYPO.caption,
                  background: `rgba(${hexToRgbLocal(SEMANTIC.danger)}, 0.08)`, border: `1px solid rgba(${hexToRgbLocal(SEMANTIC.danger)}, 0.18)`, color: SEMANTIC.danger, cursor: 'pointer',
                }}>- Sortie</button>
                <button onClick={() => onMovement('transfer', location.id)} style={{
                  flex: 1, padding: `${SPACE.md}px ${SPACE.sm}px`, borderRadius: RADIUS.lg, ...TYPO.caption,
                  background: theme.tint08, border: `1px solid ${theme.tint15}`, color: theme.color, cursor: 'pointer',
                }}>↔ Transfert</button>
              </div>
            )}

            {productDetails.length === 0 ? (
              <div className="card" style={{ padding: SPACE.xxxl, textAlign: 'center' }}>
                <div style={{ marginBottom: SPACE.sm }}>{createElement(PackageOpen, { size: 40, color: BASE.textMuted })}</div>
                <div style={{ ...TYPO.bodyBold, color: BASE.text }}>Dépôt vide</div>
                <div style={{ ...TYPO.caption, color: BASE.textMuted, marginTop: SPACE.xs }}>Aucun stock dans ce lieu</div>
              </div>
            ) : (
              byFamily.map(fam => (
                <div key={fam.name} style={{ marginBottom: SPACE.md }}>
                  <div style={{
                    ...TYPO.micro, color: BASE.textMuted, textTransform: 'uppercase',
                    letterSpacing: 1, marginBottom: SPACE.xs + 2, display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>{fam.name}</span>
                    <span>{fam.qty} unités</span>
                  </div>
                  <div className="card" style={{ padding: `${SPACE.xs + 2}px ${SPACE.md}px` }}>
                    {fam.items.map((p, i) => {
                      const isLow = p.qty <= (p.min_stock || 5)
                      return (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.sm}px 0`,
                          borderBottom: i < fam.items.length - 1 ? `1px solid ${BASE.border}` : 'none',
                        }}>
                          <span style={{ fontSize: 16 }}>{p.image || ''}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              ...TYPO.bodyBold, color: BASE.text,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{p.name}</div>
                            <div style={{ ...TYPO.label, color: BASE.textMuted, textTransform: 'none' }}>
                              {p.sku || ''}{p.subfamily ? ` · ${p.subfamily.name}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{
                              fontSize: 16, fontWeight: 600,
                              color: isLow ? SEMANTIC.warning : (location.color || theme.color),
                            }}>{p.qty}</div>
                            {p.sale_price > 0 && (
                              <div style={{ fontSize: 9, color: BASE.textMuted }}>{Math.round(p.qty * p.sale_price)}€</div>
                            )}
                          </div>
                          {isLow && (
                            <span style={{ ...TYPO.label, color: SEMANTIC.warning, textTransform: 'none' }}></span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Movements ─── */}
        {section === 'movements' && (
          <div>
            {locMovements.length === 0 ? (
              <div className="card" style={{ padding: SPACE.xxxl, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: SPACE.sm }}></div>
                <div style={{ ...TYPO.bodyBold, color: BASE.text }}>Aucun mouvement</div>
                <div style={{ ...TYPO.caption, color: BASE.textMuted, marginTop: SPACE.xs }}>
                  Pas encore de mouvements pour ce dépôt
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: `${SPACE.xs + 2}px ${SPACE.md}px` }}>
                {locMovements.map((m, i) => {
                  const conf = getMoveConf(m.type)
                  const isIncoming = m.to_loc === location.id
                  return (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.sm}px 0`,
                      borderBottom: i < locMovements.length - 1 ? `1px solid ${BASE.border}` : 'none',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: RADIUS.sm,
                        background: conf.color + '15',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{conf.icon && React.createElement(conf.icon, { size: 14, color: conf.color })}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          ...TYPO.caption, color: BASE.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{pName(m.product_id)}</div>
                        <div style={{ ...TYPO.label, color: BASE.textMuted, textTransform: 'none' }}>
                          {m.type === 'transfer'
                            ? `${lName(m.from_loc)} → ${lName(m.to_loc)}`
                            : m.type === 'in' ? 'Entrée' : 'Sortie'
                          }
                          {m.note && ` · ${m.note}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          ...TYPO.bodyBold,
                          color: isIncoming ? SEMANTIC.success : SEMANTIC.danger,
                        }}>
                          {isIncoming ? '+' : '-'}{m.quantity}
                        </div>
                        <div style={{ fontSize: 9, color: BASE.textMuted }}>{fmtDate(m.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {locMovements.length >= 50 && (
              <div style={{ textAlign: 'center', padding: SPACE.sm, ...TYPO.micro, color: BASE.textMuted }}>
                50 derniers mouvements affichés
              </div>
            )}
          </div>
        )}

        {/* ─── Value ─── */}
        {section === 'value' && (
          <div>
            <div className="card" style={{ padding: SPACE.lg, textAlign: 'center', marginBottom: SPACE.md }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: SEMANTIC.warning }}>{Math.round(totalValue)}€</div>
              <div style={{ ...TYPO.caption, color: BASE.textMuted, marginTop: SPACE.xs }}>Valeur totale du stock (prix de vente)</div>
            </div>

            {byFamily.length > 0 && (
              <div className="card" style={{ padding: SPACE.lg }}>
                <div style={{ ...TYPO.micro, color: BASE.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.md }}>
                  Répartition par famille
                </div>
                {byFamily.map(fam => {
                  const pct = totalValue > 0 ? Math.round((fam.value / totalValue) * 100) : 0
                  return (
                    <div key={fam.name} style={{ marginBottom: SPACE.md }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACE.xs }}>
                        <span style={{ ...TYPO.caption, color: BASE.text }}>{fam.name}</span>
                        <span style={{ ...TYPO.caption, color: SEMANTIC.warning }}>{Math.round(fam.value)}€</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: BASE.border, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: 3,
                          background: location.color || theme.color, transition: 'width 0.3s',
                        }} />
                      </div>
                      <div style={{ fontSize: 9, color: BASE.textMuted, marginTop: 2 }}>
                        {fam.qty} unités · {pct}%
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Top 5 by value */}
            {productDetails.length > 0 && (
              <div className="card" style={{ padding: SPACE.lg, marginTop: SPACE.md }}>
                <div style={{ ...TYPO.micro, color: BASE.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.md }}>
                  Top 5 par valeur
                </div>
                {productDetails
                  .filter(p => p.sale_price > 0)
                  .sort((a, b) => (b.qty * b.sale_price) - (a.qty * a.sale_price))
                  .slice(0, 5)
                  .map((p, i) => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.xs + 2}px 0`,
                      borderBottom: i < 4 ? `1px solid ${BASE.border}` : 'none',
                    }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: RADIUS.sm - 2,
                        background: `rgba(${hexToRgbLocal(SEMANTIC.warning)}, 0.08)`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        ...TYPO.micro, color: SEMANTIC.warning,
                      }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          ...TYPO.caption, color: BASE.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{p.name}</div>
                        <div style={{ ...TYPO.label, color: BASE.textMuted, textTransform: 'none' }}>{p.qty} × {p.sale_price}€</div>
                      </div>
                      <div style={{ ...TYPO.bodyBold, color: SEMANTIC.warning }}>
                        {Math.round(p.qty * p.sale_price)}€
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* ─── Alerts ─── */}
        {section === 'alerts' && (
          <div>
            {alerts.length === 0 ? (
              <div className="card" style={{ padding: SPACE.xxxl, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: SPACE.sm }}></div>
                <div style={{ ...TYPO.bodyBold, color: SEMANTIC.success }}>Tout va bien</div>
                <div style={{ ...TYPO.caption, color: BASE.textMuted, marginTop: SPACE.xs }}>
                  Aucune alerte pour ce dépôt
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
                {alerts.map(p => {
                  const minStock = p.min_stock || 5
                  const isRupture = p.qty <= 0
                  return (
                    <div key={p.id} className="card" style={{
                      padding: `${SPACE.lg}px`,
                      borderLeft: `4px solid ${isRupture ? SEMANTIC.danger : SEMANTIC.warning}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md }}>
                        <span style={{ fontSize: 18 }}>{p.image || ''}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...TYPO.bodyBold, color: BASE.text }}>{p.name}</div>
                          <div style={{ ...TYPO.micro, color: BASE.textMuted }}>
                            Seuil : {minStock} · Stock : {p.qty}
                          </div>
                        </div>
                        <Badge color={isRupture ? SEMANTIC.danger : SEMANTIC.warning}>
                          {isRupture ? 'Rupture' : 'Stock bas'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: `${SPACE.sm}px ${SPACE.xs}px`,
      background: BASE.bgHover, borderRadius: RADIUS.md, border: `1px solid ${BASE.border}`,
    }}>
      <div style={{ ...TYPO.bodyBold, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: BASE.textMuted, fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
