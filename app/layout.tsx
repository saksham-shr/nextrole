import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";
import { ToastProvider } from "@/components/nextrole/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-stack",
  display: "swap",
  preload: false,
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Braevity",
    template: "%s | Braevity",
  },
  description:
    "Braevity is a job search assistant for evaluating roles, tailoring resumes, tracking applications, and preparing to apply — all in one workspace.",
  applicationName: "Braevity",
  keywords: [
    "job search",
    "resume tailoring",
    "application tracker",
    "job evaluation",
    "career dashboard",
    "autofill assistance",
    "job search assistant",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/braevity-icon.png", type: "image/png" },
    ],
    shortcut: "/braevity-icon.png",
    apple:    { url: "/braevity-app-icon.png", sizes: "512x512" },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Braevity",
    description:
      "Evaluate roles, tailor resumes, autofill applications, and track every opportunity — your complete job search assistant.",
    siteName: "Braevity",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Braevity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Braevity",
    description:
      "A job search assistant for evaluation, resume tailoring, autofill, and pipeline tracking.",
    images: ["/og-image.png"],
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
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
