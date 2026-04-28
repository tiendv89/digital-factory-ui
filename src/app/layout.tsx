import type { Metadata } from "next";
import { Inter, Cousine } from "next/font/google";
import "./globals.css";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { listWorkspaceIds } from "@/lib/workspace";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const workspaceIds = await listWorkspaceIds();

  return (
    <html lang="en" className={`${inter.variable} ${cousine.variable} h-full`}>
      <body className="flex h-full min-h-screen bg-(--color-bg) text-(--color-text-primary) antialiased">
        <WorkspaceProvider>
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header workspaceIds={workspaceIds} />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
