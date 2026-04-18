import type { FeatureRepository } from "./feature.repository";
import { FilesystemFeatureRepository } from "./filesystem-feature.repository";

export type { FeatureRepository };
export { FilesystemFeatureRepository };

let instance: FeatureRepository | null = null;

export function getFeatureRepository(): FeatureRepository {
  if (!instance) {
    instance = new FilesystemFeatureRepository();
  }
  return instance;
}
