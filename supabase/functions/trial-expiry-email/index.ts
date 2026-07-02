import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const TRIAL_EMAIL_FROM = Deno.env.get("TRIAL_EMAIL_FROM") ?? "Braevity <billing@braevity.com>";

Deno.serve(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const now = new Date().toISOString();
  const { data: expiredUsers, error } = await supabase
    .from("profiles")
    .select("id, email, subscription_ends_at")
    .not("email", "is", null)
    .lte("subscription_ends_at", now)
    .is("trial_expiry_notified_at", null)
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  const failed: string[] = [];

  for (const user of expiredUsers ?? []) {
    try {
      if (!RESEND_API_KEY) {
        failed.push(`${user.id}: missing RESEND_API_KEY`);
        continue;
      }

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: TRIAL_EMAIL_FROM,
          to: [user.email],
          subject: "Your Braevity trial has ended",
          html: `<p>Hi there,</p><p>Your Braevity trial has ended. Upgrade anytime to keep running evaluations and pipeline automation.</p><p><a href=\"https://braevity.com/dashboard/billing\">Open Billing</a></p>`,
        }),
      });

      if (!emailRes.ok) {
        const text = await emailRes.text();
        failed.push(`${user.id}: ${text.slice(0, 140)}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ trial_expiry_notified_at: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) {
        failed.push(`${user.id}: ${updateError.message}`);
        continue;
      }

      sent += 1;
    } catch (e) {
      failed.push(`${user.id}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return new Response(JSON.stringify({ scanned: expiredUsers?.length ?? 0, sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
