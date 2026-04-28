import { getWorkspaceSummaries } from "@/lib/workspace";
import { HomeContent } from "./home-content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const workspaces = await getWorkspaceSummaries();

  return <HomeContent workspaces={workspaces} />;
}
