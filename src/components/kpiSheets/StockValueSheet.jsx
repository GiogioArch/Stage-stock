import React, { useMemo, useState } from 'react'
import { Wallet, Download } from 'lucide-react'
import KpiDetailSheet from './KpiDetailSheet'
import { fmtEuro, fmtInt, Section, EmptyState, ActionButton, SortableTh } from './_shared'
import { exportCSV, todayISO } from '../../lib/csvExport'
import { BASE, SPACE, RADIUS, TYPO } from '../../lib/theme'

const ACCENT = '#5B8DB8'

export default function StockValueSheet({
  isOpen, onClose,
  stock = [], products = [], locations = [],
}) {
  const [mode, setMode] = useState('product') // 'product' | 'depot'
  const [sortKey, setSortKey] = useState('value')
  const [sortDir, setSortDir] = useState('desc')

  const calc = useMemo(() => {
    const pMap = Object.fromEntries((products || []).map(p => [p.id, p]))
    const lMap = Object.fromEntries((locations || []).map(l => [l.id, l]))

    const byProduct = {}
    const byLocation = {}
    let total = 0

    for (const s of stock || []) {
      const p = pMap[s.product_id]
      const qty = Number(s.quantity || 0)
      const cost = Number(p?.cost_ht || 0)
      const val = qty * cost
      total += val

      const pkey = s.product_id
      if (!byProduct[pkey]) byProduct[pkey] = { name: p?.name || 'Produit inconnu', qty: 0, value: 0, cost }
      byProduct[pkey].qty += qty
      byProduct[pkey].value += val

      const lkey = s.location_id
      if (lkey) {
        if (!byLocation[lkey]) byLocation[lkey] = { name: lMap[lkey]?.name || 'Dépôt inconnu', qty: 0, value: 0 }
        byLocation[lkey].qty += qty
        byLocation[lkey].value += val
      }
    }

    return {
      total,
      products: Object.values(byProduct),
      locations: Object.values(byLocation),
    }
  }, [stock, products, locations])

  const rows = mode === 'product' ? calc.products : calc.locations

  const sorted = useMemo(() => {
    const arr = [...rows]
    arr.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey]
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase() }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [rows, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const handleExport = () => {
    exportCSV(
      sorted,
      `valeur-stock-${mode}-${todayISO()}.csv`,
      [
        { key: 'name', label: mode === 'product' ? 'Produit' : 'Dépôt' },
        { key: 'qty', label: 'Quantité' },
        { key: 'value', label: 'Valeur (€)' },
      ]
    )
  }

  const tabStyle = (active) => ({
    padding: '6px 14px',
    borderRadius: 999,
    border: 'none',
    background: active ? ACCENT : BASE.bgHover,
    color: active ? '#fff' : BASE.textSoft,
    ...TYPO.caption,
    cursor: 'pointer',
  })

  return (
    <KpiDetailSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Valeur du stock"
      subtitle={`${fmtEuro(calc.total)} · ${rows.length} ${mode === 'product' ? 'produits' : 'dépôts'}`}
      accentColor={ACCENT}
      icon={Wallet}
      footer={
        <ActionButton onClick={handleExport} accent={ACCENT}
                      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Download size={16} /> Exporter CSV
        </ActionButton>
      }
    >
      {calc.total === 0 ? (
        <EmptyState message="Stock vide ou valeurs HT non renseignées." />
      ) : (
        <>
          <Section accent={ACCENT}>
            <div style={{ display: 'flex', gap: SPACE.sm }}>
              <button onClick={() => setMode('product')} style={tabStyle(mode === 'product')}>Par produit</button>
              <button onClick={() => setMode('depot')} style={tabStyle(mode === 'depot')}>Par dépôt</button>
            </div>
          </Section>

          <Section title="Breakdown" accent={ACCENT} right={
            <span style={{ ...TYPO.bodyBold, color: ACCENT }}>Total : {fmtEuro(calc.total)}</span>
          }>
            <div style={{
              background: BASE.bgSurface,
              borderRadius: RADIUS.lg,
              border: `1px solid ${BASE.border}`,
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <SortableTh label={mode === 'product' ? 'Produit' : 'Dépôt'} active={sortKey === 'name'}
                                direction={sortDir} onClick={() => toggleSort('name')} />
                    <SortableTh label="Qté" active={sortKey === 'qty'} direction={sortDir}
                                onClick={() => toggleSort('qty')} align="right" />
                    <SortableTh label="Valeur" active={sortKey === 'value'} direction={sortDir}
                                onClick={() => toggleSort('value')} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr key={i} style={{ borderBottom: i < sorted.length - 1 ? `1px solid ${BASE.border}` : 'none' }}>
                      <td style={{ padding: SPACE.sm, ...TYPO.body, color: BASE.text }}>{r.name}</td>
                      <td style={{ padding: SPACE.sm, ...TYPO.body, color: BASE.textSoft, textAlign: 'right' }}>
                        {fmtInt(r.qty)}
                      </td>
                      <td style={{ padding: SPACE.sm, ...TYPO.bodyBold, color: ACCENT, textAlign: 'right' }}>
                        {fmtEuro(r.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </KpiDetailSheet>
  )
}
