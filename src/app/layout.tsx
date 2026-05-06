import type { Metadata } from "next";
import { Inter, Cousine } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/app/providers/AppProviders";
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const cousine = Cousine({ variable: "--font-cousine", subsets: ["latin"], weight: ["400", "700"], display: "swap" });
export const metadata: Metadata = { title: "Workflow Dashboard", description: "Visual workflow dashboard for management repositories" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${cousine.variable} h-full`}>
      <body className="h-full min-h-screen bg-bg text-text-primary antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
