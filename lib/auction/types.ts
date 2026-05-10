import type { Timestamp } from "firebase/firestore";

export type UserRole = "player" | "captain" | "admin";

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  teamName?: string;
  purse: number;
  spent: number;
};

export type PlayerProfile = {
  uid: string;
  name: string;
  skill: string;
  basePrice: number;
  currentBid: number;
  status: "open" | "sold";
  highestBidderId?: string | null;
  highestBidderName?: string | null;
  soldToCaptainId?: string | null;
  soldToCaptainName?: string | null;
  soldPrice?: number | null;
};

export type AuctionEvent = {
  id: string;
  type: "bid" | "sold_direct" | "sold_bid" | "player_update" | "admin_update";
  playerId: string;
  playerName: string;
  captainId?: string;
  captainName?: string;
  amount: number;
  note?: string;
  createdAt?: Timestamp | null;
};

export type AuctionSettings = {
  biddingOpen: boolean;
  captainPurse: number;
  currentRound: number;
  roundOnePlayerCount: number;
  roundOnePlayerIds: string[];
  updatedByName?: string;
  updatedAt?: Timestamp | null;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  createdAtLabel: string;
};
