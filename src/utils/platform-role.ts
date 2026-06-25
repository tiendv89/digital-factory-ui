import type { MeData } from "@/services/user-service";

/** Returns true iff the user holds the given platform role. */
export function hasPlatformRole(meData: MeData | null | undefined, role: string): boolean {
  if (!meData) return false;
  return (meData.platform_roles ?? []).includes(role);
}

/** Returns true iff the user is a platform admin. */
export function isPlatformAdmin(meData: MeData | null | undefined): boolean {
  return hasPlatformRole(meData, "platform_admin");
}
