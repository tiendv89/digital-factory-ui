import { FeatureSessionPage } from "@/components/features/feature-session-page";

type FeatureRouteProps = {
  params: Promise<{ featureId: string }>;
};

export default async function FeatureRoute({ params }: FeatureRouteProps) {
  const { featureId } = await params;
  return <FeatureSessionPage featureId={featureId} />;
}
