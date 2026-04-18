import type { FeatureRepository } from "./feature.repository";
import { FilesystemFeatureRepository } from "./filesystem-feature.repository";
import { StaticFeatureRepository } from "./static-feature.repository";

export type { FeatureRepository };
export { FilesystemFeatureRepository, StaticFeatureRepository };

let instance: FeatureRepository | null = null;

/**
 * Returns the singleton FeatureRepository for this process.
 *
 * Implementation is selected by NEXT_PUBLIC_DATA_SOURCE:
 *   "static"     → StaticFeatureRepository  (reads public/data/*.json generated at build time)
 *   anything else → FilesystemFeatureRepository (reads YAML from WORKSPACE_MGMT_PATH at runtime)
 */
export function getFeatureRepository(): FeatureRepository {
  if (!instance) {
    if (process.env.NEXT_PUBLIC_DATA_SOURCE === "static") {
      instance = new StaticFeatureRepository();
    } else {
      instance = new FilesystemFeatureRepository();
    }
  }
  return instance;
}
