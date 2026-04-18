import { NextResponse } from "next/server";
import { getFeatureRepository } from "@/lib/repositories";

export async function GET() {
  const repository = getFeatureRepository();
  const features = await repository.findAll();
  return NextResponse.json(features);
}
