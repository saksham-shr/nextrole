import { redirect } from "next/navigation";
import { acceptInvite, declineInvite } from "@/app/actions/team";
import { AcceptInvitePage } from "@/components/nextrole/accept-invite-page";

export default async function AcceptInvitePageRoute({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  if (!invite) redirect("/dashboard");

  return <AcceptInvitePage inviteId={invite} />;
}
