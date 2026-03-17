# Plan d'Action : Résolution des Urgences de Sécurité

**Projet :** Stage Stock
**Date :** 17 Mars 2026
**Auteur :** Manus AI

Ce document détaille le plan d'action opérationnel pour résoudre les trois vulnérabilités critiques identifiées lors de l'audit du projet Stage Stock. Ces correctifs sont indispensables avant toute mise en production ou commercialisation en mode SaaS multi-tenant.

---

## Urgence 1 : Politiques RLS (Row Level Security) Incomplètes

### Constat
L'audit a révélé que plusieurs tables critiques utilisent des politiques RLS permissives (`USING (true)` ou `WITH CHECK (true)`). Cela signifie que n'importe quel utilisateur authentifié peut lire, modifier ou supprimer les données de **toutes les organisations**, brisant ainsi l'isolation multi-tenant.

Les tables concernées sont :
- **Achats :** `suppliers`, `purchase_orders`, `purchase_order_lines`, `purchase_receipts`
- **Ventes :** `sales`, `sale_items`, `cash_reports`
- **Transport :** `transport_providers`, `vehicles`, `transport_routes`, `transport_needs`, `transport_bookings`, `transport_manifests`, `transport_costs`, `partners`, `partner_contacts`, `partner_interactions`, `partnership_agreements`, `partnership_deliverables`, `partner_events`, `partner_documents`, `expenses`

### Plan d'Action
1. **Exécuter le script SQL correctif :** Un script unifié (`fix-urgences-rls.sql`) a été préparé. Il supprime les anciennes politiques permissives et les remplace par des politiques strictes basées sur la fonction `get_user_org_ids(auth.uid())`.
2. **Vérification :** Après exécution, vérifier via l'interface Supabase que chaque table possède bien 4 politiques (SELECT, INSERT, UPDATE, DELETE) restreintes à l'organisation de l'utilisateur.

---

## Urgence 2 : Vulnérabilité du LiveShop (Interface Fans)

### Constat
Le module `LiveShop.jsx` permet aux fans (utilisateurs non authentifiés) de passer des commandes de merchandising. Actuellement, le code effectue des insertions directes (`db.insert('live_orders', ...)`) sans aucune restriction côté base de données. Un attaquant pourrait saturer la base de fausses commandes ou modifier les commandes existantes.

### Plan d'Action
1. **Création et Sécurisation des Tables :** Exécuter le script `fix-urgences-liveshop.sql`. Ce script :
   - Crée les tables `live_orders` et `live_order_items` si elles n'existent pas.
   - Active le RLS sur ces tables.
   - Crée des politiques spécifiques pour les utilisateurs anonymes (insertion autorisée, lecture restreinte à leurs propres commandes via un identifiant unique `fan_id`).
   - Crée des politiques pour le staff (lecture et mise à jour restreintes aux événements de leur organisation).
2. **Mise à jour du Frontend :** Le code actuel de `LiveShop.jsx` est déjà compatible avec cette structure, car il génère un `fan_id` unique stocké dans le `localStorage`. La sécurité est désormais assurée par la base de données.

---

## Urgence 3 : Transactions Non Atomiques dans ConcertMode

### Constat
Dans `ConcertMode.jsx`, la fonction `processSale` effectue plusieurs opérations séquentielles côté client :
1. Création de la vente (`sales`)
2. Création des lignes de vente (`sale_items`)
3. Décrémentation des stocks (`stock`)

Si une erreur réseau survient entre l'étape 1 et 3, la base de données se retrouve dans un état incohérent (vente enregistrée mais stock non décrémenté).

### Plan d'Action
1. **Création d'une Procédure Stockée (RPC) :** Exécuter le script `fix-urgences-transactions.sql`. Ce script crée une fonction PostgreSQL `process_sale` qui exécute toutes ces opérations au sein d'une transaction unique et atomique. Si une étape échoue, tout est annulé (rollback).
2. **Refactoring de `ConcertMode.jsx` :** Remplacer la logique séquentielle actuelle par un appel unique à la procédure stockée.

**Code JavaScript à remplacer dans `ConcertMode.jsx` :**

```javascript
// Remplacer le bloc try/catch actuel de processSale par :
try {
  const saleNum = `V${Date.now().toString(36).toUpperCase()}`
  
  // Préparer le payload des articles
  const itemsPayload = cart.map(item => ({
    product_id: item.productId,
    variant: item.variant,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.lineTotal
  }))

  // Appel atomique à la procédure stockée
  await db.rpc('process_sale', {
    p_org_id: orgId,
    p_event_id: selectedEvent?.id || null,
    p_sale_number: saleNum,
    p_payment_method: payMethod,
    p_total_amount: cartTotal,
    p_items_count: cartCount,
    p_sold_by: userId,
    p_items: itemsPayload
  })

  // Log + reset (inchangé)
  setSalesLog(prev => [{
    num: saleNum,
    total: cartTotal,
    count: cartCount,
    method: payMethod,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }, ...prev])
  
  clearCart()
  setShowPayment(false)
  onToast(`Vente ${saleNum} — ${cartTotal}€`)
  if (onReload) onReload()
} catch (e) {
  onToast('Erreur : ' + e.message, '#7C3AED')
}
```

---

## Livrables Fournis

Les scripts SQL suivants ont été générés et sont prêts à être exécutés dans l'éditeur SQL de Supabase :
1. `/home/ubuntu/stage-stock/sql/fix-urgences-rls.sql`
2. `/home/ubuntu/stage-stock/sql/fix-urgences-liveshop.sql`
3. `/home/ubuntu/stage-stock/sql/fix-urgences-transactions.sql`

L'exécution de ces trois scripts, couplée à la modification mineure de `ConcertMode.jsx`, résoudra définitivement les trois urgences de sécurité.
