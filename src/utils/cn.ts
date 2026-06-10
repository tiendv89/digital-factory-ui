/**
 * Minimal className joiner — concatenates truthy class strings.
 * Keeps primitives readable without pulling in clsx/tailwind-merge.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
