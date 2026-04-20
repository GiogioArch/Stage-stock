# KPI Detail Sheets — Intégration dans Board.jsx

## Objectif
Chaque KPI du Board devient cliquable. Un tap ouvre un bottom sheet avec le détail complet.

## Import

```jsx
import { useKpiSheet } from './kpiSheets'
// ou
import { useKpiSheet } from './kpiSheets/useKpiSheet'
```

## Hook

```jsx
export default function Board({ products, stock, events, sales, saleItems,
                                movements, purchaseOrders, suppliers, locations, ... }) {
  const { openSheet, SheetRenderer } = useKpiSheet()

  // …tout le code existant du Board reste intact…

  return (
    <>
      {/* …JSX existant… */}

      {/* Ajouter onClick sur chaque carte KPI */}
      <KpiCard label="CA 30 j" value={fmtEuro(salesKpis.ca30)} onClick={() => openSheet('ca30')} />
      <KpiCard label="Panier moyen" value={fmtEuro(salesKpis.basket)} onClick={() => openSheet('panier')} />
      {/* …etc. */}

      {/* Renderer : UNE SEULE FOIS, en fin de JSX */}
      <SheetRenderer data={{
        sales, saleItems, events, products, stock, locations,
        movements, purchaseOrders, suppliers,
      }} />
    </>
  )
}
```

## Mapping KPI → clé

| KPI Board                   | Clé                  | Accent  |
|-----------------------------|----------------------|---------|
| CA 30 jours                 | `'ca30'`             | vert    |
| Ventes aujourd'hui          | `'salesToday'`       | vert    |
| Panier moyen                | `'panier'`           | vert    |
| Top produit 30j             | `'topProduct'`       | vert    |
| Meilleur concert 30j        | `'bestConcert'`      | vert    |
| Transactions 30j            | `'transactions'`     | vert    |
| Valeur stock                | `'stockValue'`       | bleu    |
| CA potentiel                | `'caPotentiel'`      | orange  |
| Rotation 30j                | `'rotation'`         | bleu    |
| Dormants / Morts / Surstock | `'stockHealth'`      | rose    |
| Commandes en cours          | `'ordersInProgress'` | rose    |

## UX du bottom sheet

- Slide up 250 ms ease-out
- Backdrop `rgba(0,0,0,0.5)` cliquable
- Poignée (grip bar) en haut : drag down > 100 px OU flick > 40 px en < 250 ms → fermeture
- Escape ferme aussi
- Focus trap automatique
- Body scrollable, footer optionnel fixe

## Règles

- Les calculs se font 100 % côté front (zéro requête Supabase ajoutée)
- Si données < 5 transactions (panier moyen) → message "Données insuffisantes"
- Chaque fiche est `useMemo`-pée pour éviter le recalcul à chaque render
- Accent couleur respecte la charte BackStage :
  - Ventes → vert `#5DAB8B`
  - Stock  → bleu `#5B8DB8`
  - Finance → orange `#E8935A`
  - Achats / alertes → rose `#D4648A`

## Tests manuels recommandés

1. Tap sur carte KPI → sheet apparaît avec slide-up
2. Tap backdrop → ferme
3. Tap X → ferme
4. Escape → ferme
5. Drag down sur poignée → ferme au-delà de 100 px
6. Tab cycle dans la sheet (focus trap)
7. Body scrolle, footer reste fixe
8. Export CSV dans CaThirtyDays / Transactions / StockValue
