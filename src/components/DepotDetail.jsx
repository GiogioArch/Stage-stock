import React, { useState, useMemo, createElement } from 'react'
import { getMoveConf, fmtDate, Badge } from './UI'

export default function DepotDetail({
  location, stock, products, movements, families, subfamilies,
  onClose, onMovement, onToast, onEdit, onDelete, onReload,
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
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'linear-gradient(180deg, #FFF8F0 0%, #111113 30%, #111113 70%, #111113 100%)',
      overflow: 'auto',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onClose} style={{
          padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: '#18181B', border: '1px solid rgba(255,255,255,0.06)', color: '#71717A', cursor: 'pointer',
        }}>← Retour</button>
        <div style={{ fontSize: 15, fontWeight: 600, color: location.color || '#3B82F6' }}>
          {location.icon || ''} {location.name}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onEdit && (
            <button onClick={() => onEdit(location)} style={{
              padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: '#EEF4FA', border: '1px solid #3B82F630', color: '#3B82F6', cursor: 'pointer',
            }}>✏️</button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(location)} style={{
              padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: '#FDF0F4', border: '1px solid #A78BFA30', color: '#A78BFA', cursor: 'pointer',
            }}></button>
          )}
        </div>
      </header>

      {/* KPI Banner */}
      <div className="card" style={{
        margin: '16px 16px 0', padding: '18px 16px',
        background: `linear-gradient(135deg, ${(location.color || '#3B82F6')}08, ${(location.color || '#3B82F6')}18)`,
        border: `1px solid ${(location.color || '#3B82F6')}25`,
      }}>
        {location.description && (
          <div style={{ fontSize: 12, color: '#71717A', marginBottom: 12 }}>{location.description}</div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiBox label="Références" value={nbProducts} color={location.color || '#3B82F6'} />
          <KpiBox label="Unités" value={totalQty} color="#22C55E" />
          <KpiBox label="Valeur" value={`${Math.round(totalValue)}€`} color="#F59E0B" />
          {alerts.length > 0 && (
            <KpiBox label="Alertes" value={alerts.length} color="#A78BFA" />
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '16px 16px 0' }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            flex: 1, padding: '7px 6px', borderRadius: 10, fontSize: 10, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center', position: 'relative',
            background: section === s.id ? `${(location.color || '#3B82F6')}15` : 'white',
            color: section === s.id ? (location.color || '#3B82F6') : '#71717A',
            border: `1px solid ${section === s.id ? (location.color || '#3B82F6') + '40' : 'rgba(255,255,255,0.06)'}`,
          }}>
            {s.icon} {s.label}
            {s.count > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -2,
                width: 16, height: 16, borderRadius: '50%',
                background: '#A78BFA', color: 'white', fontSize: 9, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{s.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 16px 100px' }}>

        {/* ─── Inventory ─── */}
        {section === 'inventory' && (
          <div>
            {/* Quick action */}
            {onMovement && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={() => onMovement('in', location.id)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: '#22C55E15', border: '1px solid #22C55E30', color: '#22C55E', cursor: 'pointer',
                }}>+ Entrée</button>
                <button onClick={() => onMovement('out', location.id)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: '#A78BFA15', border: '1px solid #A78BFA30', color: '#A78BFA', cursor: 'pointer',
                }}>- Sortie</button>
                <button onClick={() => onMovement('transfer', location.id)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: '#3B82F615', border: '1px solid #3B82F630', color: '#3B82F6', cursor: 'pointer',
                }}>↔ Transfert</button>
              </div>
            )}

            {productDetails.length === 0 ? (
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>Dépôt vide</div>
                <div style={{ fontSize: 12, color: '#71717A', marginTop: 4 }}>Aucun stock dans ce lieu</div>
              </div>
            ) : (
              byFamily.map(fam => (
                <div key={fam.name} style={{ marginBottom: 12 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase',
                    letterSpacing: 1, marginBottom: 6, display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>{fam.name}</span>
                    <span>{fam.qty} unités</span>
                  </div>
                  <div className="card" style={{ padding: '6px 12px' }}>
                    {fam.items.map((p, i) => {
                      const isLow = p.qty <= (p.min_stock || 5)
                      return (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                          borderBottom: i < fam.items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        }}>
                          <span style={{ fontSize: 16 }}>{p.image || ''}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 700, color: '#FAFAFA',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: '#71717A' }}>
                              {p.sku || ''}{p.subfamily ? ` · ${p.subfamily.name}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{
                              fontSize: 16, fontWeight: 600,
                              color: isLow ? '#A78BFA' : (location.color || '#3B82F6'),
                            }}>{p.qty}</div>
                            {p.sale_price > 0 && (
                              <div style={{ fontSize: 9, color: '#71717A' }}>{Math.round(p.qty * p.sale_price)}€</div>
                            )}
                          </div>
                          {isLow && (
                            <span style={{ fontSize: 10, color: '#A78BFA', fontWeight: 600 }}></span>
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
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}></div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>Aucun mouvement</div>
                <div style={{ fontSize: 12, color: '#71717A', marginTop: 4 }}>
                  Pas encore de mouvements pour ce dépôt
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: '6px 12px' }}>
                {locMovements.map((m, i) => {
                  const conf = getMoveConf(m.type)
                  const isIncoming = m.to_loc === location.id
                  return (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                      borderBottom: i < locMovements.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: conf.color + '15',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{conf.icon && React.createElement(conf.icon, { size: 14, color: conf.color })}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: '#FAFAFA',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{pName(m.product_id)}</div>
                        <div style={{ fontSize: 10, color: '#71717A' }}>
                          {m.type === 'transfer'
                            ? `${lName(m.from_loc)} → ${lName(m.to_loc)}`
                            : m.type === 'in' ? 'Entrée' : 'Sortie'
                          }
                          {m.note && ` · ${m.note}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600,
                          color: isIncoming ? '#22C55E' : '#A78BFA',
                        }}>
                          {isIncoming ? '+' : '-'}{m.quantity}
                        </div>
                        <div style={{ fontSize: 9, color: '#71717A' }}>{fmtDate(m.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {locMovements.length >= 50 && (
              <div style={{ textAlign: 'center', padding: 8, fontSize: 11, color: '#71717A' }}>
                50 derniers mouvements affichés
              </div>
            )}
          </div>
        )}

        {/* ─── Value ─── */}
        {section === 'value' && (
          <div>
            <div className="card" style={{ padding: 16, textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: '#F59E0B' }}>{Math.round(totalValue)}€</div>
              <div style={{ fontSize: 12, color: '#71717A', marginTop: 4 }}>Valeur totale du stock (prix de vente)</div>
            </div>

            {byFamily.length > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Répartition par famille
                </div>
                {byFamily.map(fam => {
                  const pct = totalValue > 0 ? Math.round((fam.value / totalValue) * 100) : 0
                  return (
                    <div key={fam.name} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#FAFAFA' }}>{fam.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>{Math.round(fam.value)}€</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: 3,
                          background: location.color || '#3B82F6', transition: 'width 0.3s',
                        }} />
                      </div>
                      <div style={{ fontSize: 9, color: '#71717A', marginTop: 2 }}>
                        {fam.qty} unités · {pct}%
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Top 5 by value */}
            {productDetails.length > 0 && (
              <div className="card" style={{ padding: 16, marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Top 5 par valeur
                </div>
                {productDetails
                  .filter(p => p.sale_price > 0)
                  .sort((a, b) => (b.qty * b.sale_price) - (a.qty * a.sale_price))
                  .slice(0, 5)
                  .map((p, i) => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                      borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: '#F59E0B15', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600, color: '#F59E0B',
                      }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: '#FAFAFA',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: '#71717A' }}>{p.qty} × {p.sale_price}€</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F59E0B' }}>
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
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}></div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#22C55E' }}>Tout va bien</div>
                <div style={{ fontSize: 12, color: '#71717A', marginTop: 4 }}>
                  Aucune alerte pour ce dépôt
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map(p => {
                  const minStock = p.min_stock || 5
                  const isRupture = p.qty <= 0
                  return (
                    <div key={p.id} className="card" style={{
                      padding: '14px 16px',
                      borderLeft: `4px solid ${isRupture ? '#A78BFA' : '#F59E0B'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{p.image || ''}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#71717A' }}>
                            Seuil : {minStock} · Stock : {p.qty}
                          </div>
                        </div>
                        <Badge color={isRupture ? '#A78BFA' : '#F59E0B'}>
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
      flex: 1, textAlign: 'center', padding: '8px 4px',
      background: '#18181B', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#71717A', fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}
