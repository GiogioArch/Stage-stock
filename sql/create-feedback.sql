-- ═══════════════════════════════════════════════
-- Feedback table — terrain feedback from users
-- Idempotent — safe to run multiple times
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  mood TEXT CHECK (mood IN ('bad', 'ok', 'good')),
  message TEXT,
  context TEXT, -- page/feature context (e.g. 'packing-list', 'stock')
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feedback_insert_own') THEN
    CREATE POLICY feedback_insert_own ON feedback FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feedback_select_admin') THEN
    CREATE POLICY feedback_select_admin ON feedback FOR SELECT
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.user_id = auth.uid()
            AND project_members.org_id = feedback.org_id
            AND project_members.is_admin = true
        )
      );
  END IF;
END $$;

-- Index for querying by org
CREATE INDEX IF NOT EXISTS idx_feedback_org ON feedback(org_id, created_at DESC);

-- Verification
SELECT 'feedback table ready' AS status, count(*) AS existing_rows FROM feedback;
