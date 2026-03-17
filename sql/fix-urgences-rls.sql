-- ============================================================
-- FIX URGENCES SÉCURITÉ RLS — Stage Stock
-- ============================================================

-- 1. CORRECTION DES TABLES ACHATS (create-purchasing.sql)
DO $$ 
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['suppliers', 'purchase_orders', 'purchase_order_lines', 'purchase_receipts'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'allow_auth_' || t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete', t);

    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_delete', t);
  END LOOP;
END $$;

-- 2. CORRECTION DES TABLES VENTES (create-sales-pos.sql)
DO $$ 
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sales', 'sale_items', 'cash_reports'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'allow_auth_' || t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete', t);

    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_delete', t);
  END LOOP;
END $$;

-- 3. CORRECTION DES TABLES TRANSPORT (phase1_transport_partnerships.sql)
DO $$ 
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transport_providers', 'vehicles', 'transport_routes', 'transport_needs', 
    'transport_bookings', 'transport_manifests', 'transport_costs',
    'partners', 'partner_contacts', 'partner_interactions', 'partnership_agreements',
    'partnership_deliverables', 'partner_events', 'partner_documents', 'expenses'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'allow_auth_' || t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete', t);

    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (org_id IN (SELECT get_user_org_ids(auth.uid())))', t || '_delete', t);
  END LOOP;
END $$;
