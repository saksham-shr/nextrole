import { Suspense } from "react";
import { SignupPage } from "@/components/nextrole/auth-pages";

export const metadata = { title: "Create account — NextRole" };

export default function Page() {
  return (
    <Suspense>
      <SignupPage />
    </Suspense>
  );
}
