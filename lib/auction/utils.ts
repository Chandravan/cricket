import type { Timestamp } from "firebase/firestore";
import { ADMIN_EMAIL, BASE_PRICE_OPTIONS } from "@/lib/auction/constants";
import type { AuctionEvent, UserRole } from "@/lib/auction/types";

export function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function formatCredits(value: number): string {
  return `${value.toLocaleString("en-IN")} cr`;
}

export function normalizeBasePrice(value: unknown): number {
  const parsed = num(value, 100);
  return BASE_PRICE_OPTIONS.includes(parsed as (typeof BASE_PRICE_OPTIONS)[number]) ? parsed : 100;
}

export function formatEventTime(ts?: Timestamp | null): string {
  if (!ts) {
    return "just now";
  }

  return ts.toDate().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getEventMessage(eventItem: AuctionEvent): string {
  if (eventItem.type === "bid") {
    return `${eventItem.captainName} bid ${formatCredits(eventItem.amount)} on ${eventItem.playerName}`;
  }

  if (eventItem.type === "sold_direct") {
    return `${eventItem.captainName} bought ${eventItem.playerName} at base ${formatCredits(eventItem.amount)}`;
  }

  if (eventItem.type === "sold_bid") {
    return `${eventItem.playerName} sold to ${eventItem.captainName} for ${formatCredits(eventItem.amount)}`;
  }

  if (eventItem.type === "admin_update") {
    return eventItem.note || "Admin updated auction settings";
  }

  return `${eventItem.playerName}: ${eventItem.note || "profile updated"}`;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error. Please try again.";
}

export function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export function normalizeUserRole(value: unknown): UserRole {
  const roleValue = text(value, "player");
  if (roleValue === "captain" || roleValue === "admin") {
    return roleValue;
  }
  return "player";
}

export function isClientBlockedError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("blocked_by_client") ||
    message.includes("webchannel") ||
    message.includes("client is offline") ||
    message.includes("could not reach cloud firestore backend")
  );
}
