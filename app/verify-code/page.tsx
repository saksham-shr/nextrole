import { VerifyCodePage } from "@/components/nextrole/auth-pages";

export const metadata = { title: "Verify code — NextRole" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <VerifyCodePage email={email} />;
}
