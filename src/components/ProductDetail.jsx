import React, { useState, useMemo } from 'react'
import { Badge, getCat, fmtDate, getMoveConf } from './UI'

// ─── Forecast helpers (same logic as Forecast.jsx) ───
const CONV_RATES = {
  'concert live': 0.11, 'concert': 0.11, 'live': 0.11,
  'sound system': 0.07, 'soundsystem': 0.07,
  'impro': 0.135, 'improvisation': 0.135,
}
const TERR_MULT = { 'martinique': 1.0, 'guadeloupe': 0.85 }

function getRate(format) {
  return CONV_RATES[(format || '').toLowerCase().trim()] || 0.10
}
function getMult(territoire) {
  return TERR_MULT[(territoire || '').toLowerCase().trim()] || 0.90
}

const SECTIONS = [
  { id: 'resume', label: 'Résumé', icon: '📋' },
  { id: 'stock', label: 'Stock', icon: '📍' },
  { id: 'mouvements', label: 'Mouvements', icon: '📦' },
  { id: 'concerts', label: 'Concerts', icon: '🎪' },
  { id: 'compta', label: 'Compta', icon: '💰' },
]

export default function ProductDetail({ product, stock, locations, movements, events, eventPacking, products, userRole, onClose, onEdit, onDelete, onToast }) {
  const [section, setSection] = useState('resume')

  const cat = getCat(product.category)

  // ─── Stock data ───
  const productStock = useMemo(() =>
    stock.filter(s => s.product_id === product.id),
    [stock, product.id]
  )
  const totalQty = productStock.reduce((sum, s) => sum + (s.quantity || 0), 0)
  const maxLocQty = Math.max(1, ...productStock.map(s => s.quantity || 0))

  // ─── Movement history ───
  const productMoves = useMemo(() =>
    movements.filter(m => m.product_id === product.id),
    [movements, product.id]
  )

  // Movement stats
  const moveStats = useMemo(() => {
    const ins = productMoves.filter(m => m.type === 'in')
    const outs = productMoves.filter(m => m.type === 'out')
    const transfers = productMoves.filter(m => m.type === 'transfer')
    const totalIn = ins.reduce((s, m) => s + (m.quantity || 0), 0)
    const totalOut = outs.reduce((s, m) => s + (m.quantity || 0), 0)
    return { ins: ins.length, outs: outs.length, transfers: transfers.length, totalIn, totalOut }
  }, [productMoves])

  // ─── Concert linkage ───
  const today = new Date().toISOString().split('T')[0]

  // Events that have this product in packing list
  const linkedEvents = useMemo(() => {
    const packingForProduct = (eventPacking || []).filter(ep => ep.product_id === product.id)
    return events.map(ev => {
      const packing = packingForProduct.find(ep => ep.event_id === ev.id)
      // Forecast projection for merch
      const isMerch = product.category === 'merch'
      const totalMerchStock = isMerch
        ? products.filter(p => p.category === 'merch').reduce((s, p) =>
          s + stock.filter(st => st.product_id === p.id).reduce((ss, st) => ss + (st.quantity || 0), 0), 0)
        : 0
      const totalMerchProducts = isMerch ? products.filter(p => p.category === 'merch').length : 0
      const projectedEventSales = isMerch && ev.capacite
        ? Math.round((ev.capacite * getRate(ev.format) * getMult(ev.territoire)) * (totalMerchProducts > 0 ? totalQty / Math.max(1, totalMerchStock) : 0))
        : 0

      return {
        ...ev,
        packing,
        projectedSales: projectedEventSales,
        isPast: ev.date < today,
        daysUntil: Math.ceil((new Date(ev.date) - new Date()) / 86400000),
      }
    }).filter(ev => ev.packing || (product.category === 'merch' && ev.date >= today))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events, eventPacking, product, products, stock, totalQty, today])

  // ─── CA per concert (from movements out linked to events) ───
  const caPerConcert = useMemo(() => {
    // Group out movements by date proximity to events
    const result = []
    const outMoves = productMoves.filter(m => m.type === 'out')
    events.filter(e => e.date < today).forEach(ev => {
      const evDate = new Date(ev.date)
      // Movements within 2 days of the event
      const eventMoves = outMoves.filter(m => {
        const mDate = new Date(m.created_at)
        const diff = Math.abs(mDate - evDate) / 86400000
        return diff <= 2
      })
      const qty = eventMoves.reduce((s, m) => s + (m.quantity || 0), 0)
      if (qty > 0) {
        const prixUnit = product.selling_price || product.cost_ht || 25
        result.push({ event: ev, qty, ca: Math.round(qty * prixUnit) })
      }
    })
    return result
  }, [productMoves, events, product, today])

  // Location name helper
  const lName = (id) => locations.find(l => l.id === id)?.name || '?'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
      overflowY: 'auto',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      {/* ─── Top bar ─── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,248,240,0.95)', backdropFilter: 'blur(16px)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #F0E8E4',
      }}>
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 14, fontWeight: 700, color: '#E8735A',
        }}>
          ← Retour
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEdit} style={{
            padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: '#EEF4FA', color: '#5B8DB8', border: '1px solid #5B8DB830',
          }}>Modifier</button>
          <button onClick={onDelete} style={{
            padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: '#FDF0F4', color: '#D4648A', border: '1px solid #D4648A30',
          }}>Supprimer</button>
        </div>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>

        {/* ─── Header card with photo ─── */}
        <div className="card" style={{
          marginBottom: 16, padding: '20px 16px',
          background: `linear-gradient(135deg, ${cat.color}06, ${cat.color}14)`,
          border: `1.5px solid ${cat.color}20`,
        }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {/* Photo placeholder */}
            <div style={{
              width: 80, height: 80, borderRadius: 16, flexShrink: 0,
              background: product.photo_url ? 'none' : cat.bg,
              border: `2px dashed ${cat.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: product.photo_url ? 0 : 36, overflow: 'hidden',
            }}>
              {product.photo_url ? (
                <img src={product.photo_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                product.image || cat.icon
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#3D3042', marginBottom: 4, lineHeight: 1.2 }}>
                {product.name}
              </div>
              <div style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600, marginBottom: 8 }}>
                SKU: {product.sku}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Badge color={cat.color}>{cat.icon} {cat.name}</Badge>
                {product.variants && <Badge color="#9A8B94">{product.variants}</Badge>}
                {product.unit && product.unit !== 'pièce' && <Badge color="#5B8DB8">{product.unit}</Badge>}
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div style={{
              marginTop: 14, padding: '10px 12px', borderRadius: 10,
              background: 'white', border: '1px solid #F0E8E4',
              fontSize: 13, color: '#3D3042', lineHeight: 1.6,
            }}>
              {product.description}
            </div>
          )}
        </div>

        {/* ─── KPI row ─── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <KpiCard
            label="Stock total"
            value={totalQty}
            color={totalQty === 0 ? '#D4648A' : totalQty <= (product.min_stock || 5) ? '#E8935A' : '#5DAB8B'}
            sub={`seuil: ${product.min_stock || 5}`}
          />
          <KpiCard
            label="Entrées"
            value={moveStats.totalIn}
            color="#5DAB8B"
            sub={`${moveStats.ins} mvts`}
          />
          <KpiCard
            label="Sorties"
            value={moveStats.totalOut}
            color="#D4648A"
            sub={`${moveStats.outs} mvts`}
          />
          <KpiCard
            label="Concerts"
            value={linkedEvents.length}
            color="#E8735A"
            sub={`liés`}
          />
        </div>

        {/* ─── Section tabs ─── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              padding: '7px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              whiteSpace: 'nowrap', cursor: 'pointer',
              border: `1.5px solid ${section === s.id ? cat.color : '#E8DED8'}`,
              background: section === s.id ? `${cat.color}12` : 'white',
              color: section === s.id ? cat.color : '#9A8B94',
            }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* ═══════════ RÉSUMÉ ═══════════ */}
        {section === 'resume' && (
          <div>
            {/* Identité */}
            <SectionLabel>Identité produit</SectionLabel>
            <div className="card" style={{ marginBottom: 14, padding: '14px 16px' }}>
              <InfoRow label="Nom" value={product.name} />
              <InfoRow label="SKU" value={product.sku} />
              <InfoRow label="Catégorie" value={`${cat.icon} ${cat.name}`} />
              {product.variants && <InfoRow label="Variantes" value={product.variants} />}
              <InfoRow label="Unité" value={product.unit || 'pièce'} />
              <InfoRow label="Seuil alerte" value={`${product.min_stock || 5} unités`} />
              {product.purchase_date && (
                <InfoRow label="Date d'achat" value={new Date(product.purchase_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />
              )}
              {product.cost_ht != null && product.cost_ht > 0 && (
                <InfoRow label="Coût HT" value={`${product.cost_ht.toFixed(2)} €`} />
              )}
              {product.selling_price != null && product.selling_price > 0 && (
                <InfoRow label="Prix de vente" value={`${product.selling_price.toFixed(2)} €`} />
              )}
            </div>

            {/* Qui / Quoi / Où / Quand / Comment */}
            <SectionLabel>Fiche opérationnelle</SectionLabel>
            <div className="card" style={{ marginBottom: 14, padding: '14px 16px' }}>
              <OpRow icon="👤" label="Qui" value={userRole ? `Géré par ${userRole.name}` : 'Tout le monde'} />
              <OpRow icon="📦" label="Quoi" value={`${totalQty} en stock, ${productStock.filter(s => s.quantity > 0).length} lieu(x)`} />
              <OpRow icon="📍" label="Où" value={productStock.filter(s => s.quantity > 0).map(s => lName(s.location_id)).join(', ') || 'Aucun stock'} />
              <OpRow icon="📅" label="Quand" value={product.purchase_date ? `Acheté le ${new Date(product.purchase_date).toLocaleDateString('fr-FR')}` : 'Date non renseignée'} />
              <OpRow icon="🔄" label="Comment" value={`${moveStats.ins + moveStats.outs + moveStats.transfers} mouvements enregistrés`} />
              <OpRow icon="🎪" label="Avec quoi" value={linkedEvents.length > 0 ? `${linkedEvents.length} concert(s) lié(s)` : 'Aucun concert lié'} />
            </div>

            {/* CA par concert (si historique) */}
            {caPerConcert.length > 0 && (
              <>
                <SectionLabel>CA par concert</SectionLabel>
                <div className="card" style={{ marginBottom: 14, padding: '14px 16px' }}>
                  {caPerConcert.map((c, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: i < caPerConcert.length - 1 ? '1px solid #F0E8E4' : 'none',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{c.event.name || c.event.lieu}</div>
                        <div style={{ fontSize: 11, color: '#9A8B94' }}>
                          {new Date(c.event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {c.qty} vendus
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#5DAB8B' }}>{c.ca}€</div>
                    </div>
                  ))}
                  <div style={{
                    marginTop: 8, paddingTop: 8, borderTop: '2px solid #F0E8E4',
                    display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>Total</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#5DAB8B' }}>
                      {caPerConcert.reduce((s, c) => s + c.ca, 0)}€
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════ STOCK ═══════════ */}
        {section === 'stock' && (
          <div>
            {/* Total */}
            <div className="card" style={{
              textAlign: 'center', marginBottom: 16, padding: 20,
              background: totalQty === 0 ? '#FDF0F4' : totalQty <= (product.min_stock || 5) ? '#FEF6F0' : '#EDF7F2',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9A8B94', textTransform: 'uppercase', letterSpacing: 1 }}>Stock total</div>
              <div style={{
                fontSize: 48, fontWeight: 900, lineHeight: 1.1,
                color: totalQty === 0 ? '#D4648A' : totalQty <= (product.min_stock || 5) ? '#E8935A' : '#5DAB8B',
              }}>{totalQty}</div>
              <div style={{ fontSize: 12, color: '#9A8B94', marginTop: 4 }}>
                Seuil min : {product.min_stock || 5} · Unité : {product.unit || 'pièce'}
              </div>
              {totalQty === 0 && <Badge color="#D4648A">RUPTURE DE STOCK</Badge>}
              {totalQty > 0 && totalQty <= (product.min_stock || 5) && <Badge color="#E8935A">STOCK BAS</Badge>}
            </div>

            {/* By location with bar chart */}
            <SectionLabel>Répartition par dépôt</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {locations.map(loc => {
                const s = productStock.find(st => st.location_id === loc.id)
                const qty = s?.quantity || 0
                const pct = maxLocQty > 0 ? (qty / maxLocQty) * 100 : 0
                return (
                  <div key={loc.id} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{loc.icon || '📍'}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{loc.name}</span>
                      </div>
                      <span style={{
                        fontSize: 18, fontWeight: 900,
                        color: qty > 0 ? '#3D3042' : '#B8A0AE',
                      }}>{qty}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#F0E8E4', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: qty > 0 ? cat.color : 'transparent',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══════════ MOUVEMENTS ═══════════ */}
        {section === 'mouvements' && (
          <div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <StatPill icon="📥" label="Entrées" value={moveStats.totalIn} count={moveStats.ins} color="#5DAB8B" />
              <StatPill icon="📤" label="Sorties" value={moveStats.totalOut} count={moveStats.outs} color="#D4648A" />
              <StatPill icon="🔄" label="Transferts" value={moveStats.transfers} count={moveStats.transfers} color="#5B8DB8" />
            </div>

            {/* List */}
            {productMoves.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-icon">📋</div>
                <div className="empty-text">Aucun mouvement enregistré</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {productMoves.map(m => {
                  const conf = getMoveConf(m.type)
                  return (
                    <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: conf.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                      }}>{conf.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: conf.color }}>
                          {conf.label}
                          <span style={{ fontWeight: 400, color: '#9A8B94', marginLeft: 6, fontSize: 11 }}>
                            {m.type === 'transfer'
                              ? `${lName(m.from_loc)} → ${lName(m.to_loc)}`
                              : lName(m.type === 'in' ? m.to_loc : m.from_loc)
                            }
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: '#B8A0AE', marginTop: 2 }}>
                          {fmtDate(m.created_at)}
                          {m.note && ` · ${m.note}`}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 16, fontWeight: 900,
                        color: m.type === 'out' ? '#D4648A' : m.type === 'in' ? '#5DAB8B' : '#5B8DB8',
                      }}>
                        {m.type === 'out' ? '−' : m.type === 'in' ? '+' : '↔'}{m.quantity}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ CONCERTS ═══════════ */}
        {section === 'concerts' && (
          <div>
            {linkedEvents.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-icon">🎪</div>
                <div className="empty-text">Aucun concert lié à ce produit</div>
              </div>
            ) : (
              <>
                {/* Future events */}
                {linkedEvents.filter(e => !e.isPast).length > 0 && (
                  <>
                    <SectionLabel>Concerts à venir</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {linkedEvents.filter(e => !e.isPast).map(ev => (
                        <div key={ev.id} className="card" style={{
                          padding: '12px 14px',
                          borderLeft: `4px solid ${ev.daysUntil <= 7 ? '#E8935A' : '#5B8DB8'}`,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042' }}>
                                {ev.name || ev.lieu}
                              </div>
                              <div style={{ fontSize: 11, color: '#9A8B94', marginTop: 2 }}>
                                {new Date(ev.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                                {' · '}{ev.ville} · {ev.format}
                              </div>
                            </div>
                            <Badge color={ev.daysUntil <= 3 ? '#D4648A' : ev.daysUntil <= 7 ? '#E8935A' : '#5B8DB8'}>
                              J-{ev.daysUntil}
                            </Badge>
                          </div>

                          {/* Needs */}
                          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                            {ev.packing && (
                              <MiniInfo label="Besoin packing" value={ev.packing.quantity_needed} color="#E8735A" />
                            )}
                            {ev.projectedSales > 0 && (
                              <MiniInfo label="Ventes proj." value={`~${ev.projectedSales}`} color="#E8935A" />
                            )}
                            {ev.capacite && (
                              <MiniInfo label="Capacité" value={ev.capacite} color="#5B8DB8" />
                            )}
                          </div>

                          {/* Sufficiency check */}
                          {ev.packing && (
                            <div style={{ marginTop: 8 }}>
                              {totalQty >= ev.packing.quantity_needed ? (
                                <div style={{ fontSize: 11, color: '#5DAB8B', fontWeight: 700 }}>
                                  Stock suffisant ({totalQty} dispo / {ev.packing.quantity_needed} requis)
                                </div>
                              ) : (
                                <div style={{ fontSize: 11, color: '#D4648A', fontWeight: 700 }}>
                                  Stock insuffisant ! Manque {ev.packing.quantity_needed - totalQty} unité(s)
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Past events */}
                {linkedEvents.filter(e => e.isPast).length > 0 && (
                  <>
                    <SectionLabel>Concerts passés</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {linkedEvents.filter(e => e.isPast).map(ev => {
                        const concertCA = caPerConcert.find(c => c.event.id === ev.id)
                        return (
                          <div key={ev.id} className="card" style={{ padding: '10px 14px', opacity: 0.8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{ev.name || ev.lieu}</div>
                                <div style={{ fontSize: 11, color: '#9A8B94' }}>
                                  {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {ev.ville}
                                </div>
                              </div>
                              {concertCA && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: 14, fontWeight: 900, color: '#5DAB8B' }}>{concertCA.ca}€</div>
                                  <div style={{ fontSize: 10, color: '#9A8B94' }}>{concertCA.qty} vendus</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════ COMPTABILITÉ ═══════════ */}
        {section === 'compta' && (
          <div>
            {product.cost_ht > 0 ? (
              <>
                <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
                  <InfoRow label="Coût HT unitaire" value={`${product.cost_ht.toFixed(2)} €`} />
                  <InfoRow label="Coût total" value={`${(product.cost_ht * totalQty).toFixed(2)} €`} />
                  {product.selling_price > 0 && (
                    <>
                      <InfoRow label="Prix de vente" value={`${product.selling_price.toFixed(2)} €`} />
                      <InfoRow label="Marge unitaire" value={`${(product.selling_price - product.cost_ht).toFixed(2)} € (${Math.round(((product.selling_price - product.cost_ht) / product.selling_price) * 100)}%)`} />
                    </>
                  )}
                  {product.purchase_date && (
                    <InfoRow label="Date d'achat" value={new Date(product.purchase_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />
                  )}
                  <div style={{
                    marginTop: 8, padding: '8px 12px', borderRadius: 8,
                    background: product.cost_ht >= 500 ? '#EEF4FA' : '#FEF6F0',
                  }}>
                    <span style={{
                      fontSize: 12, fontWeight: 800,
                      color: product.cost_ht >= 500 ? '#5B8DB8' : '#E8935A',
                    }}>
                      {product.cost_ht >= 500 ? 'Immobilisation' : 'Charge'} — {product.cost_ht >= 500 ? 'amortissement linéaire' : 'sous le seuil de 500€ HT'}
                    </span>
                  </div>
                </div>

                {/* Amortissement */}
                {product.cost_ht >= 500 && product.useful_life_months && product.purchase_date && (() => {
                  const months = product.useful_life_months
                  const monthsElapsed = Math.max(0,
                    (new Date().getFullYear() - new Date(product.purchase_date).getFullYear()) * 12
                    + new Date().getMonth() - new Date(product.purchase_date).getMonth()
                  )
                  const monthlyDepr = product.cost_ht / months
                  const cumDepr = Math.min(product.cost_ht, monthlyDepr * monthsElapsed)
                  const nbv = Math.max(0, product.cost_ht - cumDepr)
                  const pct = Math.round((cumDepr / product.cost_ht) * 100)
                  const endDate = new Date(product.purchase_date)
                  endDate.setMonth(endDate.getMonth() + months)

                  return (
                    <div className="card" style={{ padding: '14px 16px' }}>
                      <SectionLabel>Amortissement linéaire</SectionLabel>
                      <InfoRow label="Durée" value={`${months} mois (${Math.round(months / 12)} ans)`} />
                      <InfoRow label="Dotation mensuelle" value={`${monthlyDepr.toFixed(2)} €`} />
                      <InfoRow label="Mois écoulés" value={`${Math.min(monthsElapsed, months)} / ${months}`} />
                      <InfoRow label="Amortissement cumulé" value={`${cumDepr.toFixed(2)} €`} />
                      <InfoRow label="Fin amortissement" value={endDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} />

                      <div style={{ margin: '12px 0 8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: '#9A8B94' }}>Amorti : {pct}%</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: nbv > 0 ? '#5B8DB8' : '#5DAB8B' }}>VNC : {nbv.toFixed(2)}€</span>
                        </div>
                        <div style={{ height: 10, borderRadius: 5, background: '#F0E8E4', overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', borderRadius: 5,
                            background: 'linear-gradient(90deg, #5B8DB8, #5DAB8B)',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>

                      <div style={{
                        marginTop: 10, padding: '8px 10px', borderRadius: 8,
                        background: '#FEF6F0', fontSize: 10, color: '#E8935A', lineHeight: 1.5, fontWeight: 600,
                      }}>
                        Amortissement linéaire, prorata temporis base 360j. Durées à valider par expert-comptable.
                      </div>
                    </div>
                  )
                })()}
              </>
            ) : (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-icon">💰</div>
                <div className="empty-text">Aucune donnée comptable</div>
                <div style={{ fontSize: 12, color: '#B8A0AE', marginTop: 4 }}>Renseigner le coût HT pour activer le suivi</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 800, color: '#9A8B94',
      textTransform: 'uppercase', letterSpacing: 1.5,
      marginBottom: 10, marginTop: 4, padding: '0 2px',
    }}>{children}</div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0', borderBottom: '1px solid #F0E8E420',
    }}>
      <span style={{ fontSize: 12, color: '#9A8B94', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#3D3042', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

function OpRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0', borderBottom: '1px solid #F0E8E420',
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#9A8B94', minWidth: 60 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#3D3042', flex: 1 }}>{value}</span>
    </div>
  )
}

function KpiCard({ label, value, color, sub }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '10px 4px',
      background: 'white', borderRadius: 14, border: '1px solid #F0E8E4',
      boxShadow: '0 2px 8px rgba(180,150,130,0.06)',
    }}>
      <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#9A8B94', fontWeight: 700, marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 8, color: '#B8A0AE', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function StatPill({ icon, label, value, count, color }) {
  return (
    <div className="card" style={{ flex: 1, textAlign: 'center', padding: '10px 6px' }}>
      <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 9, color: '#9A8B94', fontWeight: 700 }}>{label}</div>
    </div>
  )
}

function MiniInfo({ label, value, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '6px 4px',
      background: `${color}08`, borderRadius: 8, border: `1px solid ${color}15`,
    }}>
      <div style={{ fontSize: 14, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 9, color: '#9A8B94', fontWeight: 600 }}>{label}</div>
    </div>
  )
}
