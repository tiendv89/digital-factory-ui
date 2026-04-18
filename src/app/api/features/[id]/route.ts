import { NextResponse } from "next/server";
import { getFeatureRepository } from "@/lib/repositories";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const repository = getFeatureRepository();
  const feature = await repository.findById(id);
  if (!feature) {
    return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  }
  return NextResponse.json(feature);
}
