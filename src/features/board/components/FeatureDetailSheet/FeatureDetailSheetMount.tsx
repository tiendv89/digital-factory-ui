"use client";

import { useBoardContext } from "@/features/board/components/KanbanBoard";
import { useFeatureDetail } from "@/features/board/hooks/useFeatureDetail";
import { adaptFeatureDetail } from "@/features/workspaces/lib/workspaceAdapter";
import { FeatureDetailSheet } from "./FeatureDetailSheet";

export function FeatureDetailSheetMount() {
  const { selectedFeature, setSelectedFeature, workspaceDetail } =
    useBoardContext();
  const featureId = selectedFeature?.backendId ?? selectedFeature?.id ?? null;
  const { feature: backendFeature } = useFeatureDetail(
    workspaceDetail.id,
    featureId,
  );
  const feature = backendFeature
    ? adaptFeatureDetail(backendFeature)
    : selectedFeature;

  return (
    <FeatureDetailSheet
      feature={feature}
      onClose={() => setSelectedFeature(null)}
    />
  );
}
