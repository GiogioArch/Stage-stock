// ─── Audit Log Utility ───
// Fire-and-forget logging. Silently fails if audit_logs table doesn't exist yet.
//
// SQL to create the table (run in Supabase SQL editor):
//
// CREATE TABLE audit_logs (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   action text NOT NULL,
//   user_id uuid,
//   org_id uuid,
//   target_type text,
//   target_id uuid,
//   details jsonb,
//   created_at timestamptz DEFAULT now()
// );
// CREATE INDEX idx_audit_logs_org ON audit_logs(org_id, created_at DESC);
// ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

import { db } from './supabase'

/**
 * Log an auditable action. Silently fails if audit_logs table doesn't exist.
 * @param {string} action - e.g. 'movement.create', 'product.update', 'event.delete'
 * @param {object} params - { userId, orgId, targetType, targetId, details }
 */
export function logAction(action, { userId, orgId, targetType, targetId, details } = {}) {
  try {
    db.insert('audit_logs', {
      action,
      user_id: userId || null,
      org_id: orgId || null,
      target_type: targetType || null,
      target_id: targetId || null,
      details: details ? JSON.stringify(details) : null,
      created_at: new Date().toISOString(),
    }).catch(() => {})
  } catch {
    // Silent — audit logging should never break the app
  }
}
