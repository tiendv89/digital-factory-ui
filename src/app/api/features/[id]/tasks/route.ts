import { NextResponse } from "next/server";
import { getFeatureRepository } from "@/lib/repositories";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const repository = getFeatureRepository();
  const tasks = await repository.findTasksByFeatureId(id);
  return NextResponse.json(tasks);
}
