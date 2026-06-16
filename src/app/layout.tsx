import "./globals.css";

import type { Metadata } from "next";
import { Cousine, Inter } from "next/font/google";

import { loadRuntimeConfig } from "@/constants/runtime-config";
import { AppProviders } from "@/providers/app-providers";
import { RuntimeConfigProvider } from "@/providers/runtime-config-provider";

// Render at request time so loadRuntimeConfig() reads the container's live
// process.env (otherwise the values would be frozen at build time).
export const dynamic = "force-dynamic";

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
  // Loaded on the server from process.env at request time, then passed to the
  // client as a normal prop — no window globals, no injected <script>.
  const runtimeConfig = loadRuntimeConfig();

  return (
    <html lang="en" className={`${inter.variable} ${cousine.variable} dark h-full`}>
      <body className="h-full min-h-screen bg-bg text-text-primary antialiased">
        <RuntimeConfigProvider config={runtimeConfig}>
          <AppProviders>{children}</AppProviders>
        </RuntimeConfigProvider>
      </body>
    </html>
  );
}
