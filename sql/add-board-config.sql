-- ============================================================
-- BOARD CONFIG — Personnalisation du Board par utilisateur
-- Ajoute un champ JSONB à project_members pour stocker
-- l'ordre et la visibilité des modules sur le Board
-- ============================================================

-- ─── 1. ADD COLUMN ───
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_members' AND column_name = 'board_config'
  ) THEN
    ALTER TABLE project_members
      ADD COLUMN board_config JSONB DEFAULT '{}';
  END IF;
END $$;

-- Format attendu:
-- {
--   "board_order": ["tournee", "stock", "packing", "scanner", "finance", "achats"],
--   "hidden": ["achats"],
--   "sections": { "alerts": true, "quick_actions": true, "packing": true, "upcoming": true }
-- }

-- ─── VERIFICATION ───
SELECT
  column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'project_members' AND column_name = 'board_config';
