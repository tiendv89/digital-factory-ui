/**
 * Content Provider — Strategy Pattern interface and registry.
 *
 * Each provider knows how to detect and fetch content from a specific source
 * (GitHub, S3, custom service, etc.). The registry iterates through registered
 * providers and delegates to the first one that can handle the given URL.
 */

export interface ContentProvider {
  /** Human-readable name for logging / debugging. */
  readonly name: string;

  /** Return `true` if this provider can fetch content for the given URL. */
  canHandle(url: string): boolean;

  /**
   * Fetch the raw text content from the given URL.
   * Throws on network or permission errors.
   */
  fetchContent(url: string): Promise<string>;
}

export class ContentProviderRegistry {
  private providers: ContentProvider[] = [];

  /** Register a provider. Providers are evaluated in registration order. */
  register(provider: ContentProvider): void {
    this.providers.push(provider);
  }

  /**
   * Find the first provider that can handle the URL and fetch the content.
   * Returns `null` if no provider matches.
   */
  async fetch(url: string): Promise<{ content: string; provider: string } | null> {
    for (const provider of this.providers) {
      if (provider.canHandle(url)) {
        const content = await provider.fetchContent(url);
        return { content, provider: provider.name };
      }
    }
    return null;
  }

  /** List registered provider names (useful for debugging). */
  listProviders(): string[] {
    return this.providers.map((p) => p.name);
  }
}
