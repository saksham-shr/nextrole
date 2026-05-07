import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("lemon_squeezy_customer_id")
    .eq("id", user.id)
    .single();

  const customerId = profile?.lemon_squeezy_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const res = await fetch(
    `https://api.lemonsqueezy.com/v1/customers/${customerId}/portal`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
      },
    },
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to generate portal link" }, { status: 502 });
  }

  const json = await res.json();
  const url: string | undefined = json?.data?.attributes?.urls?.customer_portal;

  if (!url) {
    return NextResponse.json({ error: "Portal URL not returned" }, { status: 502 });
  }

  return NextResponse.json({ url });
}
