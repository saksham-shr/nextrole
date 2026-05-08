import { redirect } from "next/navigation";
import { ConnectExtensionClient } from "./client";

export const metadata = { title: "Connect Extension — NextRole" };

// Only allow redirect_to URLs that point back to a Chrome extension callback.
function isValidRedirectTo(value: string | null): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname.endsWith(".chromiumapp.org");
  } catch {
    return false;
  }
}

export default async function ConnectExtensionPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_to?: string }>;
}) {
  const { redirect_to } = await searchParams;

  if (!isValidRedirectTo(redirect_to ?? null)) {
    redirect("/dashboard");
  }

  return <ConnectExtensionClient redirectTo={redirect_to as string} />;
}
