import { notFound } from "next/navigation";
import {
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
  SignupPage,
} from "@/components/nextrole/auth-pages";

type AuthPageProps = { error?: string; message?: string };

const authPages: Record<string, React.ComponentType<AuthPageProps>> = {
  login: LoginPage,
  signup: SignupPage,
  "forgot-password": ForgotPasswordPage,
  "reset-password": ResetPasswordPage,
};

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { slug } = await params;
  const { error, message } = await searchParams;
  const Page = authPages[slug];

  if (!Page) {
    notFound();
  }

  return <Page error={error} message={message} />;
}
