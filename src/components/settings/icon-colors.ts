/**
 * Org/workspace icon color palette — mirrors the swatches in the Figma
 * "Organization settings → General" frame (122:3735). The org has no stored
 * icon color, so the avatar color is derived deterministically from its id.
 */
export const ICON_COLORS = [
  "#007acc", // blue (default)
  "#f17260", // coral
  "#32b3e6", // cyan
  "#cda629", // gold
  "#45b164", // green
  "#f14d4c", // red
  "#58b0ff", // light blue
  "#c586c0", // magenta
] as const;

export function deriveIconColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ICON_COLORS[hash % ICON_COLORS.length];
}
