import { getWorkspaceSummaries } from "@/lib/workspace";
import { HomeContent } from "./HomeContent";

export const dynamic = "force-dynamic";

export default async function Home() {
  const workspaces = await getWorkspaceSummaries();

  return <HomeContent workspaces={workspaces} />;
}
