-- ============================================================
-- USER DETAILS — Profil enrichi personne physique / morale
-- Stage Stock v11 — Idempotent
-- ============================================================

-- 1. TABLE
CREATE TABLE IF NOT EXISTS user_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),

  -- Type de compte
  account_type TEXT NOT NULL DEFAULT 'physical' CHECK (account_type IN ('physical', 'legal')),

  -- ─── COMMUN (physique + morale) ───
  phone TEXT,
  phone_secondary TEXT,
  address_street TEXT,
  address_postal_code TEXT,
  address_city TEXT,
  address_country TEXT DEFAULT 'France',
  siret TEXT,
  iban TEXT,
  bic TEXT,
  website TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_linkedin TEXT,

  -- ─── PERSONNE PHYSIQUE ───
  first_name TEXT,
  last_name TEXT,
  stage_name TEXT,
  birth_date DATE,
  nationality TEXT,
  social_security_number TEXT,
  pole_emploi_spectacle TEXT,
  legal_status TEXT CHECK (legal_status IN (
    'intermittent', 'auto_entrepreneur', 'salarie', 'benevole', 'micro_entreprise', NULL
  )),
  skills TEXT[],
  availability_notes TEXT,
  bio TEXT,

  -- ─── PERSONNE MORALE ───
  company_name TEXT,
  legal_form TEXT CHECK (legal_form IN (
    'sarl', 'sas', 'sasu', 'association_1901', 'micro_entreprise', 'eurl', 'ei', NULL
  )),
  siren TEXT,
  tva_number TEXT,
  capital TEXT,
  representative_name TEXT,
  representative_role TEXT,
  company_creation_date DATE,

  -- ─── PHOTO ───
  avatar_url TEXT,

  -- ─── META ───
  profile_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS
ALTER TABLE user_details ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_details' AND policyname = 'ud_select_own') THEN
    CREATE POLICY ud_select_own ON user_details FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_details' AND policyname = 'ud_insert_own') THEN
    CREATE POLICY ud_insert_own ON user_details FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_details' AND policyname = 'ud_update_own') THEN
    CREATE POLICY ud_update_own ON user_details FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- 3. INDEX
CREATE INDEX IF NOT EXISTS idx_user_details_user_id ON user_details (user_id);

-- 4. VERIFICATION
SELECT 'user_details' AS table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_details') AS nb_columns;
