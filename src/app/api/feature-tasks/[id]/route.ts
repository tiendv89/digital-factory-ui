/**
 * GET /api/feature-tasks/:id — returns all tasks for a given feature ID.
 *
 * Separated from /api/features/:id into its own namespace to avoid the
 * static export EISDIR conflict: if tasks lived at /api/features/:id/tasks,
 * Next.js would try to write out/api/features/{id} (file) AND create
 * out/api/features/{id}/ (directory), causing a copyfile error.
 */

import { NextResponse } from "next/server";
import { getFeatureRepository } from "@/lib/repositories";

// Statically pre-rendered for each feature ID in output: 'export' mode.
export const dynamic = "force-static";

/**
 * Returns all feature IDs so Next.js can pre-render this route for each one.
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const repo = getFeatureRepository();
    const features = await repo.findAll();
    return features.map((f) => ({ id: f.feature_id }));
  } catch {
    return [];
  }
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const repo = getFeatureRepository();
  const tasks = await repo.findTasksByFeatureId(id);
  return NextResponse.json(tasks);
}
