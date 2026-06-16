import "./globals.css";

import type { Metadata } from "next";
import { Cousine, Inter } from "next/font/google";
import Script from "next/script";

import { AppProviders } from "@/providers/app-providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cousine = Cousine({
  variable: "--font-cousine",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Workflow Dashboard",
  description: "Visual workflow dashboard for management repositories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${cousine.variable} dark h-full`}>
      <body className="h-full min-h-screen bg-bg text-text-primary antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
      {/* Runtime config (window.__ENV__). Loaded before app code so the BFF URL
          can be set per-container without rebuilding. See docker-entrypoint.sh. */}
      <Script src="/env.js" strategy="beforeInteractive" />
    </html>
  );
}
