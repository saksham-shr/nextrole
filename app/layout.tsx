import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NextRole",
    template: "%s | NextRole",
  },
  description:
    "NextRole is a job search operating system for evaluating roles, tailoring resumes, tracking applications, preparing interviews, and improving the whole search pipeline in one place.",
  applicationName: "NextRole",
  keywords: [
    "job search",
    "resume tailoring",
    "career ops",
    "application tracker",
    "interview prep",
    "job evaluation",
    "career dashboard",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "NextRole",
    description:
      "Run your job search like a real pipeline with evaluation, scanning, tracking, resumes, follow-up, and analytics in one workspace.",
    siteName: "NextRole",
  },
  twitter: {
    card: "summary_large_image",
    title: "NextRole",
    description:
      "A candidate-first job search operating system for evaluation, resumes, tracking, and interview preparation.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
