"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_MEMBERS = 4; // owner takes 1 of 5 seats

// ─── Invite a member ──────────────────────────────────────────────────────────
export async function inviteMember(
  email: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Must be on team tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  if (profile?.tier !== "team") {
    return { error: "Team plan required to invite members." };
  }

  // Can't invite yourself
  if (email.toLowerCase() === (user.email ?? "").toLowerCase()) {
    return { error: "You can't invite yourself." };
  }

  // Check seat limit (active + pending, excluding removed)
  const { count } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .in("status", ["active", "pending"]);

  if ((count ?? 0) >= MAX_MEMBERS) {
    return { error: `Seat limit reached. Your plan supports ${MAX_MEMBERS + 1} seats total.` };
  }

  // Upsert: re-invite if previously removed
  const { error } = await supabase
    .from("team_members")
    .upsert(
      { owner_id: user.id, invited_email: email.toLowerCase(), status: "pending", invited_at: new Date().toISOString() },
      { onConflict: "owner_id,invited_email", ignoreDuplicates: false },
    );

  if (error) {
    if (error.code === "23505") return { error: "This person is already invited." };
    return { error: error.message };
  }

  return {};
}

// ─── Remove a member (owner action) ──────────────────────────────────────────
export async function removeMember(
  memberId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: row } = await supabase
    .from("team_members")
    .select("id, member_id, status")
    .eq("owner_id", user.id)
    .eq("id", memberId)
    .single();

  if (!row) return { error: "Member not found." };

  // Revert member's tier to free if they were active
  if (row.status === "active" && row.member_id) {
    await supabase
      .from("profiles")
      .update({ tier: "free", updated_at: new Date().toISOString() })
      .eq("id", row.member_id);
  }

  await supabase
    .from("team_members")
    .update({ status: "removed" })
    .eq("id", row.id);

  return {};
}

// ─── Cancel a pending invite (owner action) ───────────────────────────────────
export async function cancelInvite(
  inviteId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await supabase
    .from("team_members")
    .update({ status: "removed" })
    .eq("id", inviteId)
    .eq("owner_id", user.id)
    .eq("status", "pending");

  return {};
}

// ─── Accept invite (member action) ───────────────────────────────────────────
export async function acceptInvite(
  inviteId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Find the pending invite for this user's email
  const { data: invite } = await supabase
    .from("team_members")
    .select("id, owner_id, status")
    .eq("id", inviteId)
    .eq("invited_email", (user.email ?? "").toLowerCase())
    .eq("status", "pending")
    .single();

  if (!invite) return { error: "Invite not found or already used." };

  // Confirm the owner still has team tier
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", invite.owner_id)
    .single();

  if (ownerProfile?.tier !== "team") {
    return { error: "This team's subscription is no longer active." };
  }

  // Re-check seat limit before accepting
  const { count } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", invite.owner_id)
    .eq("status", "active");

  if ((count ?? 0) >= MAX_MEMBERS) {
    return { error: "This team is full." };
  }

  // Activate membership
  await supabase
    .from("team_members")
    .update({
      member_id: user.id,
      status: "active",
      joined_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  // Grant team tier to the member
  await supabase
    .from("profiles")
    .update({ tier: "team", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  return {};
}

// ─── Decline invite (member action) ──────────────────────────────────────────
export async function declineInvite(
  inviteId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await supabase
    .from("team_members")
    .update({ status: "removed" })
    .eq("id", inviteId)
    .eq("invited_email", (user.email ?? "").toLowerCase())
    .eq("status", "pending");

  return {};
}

// ─── Fetch team data for owner's dashboard ────────────────────────────────────
export interface TeamMemberRow {
  id: string;
  invited_email: string;
  member_id: string | null;
  status: "pending" | "active" | "removed";
  invited_at: string;
  joined_at: string | null;
}

export async function getTeamData(): Promise<{
  members: TeamMemberRow[];
  creditsRemaining: number;
  seatLimit: number;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { members: [], creditsRemaining: 0, seatLimit: MAX_MEMBERS + 1, error: "Unauthorized" };

  const [{ data: members }, { data: profile }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, invited_email, member_id, status, invited_at, joined_at")
      .eq("owner_id", user.id)
      .in("status", ["active", "pending"])
      .order("invited_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("credits_remaining")
      .eq("id", user.id)
      .single(),
  ]);

  return {
    members: (members ?? []) as TeamMemberRow[],
    creditsRemaining: profile?.credits_remaining ?? 0,
    seatLimit: MAX_MEMBERS + 1,
  };
}
