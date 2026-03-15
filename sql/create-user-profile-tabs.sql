-- ============================================================
-- PROFIL ENRICHI — Matériel, Disponibilités, Finances perso
-- Stage Stock v12 — Idempotent
-- ============================================================

-- 1. MATÉRIEL PERSONNEL (instruments, équipements perso)
CREATE TABLE IF NOT EXISTS user_gear (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('instrument', 'son', 'lumiere', 'tech', 'scene', 'transport', 'other')),
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_value NUMERIC DEFAULT 0,
  current_condition TEXT DEFAULT 'bon'
    CHECK (current_condition IN ('neuf', 'excellent', 'bon', 'use', 'hs')),
  notes TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. DISPONIBILITÉS PAR ÉVÉNEMENT
CREATE TABLE IF NOT EXISTS user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (status IN ('available', 'unavailable', 'maybe', 'unknown')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- 3. REVENUS PERSONNELS (cachets, factures, remboursements)
CREATE TABLE IF NOT EXISTS user_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'cachet'
    CHECK (type IN ('cachet', 'facture', 'remboursement', 'prime', 'autre')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS — chaque user voit uniquement ses propres données
ALTER TABLE user_gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_income ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- user_gear
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_gear' AND policyname = 'ug_select_own') THEN
    CREATE POLICY ug_select_own ON user_gear FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_gear' AND policyname = 'ug_insert_own') THEN
    CREATE POLICY ug_insert_own ON user_gear FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_gear' AND policyname = 'ug_update_own') THEN
    CREATE POLICY ug_update_own ON user_gear FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_gear' AND policyname = 'ug_delete_own') THEN
    CREATE POLICY ug_delete_own ON user_gear FOR DELETE USING (user_id = auth.uid());
  END IF;

  -- user_availability
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_availability' AND policyname = 'ua_select_own') THEN
    CREATE POLICY ua_select_own ON user_availability FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_availability' AND policyname = 'ua_insert_own') THEN
    CREATE POLICY ua_insert_own ON user_availability FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_availability' AND policyname = 'ua_update_own') THEN
    CREATE POLICY ua_update_own ON user_availability FOR UPDATE USING (user_id = auth.uid());
  END IF;

  -- user_income
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_income' AND policyname = 'ui_select_own') THEN
    CREATE POLICY ui_select_own ON user_income FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_income' AND policyname = 'ui_insert_own') THEN
    CREATE POLICY ui_insert_own ON user_income FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_income' AND policyname = 'ui_update_own') THEN
    CREATE POLICY ui_update_own ON user_income FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_income' AND policyname = 'ui_delete_own') THEN
    CREATE POLICY ui_delete_own ON user_income FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- 5. INDEX
CREATE INDEX IF NOT EXISTS idx_user_gear_user ON user_gear (user_id);
CREATE INDEX IF NOT EXISTS idx_user_availability_user ON user_availability (user_id);
CREATE INDEX IF NOT EXISTS idx_user_availability_event ON user_availability (event_id);
CREATE INDEX IF NOT EXISTS idx_user_income_user ON user_income (user_id);
CREATE INDEX IF NOT EXISTS idx_user_income_event ON user_income (event_id);

-- 6. VÉRIFICATION
SELECT 'user_gear' AS tbl, count(*) FROM user_gear
UNION ALL SELECT 'user_availability', count(*) FROM user_availability
UNION ALL SELECT 'user_income', count(*) FROM user_income;
