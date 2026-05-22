/**
 * Content Provider — pre-configured registry.
 *
 * Import `contentRegistry` to fetch content from any supported source.
 * To add a new provider (e.g. S3), create a class implementing ContentProvider
 * and register it here.
 */

export { ContentProviderRegistry } from "./content-provider";
export type { ContentProvider } from "./content-provider";
export { GitHubContentProvider } from "./github-provider";

import { ContentProviderRegistry } from "./content-provider";
import { GitHubContentProvider } from "./github-provider";

/**
 * Singleton registry with all providers pre-registered.
 * Used server-side only (in the API route).
 */
export function createRegistry(): ContentProviderRegistry {
  const registry = new ContentProviderRegistry();

  // GitHub — pass token from env for private repos
  registry.register(
    new GitHubContentProvider(process.env.GITHUB_TOKEN),
  );

  // Future: register S3, custom service providers here
  // registry.register(new S3ContentProvider(...));

  return registry;
}
