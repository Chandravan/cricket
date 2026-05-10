import type { UserProfile } from "@/lib/auction/types";
import { num, text } from "@/lib/auction/utils";

function profileCacheKey(uid: string): string {
  return `spa_profile_${uid}`;
}

export function readProfileCache(uid: string): UserProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(profileCacheKey(uid));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<UserProfile>;

    if (
      parsed.uid !== uid ||
      (parsed.role !== "player" && parsed.role !== "captain" && parsed.role !== "admin")
    ) {
      return null;
    }

    return {
      uid,
      email: text(parsed.email, ""),
      name: text(parsed.name, "Anonymous"),
      role: parsed.role,
      teamName: text(parsed.teamName, ""),
      purse: num(parsed.purse),
      spent: num(parsed.spent),
    };
  } catch {
    return null;
  }
}

export function writeProfileCache(uid: string, profileValue: UserProfile | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!profileValue) {
      window.localStorage.removeItem(profileCacheKey(uid));
      return;
    }

    window.localStorage.setItem(profileCacheKey(uid), JSON.stringify(profileValue));
  } catch {
    // ignore localStorage write errors
  }
}
