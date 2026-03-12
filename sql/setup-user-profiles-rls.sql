-- ============================================================
-- USER PROFILES — RLS & Schema Setup — Idempotent SQL Script
-- Stage Stock v8.0 — EK TOUR 25 ANS
-- ============================================================

-- ─── STRATEGY ───
-- The table may already exist (without user_id column) with orphan rows.
-- Step 1: Drop old broken table if it has no user_id column
-- Step 2: Recreate clean table
-- Step 3: RLS + policies

-- ─── 1. DROP & RECREATE if table exists without user_id ───
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_profiles'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'user_id'
  ) THEN
    DROP TABLE user_profiles CASCADE;
  END IF;
END $$;

-- ─── 2. CREATE TABLE (if not exists) ───
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role_id UUID REFERENCES roles(id),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clean any rows with NULL user_id (safety net)
DELETE FROM user_profiles WHERE user_id IS NULL;

-- ─── 3. ENSURE extra columns exist (idempotent) ───
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role_id UUID REFERENCES roles(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN display_name TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- ─── 4. ENABLE RLS ───
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ─── 5. RLS POLICIES ───

-- Users can read all profiles (for team visibility)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'user_profiles_select_all'
  ) THEN
    CREATE POLICY user_profiles_select_all ON user_profiles
      FOR SELECT USING (true);
  END IF;
END $$;

-- Users can insert their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'user_profiles_insert_own'
  ) THEN
    CREATE POLICY user_profiles_insert_own ON user_profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update only their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'user_profiles_update_own'
  ) THEN
    CREATE POLICY user_profiles_update_own ON user_profiles
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── VERIFICATION ───
SELECT 'user_profiles' AS table_name, COUNT(*) AS row_count FROM user_profiles
UNION ALL
SELECT 'has_user_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'user_id'
  ) THEN 1 ELSE 0 END
UNION ALL
SELECT 'has_role_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role_id'
  ) THEN 1 ELSE 0 END
UNION ALL
SELECT 'rls_policies_count', COUNT(*)
  FROM pg_policies WHERE tablename = 'user_profiles';
