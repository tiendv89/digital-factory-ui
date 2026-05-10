"use client";

import { useBoardContext } from "@/features/board/components/KanbanBoard";
import { FeatureDetailSheet } from "./FeatureDetailSheet";

export function FeatureDetailSheetMount() {
  const { selectedFeature, setSelectedFeature } = useBoardContext();

  return (
    <FeatureDetailSheet
      feature={selectedFeature}
      onClose={() => setSelectedFeature(null)}
    />
  );
}
