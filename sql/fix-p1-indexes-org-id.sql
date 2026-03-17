-- ============================================================
-- P1 FIX: Index org_id sur toutes les tables manquantes
-- Exécuté le 17 Mars 2026
-- ============================================================
-- Ces index évitent les Sequential Scans sur les requêtes
-- filtrées par org_id (multi-tenant). Sans eux, chaque requête
-- RLS parcourt toute la table.
-- ============================================================

-- Achats
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON suppliers(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_org_id ON purchase_order_lines(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_org_id ON purchase_receipts(org_id);

-- Ventes
CREATE INDEX IF NOT EXISTS idx_cash_reports_org_id ON cash_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_org_id ON sale_items(org_id);

-- Finance
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON expenses(org_id);

-- Partenaires
CREATE INDEX IF NOT EXISTS idx_partners_org_id ON partners(org_id);
CREATE INDEX IF NOT EXISTS idx_partner_contacts_org_id ON partner_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_partner_documents_org_id ON partner_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_partner_events_org_id ON partner_events(org_id);
CREATE INDEX IF NOT EXISTS idx_partner_interactions_org_id ON partner_interactions(org_id);
CREATE INDEX IF NOT EXISTS idx_partnership_agreements_org_id ON partnership_agreements(org_id);
CREATE INDEX IF NOT EXISTS idx_partnership_deliverables_org_id ON partnership_deliverables(org_id);

-- Transport
CREATE INDEX IF NOT EXISTS idx_transport_bookings_org_id ON transport_bookings(org_id);
CREATE INDEX IF NOT EXISTS idx_transport_costs_org_id ON transport_costs(org_id);
CREATE INDEX IF NOT EXISTS idx_transport_manifests_org_id ON transport_manifests(org_id);
CREATE INDEX IF NOT EXISTS idx_transport_needs_org_id ON transport_needs(org_id);
CREATE INDEX IF NOT EXISTS idx_transport_providers_org_id ON transport_providers(org_id);
CREATE INDEX IF NOT EXISTS idx_transport_routes_org_id ON transport_routes(org_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_org_id ON vehicles(org_id);

-- Équipe
CREATE INDEX IF NOT EXISTS idx_event_task_templates_org_id ON event_task_templates(org_id);
