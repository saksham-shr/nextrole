import { notFound } from "next/navigation";
import {
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
  SignupPage,
  VerifyCodePage,
} from "@/components/nextrole/auth-pages";

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
    email?: string;
  }>;
}) {
  const { slug } = await params;
  const { error, message, email } = await searchParams;

  switch (slug) {
    case "login":
      return <LoginPage error={error} message={message} />;
    case "signup":
      return <SignupPage />;
    case "forgot-password":
      return <ForgotPasswordPage />;
    case "reset-password":
      return <ResetPasswordPage />;
    case "verify-code":
      return <VerifyCodePage email={email} />;
    default:
      notFound();
  }
}
