import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BillingPage } from "@/components/nextrole/billing-page";
import { getCommerceConfig, getCommerceDefaults, CommerceConfigUnavailableError } from "@/lib/commerce/config";
import type { UserTier, PaymentRecord } from "@/lib/db/types";

export const metadata = { title: "Plan & Credits — NextRole" };

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

export default async function Billing() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = (user.email ?? "").toLowerCase() === ADMIN_EMAIL;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: usageRow }, { data: creditLog }, { data: paymentRecords }] = await Promise.all([
    supabase
      .from("profiles")
      .select("tier, credits_remaining, subscription_ends_at, subscription_status, topup_forfeit_at, referral_code, referred_by")
      .eq("id", user.id)
      .single(),
    supabase
      .from("daily_usage")
      .select("evaluations, resumes, autofills")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("usage_log")
      .select("id, activity_type, credits_used, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("payment_records")
      .select("id, type, plan, period, pack_id, amount_paise, status, refunded_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Pull the same effective commerce config that /api/razorpay/create-order
  // enforces. Display-only fallback to defaults if unavailable — server
  // routes still fail closed at order time.
  let commerce;
  try {
    commerce = await getCommerceConfig();
  } catch (err) {
    if (err instanceof CommerceConfigUnavailableError) {
      console.warn("[billing page] commerce config unavailable; rendering defaults:", err.message);
      commerce = getCommerceDefaults();
    } else {
      throw err;
    }
  }

  // Referral stats
  let referralStats = { total: 0, completed: 0, creditsEarned: 0 };
  if (profile?.referral_code) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: grants } = await (supabase.from("referral_grants") as any)
      .select("referee_threshold_met, credits_awarded")
      .eq("referrer_id", user.id) as { data: Array<{ referee_threshold_met: boolean; credits_awarded: number }> | null };
    if (grants) {
      referralStats = {
        total: grants.length,
        completed: grants.filter((g) => g.referee_threshold_met).length,
        creditsEarned: grants.reduce((s, g) => s + (g.credits_awarded ?? 0), 0),
      };
    }
  }

  const tier: UserTier = isAdmin ? "pro" : ((profile?.tier as UserTier) ?? "free");
  const creditsRemaining = isAdmin
    ? 300
    : (profile?.credits_remaining ?? 0);

  return (
    <BillingPage
      tier={tier}
      email={user.email ?? ""}
      trialEndsAt={isAdmin ? null : ((profile?.subscription_ends_at as string | null) ?? null)}
      subscriptionStatus={isAdmin ? "active" : ((profile?.subscription_status as string | null) ?? null)}
      renewsAt={isAdmin ? null : ((profile?.subscription_ends_at as string | null) ?? null)}
      usage={{
        creditsRemaining,
        evaluationsToday: usageRow?.evaluations ?? 0,
        resumesToday:     usageRow?.resumes     ?? 0,
        autofillsToday:   usageRow?.autofills   ?? 0,
      }}
      isAdmin={isAdmin}
      creditLog={creditLog ?? []}
      paymentRecords={(paymentRecords ?? []) as PaymentRecord[]}
      signupCredits={0}
      topupForfeitAt={isAdmin ? null : ((profile?.topup_forfeit_at as string | null) ?? null)}
      referralCode={(profile?.referral_code as string | null) ?? null}
      referredBy={(profile?.referred_by as string | null) ?? null}
      referralStats={referralStats}
      commerce={{
        planPricesInr: commerce.planPricesInr,
        topupPacks:    commerce.topupPacks,
        flags:         commerce.flags,
      }}
    />
  );
}
