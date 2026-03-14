-- ══════════════════════════════════════════════════════════════
-- PHASE 1 — Transport + Partenariats + Expenses
-- Stage Stock v11.0
-- Fichier UNIQUE, idempotent (ON CONFLICT / IF NOT EXISTS)
-- ══════════════════════════════════════════════════════════════

-- ─── 1. TRANSPORT ───────────────────────────────────────────

-- Prestataires de transport (ferry, camion, location véhicule…)
CREATE TABLE IF NOT EXISTS transport_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ferry', -- ferry, truck, van, car, other
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Véhicules / navires
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  provider_id UUID REFERENCES transport_providers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'truck', -- truck, van, ferry, car
  plate TEXT,
  capacity_kg NUMERIC,
  capacity_m3 NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Routes habituelles (ex: Fort-de-France → Pointe-à-Pitre)
CREATE TABLE IF NOT EXISTS transport_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance_km NUMERIC,
  duration_hours NUMERIC,
  default_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Besoins transport par événement
CREATE TABLE IF NOT EXISTS transport_needs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'equipment', -- equipment, merch, people, other
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  weight_kg NUMERIC,
  volume_m3 NUMERIC,
  priority TEXT DEFAULT 'normal', -- low, normal, high, critical
  status TEXT DEFAULT 'pending', -- pending, booked, in_transit, delivered
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Réservations transport (booking d'un véhicule/prestataire pour un besoin)
CREATE TABLE IF NOT EXISTS transport_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  need_id UUID REFERENCES transport_needs(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES transport_providers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  route_id UUID REFERENCES transport_routes(id) ON DELETE SET NULL,
  departure_date DATE,
  arrival_date DATE,
  cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'confirmed', -- pending, confirmed, cancelled
  booking_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Manifestes (qui/quoi est dans chaque transport)
CREATE TABLE IF NOT EXISTS transport_manifests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  booking_id UUID REFERENCES transport_bookings(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'product', -- product, equipment, person
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  weight_kg NUMERIC,
  checked_in BOOLEAN DEFAULT false,
  checked_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Coûts transport (pour ventilation dans Finance)
CREATE TABLE IF NOT EXISTS transport_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  booking_id UUID REFERENCES transport_bookings(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'transport', -- transport, fuel, toll, parking, other
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ─── 2. PARTENARIATS / MÉCÉNAT ─────────────────────────────

-- Entreprises partenaires
CREATE TABLE IF NOT EXISTS partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'sponsor', -- sponsor, media, institutional, supplier, other
  sector TEXT,
  website TEXT,
  address TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'prospect', -- prospect, en_cours, accepte, refuse, termine
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contacts dans les entreprises
CREATE TABLE IF NOT EXISTS partner_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Historique des interactions (appels, mails, RDV…)
CREATE TABLE IF NOT EXISTS partner_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES partner_contacts(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT DEFAULT 'email', -- email, phone, meeting, event, other
  subject TEXT,
  notes TEXT,
  outcome TEXT, -- positif, neutre, negatif
  next_action TEXT,
  next_action_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Accords de partenariat
CREATE TABLE IF NOT EXISTS partnership_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'financial', -- financial, material, service, publicity, mixed
  status TEXT DEFAULT 'draft', -- draft, sent, negotiation, signed, active, expired
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  start_date DATE,
  end_date DATE,
  terms TEXT, -- Détails des termes de l'accord
  signed_date DATE,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Livrables / contreparties à fournir
CREATE TABLE IF NOT EXISTS partnership_deliverables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  agreement_id UUID REFERENCES partnership_agreements(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  type TEXT DEFAULT 'visibility', -- visibility, product, service, financial, other
  due_date DATE,
  status TEXT DEFAULT 'pending', -- pending, in_progress, done, cancelled
  value NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Liaison partenaires ↔ événements
CREATE TABLE IF NOT EXISTS partner_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES partnership_agreements(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'sponsor', -- sponsor, media_partner, supplier, other
  contribution TEXT,
  amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(partner_id, event_id)
);

-- Documents partenaires
CREATE TABLE IF NOT EXISTS partner_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES partnership_agreements(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  url TEXT,
  type TEXT DEFAULT 'contract', -- contract, invoice, brief, logo, other
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ─── 3. EXPENSES (pour Finance v2) ─────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'other', -- transport, lodging, food, equipment, merch_purchase, venue, marketing, admin, other
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  paid BOOLEAN DEFAULT false,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ─── 4. Ajout champs revenus sur events (si pas déjà là) ───

DO $$ BEGIN
  ALTER TABLE events ADD COLUMN IF NOT EXISTS ca_prevu NUMERIC DEFAULT 0;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS ca_reel NUMERIC DEFAULT 0;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS ventes_prevues INTEGER DEFAULT 0;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS ventes_reelles INTEGER DEFAULT 0;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_revenue NUMERIC DEFAULT 0;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS sponsor_revenue NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;


-- ─── 5. RLS POLICIES ───────────────────────────────────────

-- Enable RLS on all new tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transport_providers','vehicles','transport_routes','transport_needs',
    'transport_bookings','transport_manifests','transport_costs',
    'partners','partner_contacts','partner_interactions',
    'partnership_agreements','partnership_deliverables','partner_events',
    'partner_documents','expenses'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Allow authenticated users full access (multi-tenant will filter by org_id later)
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'allow_auth_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'allow_auth_' || t, t
    );
  END LOOP;
END $$;


-- ─── 6. VÉRIFICATION ───────────────────────────────────────

SELECT 'transport_providers' AS tbl, count(*) FROM transport_providers
UNION ALL SELECT 'vehicles', count(*) FROM vehicles
UNION ALL SELECT 'transport_routes', count(*) FROM transport_routes
UNION ALL SELECT 'transport_needs', count(*) FROM transport_needs
UNION ALL SELECT 'transport_bookings', count(*) FROM transport_bookings
UNION ALL SELECT 'transport_manifests', count(*) FROM transport_manifests
UNION ALL SELECT 'transport_costs', count(*) FROM transport_costs
UNION ALL SELECT 'partners', count(*) FROM partners
UNION ALL SELECT 'partner_contacts', count(*) FROM partner_contacts
UNION ALL SELECT 'partner_interactions', count(*) FROM partner_interactions
UNION ALL SELECT 'partnership_agreements', count(*) FROM partnership_agreements
UNION ALL SELECT 'partnership_deliverables', count(*) FROM partnership_deliverables
UNION ALL SELECT 'partner_events', count(*) FROM partner_events
UNION ALL SELECT 'partner_documents', count(*) FROM partner_documents
UNION ALL SELECT 'expenses', count(*) FROM expenses;
