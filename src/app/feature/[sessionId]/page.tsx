import { FeatureSessionPage } from "@/features/workspaces/components/WorkspaceSessionPage";

type FeatureRouteProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{
    workspaceId?: string;
    featureId?: string;
  }>;
};

export default async function FeatureRoute({
  params,
  searchParams,
}: FeatureRouteProps) {
  const { sessionId } = await params;
  const query = await searchParams;

  return (
    <FeatureSessionPage
      sessionId={sessionId}
      workspaceId={query.workspaceId ?? ""}
      featureId={query.featureId ?? ""}
    />
  );
}
