import type { Feature, FeatureSummary } from "../types/feature";
import type { Task } from "../types/task";

export interface FeatureRepository {
  findAll(): Promise<FeatureSummary[]>;
  findById(id: string): Promise<Feature | null>;
  findTasksByFeatureId(id: string): Promise<Task[]>;
}
