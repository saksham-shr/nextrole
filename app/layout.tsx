import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NextRole",
  description: "NextRole is a job search operating system for evaluating roles, tailoring resumes, and running the whole pipeline in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
