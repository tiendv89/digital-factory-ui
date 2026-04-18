/**
 * StaticFeatureRepository
 *
 * Reads data from pre-generated JSON files in public/data/ at build time
 * (during `next build` with output: 'export'). This avoids any Node.js `fs`
 * dependency in the production bundle.
 *
 * The JSON files are generated before the build by running:
 *   npm run generate-data
 *
 * File layout expected:
 *   public/data/features.json                       — FeatureSummary[]
 *   public/data/features/<feature_id>/tasks.json    — Task[]
 */

import fs from "fs";
import path from "path";
import type { Feature, FeatureSummary } from "../types/feature";
import type { Task } from "../types/task";
import type { FeatureRepository } from "./feature.repository";

function getDataDir(): string {
  return path.join(process.cwd(), "public", "data");
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export class StaticFeatureRepository implements FeatureRepository {
  async findAll(): Promise<FeatureSummary[]> {
    const dataFile = path.join(getDataDir(), "features.json");
    const data = readJsonFile<FeatureSummary[]>(dataFile);
    if (!data) {
      throw new Error(
        `Static data file not found: ${dataFile}\n` +
          `Run 'npm run generate-data' before 'next build' when using NEXT_PUBLIC_DATA_SOURCE=static.`
      );
    }
    return data;
  }

  async findById(id: string): Promise<Feature | null> {
    const summaries = await this.findAll();
    const match = summaries.find((f) => f.feature_id === id);
    if (!match) return null;
    // Strip the computed taskCounts field — callers expect a plain Feature.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { taskCounts: _counts, ...feature } = match;
    return feature as Feature;
  }

  async findTasksByFeatureId(id: string): Promise<Task[]> {
    const dataFile = path.join(getDataDir(), "features", id, "tasks.json");
    const data = readJsonFile<Task[]>(dataFile);
    return data ?? [];
  }
}
