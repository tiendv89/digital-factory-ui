import type { Metadata } from "next";
import { Inter, Cousine } from "next/font/google";
import "./globals.css";

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
  title: "Feature Status Dashboard",
  description: "Agent workflow feature status dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${cousine.variable} h-full`}>
      <body className="min-h-full bg-(--color-bg) text-(--color-text-primary) antialiased">
        {children}
      </body>
    </html>
  );
}
