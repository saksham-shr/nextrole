import { createAdminClient } from "@/lib/supabase/admin";

export type AdminAction =
  | "grant_tier"
  | "reset_credits"
  | "add_bonus_credits"
  | "delete_user"
  | "invite_create"
  | "invite_delete"
  | "invite_batch_delete"
  | "commerce_update";

export type AdminTargetType = "user" | "invite" | "commerce";

export interface AuditEntry {
  actorId: string;
  actorEmail: string;
  action: AdminAction;
  targetType: AdminTargetType;
  targetId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Record an admin action. Never throws — audit failures must not block
 * the actual mutation (which has already happened by the time we log it).
 * Failures are reported to the server console for follow-up.
 */
export async function logAdminAction(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("admin_audit_log").insert({
      actor_id:    entry.actorId,
      actor_email: entry.actorEmail,
      action:      entry.action,
      target_type: entry.targetType,
      target_id:   entry.targetId ?? null,
      before:      entry.before ?? null,
      after:       entry.after ?? null,
      metadata:    entry.metadata ?? null,
    });
    if (error) {
      console.error("[admin audit] insert failed:", error.message, entry);
    }
  } catch (err) {
    console.error("[admin audit] unexpected error:", err);
  }
}
