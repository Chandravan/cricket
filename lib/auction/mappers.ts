import type { Timestamp } from "firebase/firestore";
import { INITIAL_CAPTAIN_PURSE } from "@/lib/auction/constants";
import type { AuctionSettings, UserProfile } from "@/lib/auction/types";
import { normalizeUserRole, num, text } from "@/lib/auction/utils";

export function mapUserProfileFromDoc(
  uid: string,
  fallbackEmail: string,
  data: Record<string, unknown>,
): UserProfile {
  return {
    uid,
    email: text(data.email, fallbackEmail),
    name: text(data.name, "Anonymous"),
    role: normalizeUserRole(data.role),
    teamName: text(data.teamName, ""),
    purse: num(data.purse),
    spent: num(data.spent),
  };
}

export function mapAuctionSettings(data?: Record<string, unknown> | null): AuctionSettings {
  const rawRoundOneIds = Array.isArray(data?.roundOnePlayerIds)
    ? data.roundOnePlayerIds.filter((item): item is string => typeof item === "string")
    : [];
  const uniqueRoundOneIds = Array.from(new Set(rawRoundOneIds));
  const roundOnePlayerCount = Math.max(
    0,
    Math.round(num(data?.roundOnePlayerCount, uniqueRoundOneIds.length)),
  );
  const currentRound = Math.max(1, Math.round(num(data?.currentRound, 1)));

  return {
    biddingOpen: typeof data?.biddingOpen === "boolean" ? data.biddingOpen : true,
    captainPurse: Math.max(0, Math.round(num(data?.captainPurse, INITIAL_CAPTAIN_PURSE))),
    currentRound,
    roundOnePlayerCount,
    roundOnePlayerIds: uniqueRoundOneIds,
    updatedByName: text(data?.updatedByName, ""),
    updatedAt: (data?.updatedAt as Timestamp | undefined) ?? null,
  };
}
