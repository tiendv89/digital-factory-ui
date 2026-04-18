/**
 * GET /api/feature-summaries — returns all features with computed task counts.
 *
 * In local dev mode, reads live YAML from WORKSPACE_MGMT_PATH.
 * In static export mode (output: 'export'), pre-rendered from public/data/features.json.
 */

import { NextResponse } from "next/server";
import { getFeatureRepository } from "@/lib/repositories";

// Statically pre-rendered in output: 'export' mode. No conflict with any
// nested routes because this is a leaf route (no children).
export const dynamic = "force-static";

export async function GET() {
  const repo = getFeatureRepository();
  const features = await repo.findAll();
  return NextResponse.json(features);
}
