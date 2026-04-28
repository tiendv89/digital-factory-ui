"use client";

import { useWorkspace } from "@/context/workspace-context";
import { NewFeatureModal } from "./new-feature-modal";

export function FeaturesPageContent() {
  const { activeWorkspaceId } = useWorkspace();

  if (!activeWorkspaceId) {
    return (
      <div className="flex min-h-full items-center justify-center px-8 py-16">
        <div className="text-center">
          <p className="text-sm text-text-secondary">No workspace selected.</p>
          <p className="mt-1 text-xs text-text-muted">
            Select a workspace from the sidebar to view features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-8 py-6">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Features</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Browse and manage all features
          </p>
        </div>
        <NewFeatureModal />
      </div>

      {/* Features list placeholder — implemented in T6 */}
      <div className="rounded-[14px] border border-dashed border-border py-20 text-center">
        <p className="text-sm text-text-muted">Features list coming in T6.</p>
      </div>
    </div>
  );
}
