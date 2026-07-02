import { LoginPage } from "@/components/nextrole/auth-pages";

export const metadata = { title: "Sign in — Braevity" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  return <LoginPage error={error} message={message} />;
}
