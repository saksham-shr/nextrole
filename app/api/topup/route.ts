/**
 * POST /api/topup
 * Pro-only. Returns a LemonSqueezy checkout URL for a credit top-up pack.
 * The actual credit allocation happens via the order_created webhook.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TOPUP_PACKS, type TopupPackId } from "@/lib/ai/gates";
import { isSameOrigin } from "@/lib/security/csrf";

const LS_BASE = process.env.NEXT_PUBLIC_LS_CHECKOUT_URL ?? "";

function topupVariantId(packId: TopupPackId): string {
  return process.env[`LEMONSQUEEZY_VARIANT_TOPUP_${packId.toUpperCase()}`]?.trim() ?? "";
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, subscription_status")
    .eq("id", user.id)
    .single();

  if (profile?.tier !== "pro") {
    return NextResponse.json({ error: "Top-ups require an active Pro subscription" }, { status: 403 });
  }

  if (profile?.subscription_status !== "active") {
    return NextResponse.json({ error: "Your Pro subscription is not active" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { pack_id?: string };
  const packId = body.pack_id as TopupPackId | undefined;
  const pack = TOPUP_PACKS.find((p) => p.id === packId);

  if (!pack) {
    return NextResponse.json({ error: "Invalid top-up pack" }, { status: 400 });
  }

  const variantId = topupVariantId(pack.id);
  if (!variantId || !LS_BASE) {
    return NextResponse.json({ error: "Top-up not configured" }, { status: 503 });
  }

  const checkoutUrl = `${LS_BASE}?variant=${variantId}&checkout[email]=${encodeURIComponent(user.email ?? "")}`;

  return NextResponse.json({ url: checkoutUrl, pack });
}
