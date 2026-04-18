import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Factory UI",
  description: "Feature & Task Status Visualization Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
