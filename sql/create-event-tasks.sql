-- ═══════════════════════════════════════════════
-- event_tasks — 48h timeline tasks for events
-- Assigns hour-by-hour tasks to team members
-- Idempotent — safe to run multiple times
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),

  -- Who
  assigned_role TEXT NOT NULL,           -- role code: TM, SE, MM, etc.
  assigned_user_id UUID REFERENCES auth.users(id),  -- optional specific person

  -- What
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'logistique', 'son', 'lumiere', 'scene', 'merch',
    'artiste', 'securite', 'transport', 'communication', 'autre'
  )),

  -- When (relative to event date)
  hour_offset INTEGER NOT NULL,          -- -24 to +24 (hours relative to event start)
  duration_minutes INTEGER DEFAULT 60,   -- task duration

  -- Flow type
  flow_type TEXT CHECK (flow_type IN ('physique', 'info', 'both')) DEFAULT 'both',

  -- Status
  status TEXT CHECK (status IN ('pending', 'in_progress', 'done', 'skipped')) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),

  -- Priority
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',

  -- Dependencies
  depends_on UUID REFERENCES event_tasks(id),  -- must complete before this

  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'event_tasks_select_org') THEN
    CREATE POLICY event_tasks_select_org ON event_tasks FOR SELECT
      USING (
        org_id IN (
          SELECT pm.org_id FROM project_members pm WHERE pm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'event_tasks_insert_org') THEN
    CREATE POLICY event_tasks_insert_org ON event_tasks FOR INSERT
      WITH CHECK (
        org_id IN (
          SELECT pm.org_id FROM project_members pm WHERE pm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'event_tasks_update_org') THEN
    CREATE POLICY event_tasks_update_org ON event_tasks FOR UPDATE
      USING (
        org_id IN (
          SELECT pm.org_id FROM project_members pm WHERE pm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'event_tasks_delete_admin') THEN
    CREATE POLICY event_tasks_delete_admin ON event_tasks FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.user_id = auth.uid()
            AND pm.org_id = event_tasks.org_id
            AND pm.is_admin = true
        )
      );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_tasks_event ON event_tasks(event_id, hour_offset);
CREATE INDEX IF NOT EXISTS idx_event_tasks_org ON event_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_event_tasks_role ON event_tasks(assigned_role, event_id);
CREATE INDEX IF NOT EXISTS idx_event_tasks_user ON event_tasks(assigned_user_id, event_id);

-- ═══════════════════════════════════════════════
-- event_task_templates — reusable task templates
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,                    -- template name: "Concert Standard", "Sound System"
  format TEXT,                           -- event format this applies to

  -- Template data stored as JSONB array of task definitions
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each task: { title, description, category, assigned_role, hour_offset, duration_minutes, flow_type, priority }

  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE event_task_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'event_task_templates_select_org') THEN
    CREATE POLICY event_task_templates_select_org ON event_task_templates FOR SELECT
      USING (
        org_id IN (
          SELECT pm.org_id FROM project_members pm WHERE pm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'event_task_templates_manage_admin') THEN
    CREATE POLICY event_task_templates_manage_admin ON event_task_templates FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.user_id = auth.uid()
            AND pm.org_id = event_task_templates.org_id
            AND pm.is_admin = true
        )
      );
  END IF;
END $$;

-- Verification
SELECT 'event_tasks table ready' AS status, count(*) AS existing_rows FROM event_tasks;
SELECT 'event_task_templates table ready' AS status, count(*) AS existing_rows FROM event_task_templates;
