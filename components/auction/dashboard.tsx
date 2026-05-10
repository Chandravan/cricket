import type { FormEvent } from "react";
import { BASE_PRICE_OPTIONS, MIN_BID_INCREMENT } from "@/lib/auction/constants";
import type {
  AuctionEvent,
  AuctionSettings,
  PlayerProfile,
  UserProfile,
} from "@/lib/auction/types";
import { formatCredits, formatEventTime, getEventMessage } from "@/lib/auction/utils";

type AuctionDashboardProps = {
  profile: UserProfile;
  firebaseUserId: string;
  isAdmin: boolean;
  isCaptain: boolean;
  isPlayer: boolean;
  myPlayer: PlayerProfile | null;
  auctionSettings: AuctionSettings;
  adminBusy: boolean;
  adminPurseInput: string;
  roundOneCountInput: string;
  roundOneSelectedIds: string[];
  roundOneBusy: boolean;
  openPlayers: PlayerProfile[];
  roundOneModeActive: boolean;
  playerName: string;
  playerSkill: string;
  playerBasePrice: number;
  playerBusy: boolean;
  playerSearch: string;
  filteredOpenPlayers: PlayerProfile[];
  bidInputs: Record<string, string>;
  auctionBusyKey: string | null;
  soldPlayers: PlayerProfile[];
  captains: UserProfile[];
  squadsByCaptainId: Record<string, PlayerProfile[]>;
  events: AuctionEvent[];
  onSetBiddingStatus: (nextStatus: boolean) => void;
  onAdminPurseInputChange: (value: string) => void;
  onApplyCaptainPurseToAll: () => void;
  onRoundOneCountInputChange: (value: string) => void;
  onSaveRoundConfig: () => void;
  onNextRound: () => void;
  onToggleRoundPlayer: (playerId: string) => void;
  onPlayerNameChange: (value: string) => void;
  onPlayerSkillChange: (value: string) => void;
  onPlayerBasePriceChange: (value: number) => void;
  onPlayerUpdateSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPlayerSearchChange: (value: string) => void;
  onBidInputChange: (playerId: string, value: string) => void;
  onPlaceBid: (player: PlayerProfile) => void;
  onConfirmWinningBid: (player: PlayerProfile) => void;
};

export function AuctionDashboard({
  profile,
  firebaseUserId,
  isAdmin,
  isCaptain,
  isPlayer,
  myPlayer,
  auctionSettings,
  adminBusy,
  adminPurseInput,
  roundOneCountInput,
  roundOneSelectedIds,
  roundOneBusy,
  openPlayers,
  roundOneModeActive,
  playerName,
  playerSkill,
  playerBasePrice,
  playerBusy,
  playerSearch,
  filteredOpenPlayers,
  bidInputs,
  auctionBusyKey,
  soldPlayers,
  captains,
  squadsByCaptainId,
  events,
  onSetBiddingStatus,
  onAdminPurseInputChange,
  onApplyCaptainPurseToAll,
  onRoundOneCountInputChange,
  onSaveRoundConfig,
  onNextRound,
  onToggleRoundPlayer,
  onPlayerNameChange,
  onPlayerSkillChange,
  onPlayerBasePriceChange,
  onPlayerUpdateSubmit,
  onPlayerSearchChange,
  onBidInputChange,
  onPlaceBid,
  onConfirmWinningBid,
}: AuctionDashboardProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.15fr_1.8fr_1.05fr]">
      <div className="space-y-5">
        {isCaptain ? (
          <section className="glass space-y-3 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/65">Captain Summary</p>
            <h2 className="text-2xl font-bold">{profile.teamName || profile.name}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-emerald-500/20 p-3">
                <p className="text-xs uppercase text-emerald-100/80">Purse Left</p>
                <p className="mt-1 text-lg font-bold text-emerald-100">
                  {formatCredits(profile.purse)}
                </p>
              </div>
              <div className="rounded-xl bg-orange-500/20 p-3">
                <p className="text-xs uppercase text-orange-100/80">Spent</p>
                <p className="mt-1 text-lg font-bold text-orange-100">
                  {formatCredits(profile.spent)}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {isAdmin ? (
          <section className="glass space-y-4 p-5">
            <h3 className="display-title text-2xl">Admin Panel</h3>
            <p className="text-xs text-white/75">
              Yahin se aap bidding round control kar sakte ho aur sab captains ka purse equal set
              kar sakte ho.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSetBiddingStatus(true)}
                disabled={adminBusy || auctionSettings.biddingOpen}
                className="rounded-xl border border-emerald-300/50 bg-emerald-600/20 px-3 py-2 text-sm font-semibold hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adminBusy && !auctionSettings.biddingOpen ? "Updating..." : "Start Bidding"}
              </button>
              <button
                type="button"
                onClick={() => onSetBiddingStatus(false)}
                disabled={adminBusy || !auctionSettings.biddingOpen}
                className="rounded-xl border border-rose-300/50 bg-rose-600/20 px-3 py-2 text-sm font-semibold hover:bg-rose-600/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adminBusy && auctionSettings.biddingOpen ? "Updating..." : "Stop Bidding"}
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.15em]" htmlFor="admin-purse">
                Captain Purse (all teams)
              </label>
              <div className="flex gap-2">
                <input
                  id="admin-purse"
                  type="number"
                  min={0}
                  step={10}
                  value={adminPurseInput}
                  onChange={(event) => onAdminPurseInputChange(event.target.value)}
                  className="input-base flex-1"
                />
                <button
                  type="button"
                  onClick={onApplyCaptainPurseToAll}
                  disabled={adminBusy}
                  className="action-btn whitespace-nowrap px-4"
                >
                  {adminBusy ? "Saving..." : "Apply To All"}
                </button>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-white/20 bg-white/5 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <label
                    className="text-xs font-semibold uppercase tracking-[0.15em]"
                    htmlFor="round-one-count"
                  >
                    Round {auctionSettings.currentRound} Player Count
                  </label>
                  <input
                    id="round-one-count"
                    type="number"
                    min={0}
                    step={1}
                    value={roundOneCountInput}
                    onChange={(event) => onRoundOneCountInputChange(event.target.value)}
                    className="input-base w-full sm:w-36"
                  />
                </div>
                <button
                  type="button"
                  onClick={onSaveRoundConfig}
                  disabled={roundOneBusy || adminBusy}
                  className="action-btn whitespace-nowrap px-4"
                >
                  {roundOneBusy ? "Saving..." : `Save Round ${auctionSettings.currentRound}`}
                </button>
                <button
                  type="button"
                  onClick={onNextRound}
                  disabled={roundOneBusy || adminBusy || auctionSettings.biddingOpen}
                  className="rounded-xl border border-cyan-300/40 bg-cyan-600/20 px-4 py-2 text-sm font-semibold hover:bg-cyan-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next Round
                </button>
              </div>

              <p className="text-xs text-white/75">
                Selected: {roundOneSelectedIds.length} | Open Players Available: {openPlayers.length}
              </p>

              {openPlayers.length === 0 ? (
                <p className="text-xs text-white/65">Abhi open pool me players nahi hain.</p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-auto pr-1">
                  {openPlayers.map((player) => {
                    const checked = roundOneSelectedIds.includes(player.uid);
                    return (
                      <label
                        key={player.uid}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold">{player.name}</p>
                          <p className="text-xs text-white/70">{player.skill}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleRoundPlayer(player.uid)}
                          className="h-4 w-4 accent-emerald-400"
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {isPlayer && myPlayer ? (
          <form onSubmit={onPlayerUpdateSubmit} className="glass space-y-3 p-5">
            <h3 className="display-title text-2xl">My Player Card</h3>
            <p className="text-xs text-white/75">
              Base price lock ho jayega jab bid start ya player sold ho.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.15em]" htmlFor="edit-name">
                Player Name
              </label>
              <input
                id="edit-name"
                value={playerName}
                onChange={(event) => onPlayerNameChange(event.target.value)}
                className="input-base"
              />
            </div>

            <div className="space-y-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.15em]" htmlFor="edit-skill">
                  Skill
                </label>
                <select
                  id="edit-skill"
                  value={playerSkill}
                  onChange={(event) => onPlayerSkillChange(event.target.value)}
                  className="input-base"
                >
                  <option>Batsman</option>
                  <option>Bowler</option>
                  <option>All-Rounder</option>
                  <option>Wicket Keeper</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.15em]" htmlFor="edit-base-price">
                Base Price (cr)
              </label>
              <select
                id="edit-base-price"
                value={playerBasePrice}
                onChange={(event) => onPlayerBasePriceChange(Number(event.target.value))}
                className="input-base"
                disabled={Boolean(myPlayer.highestBidderId) || myPlayer.status === "sold"}
              >
                {BASE_PRICE_OPTIONS.map((priceOption) => (
                  <option key={priceOption} value={priceOption}>
                    {formatCredits(priceOption)}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm">
              <p>Status: {myPlayer.status === "sold" ? "Sold" : "Open"}</p>
              <p>Current Bid: {formatCredits(myPlayer.currentBid)}</p>
              <p>Highest Bidder: {myPlayer.highestBidderName || "No bids yet"}</p>
            </div>

            <button type="submit" disabled={playerBusy} className="action-btn w-full">
              {playerBusy ? "Updating..." : "Update Player Details"}
            </button>
          </form>
        ) : null}

        <section className="glass space-y-3 p-5">
          <h3 className="display-title text-2xl">Auction Rules</h3>
          <ul className="space-y-2 text-sm text-white/85">
            <li>1. Current captain purse setting: {formatCredits(auctionSettings.captainPurse)}.</li>
            <li>2. Current round configured ho to sirf selected open players auction me dikhte hain.</li>
            <li>3. Next bid always exact +{formatCredits(MIN_BID_INCREMENT)}.</li>
            <li>4. Bidding round admin panel se start/stop hota hai.</li>
            <li>5. Fair play rule: direct base buy off hai, sirf bidding allowed hai.</li>
            <li>6. Highest bid lock/allot sirf admin karta hai.</li>
            <li>7. Sold player ko koi edit ya bid nahi kar sakta.</li>
          </ul>
        </section>
      </div>

      <section className="space-y-5">
        <section id="open-pool" className="glass p-5">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="display-title text-3xl">Open Pool</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={playerSearch}
                onChange={(event) => onPlayerSearchChange(event.target.value)}
                className="input-base min-w-[180px]"
                placeholder="Search player/team"
              />
              <p className="text-sm text-white/75">{filteredOpenPlayers.length} players</p>
            </div>
          </div>
          {roundOneModeActive ? (
            <p className="mb-3 rounded-xl border border-emerald-300/35 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-100">
              Round {auctionSettings.currentRound} active: admin ne {auctionSettings.roundOnePlayerCount} players
              select kiye hain.
            </p>
          ) : null}

          {filteredOpenPlayers.length === 0 ? (
            <p className="rounded-xl border border-white/20 bg-white/5 p-4 text-sm text-white/75">
              Abhi koi open player nahi hai.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredOpenPlayers.map((player) => {
                const minBid = player.currentBid + MIN_BID_INCREMENT;
                const busyBid = auctionBusyKey === `${player.uid}:bid`;
                const busyConfirm = auctionBusyKey === `${player.uid}:confirm`;
                const meLeading = player.highestBidderId === firebaseUserId;

                return (
                  <article
                    key={player.uid}
                    className={`rounded-2xl border p-4 ${
                      meLeading ? "border-emerald-300/70 bg-emerald-500/20" : "border-white/20 bg-white/7"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xl font-bold">{player.name}</h4>
                        <p className="text-sm text-white/80">{player.skill}</p>
                      </div>
                      <span className="rounded-full border border-white/30 px-3 py-1 text-xs uppercase">
                        Live
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-black/20 p-3">
                        <p className="text-xs uppercase text-white/70">Base</p>
                        <p className="mt-1 font-semibold">{formatCredits(player.basePrice)}</p>
                      </div>
                      <div className="rounded-xl bg-black/20 p-3">
                        <p className="text-xs uppercase text-white/70">Current</p>
                        <p className="mt-1 font-semibold">{formatCredits(player.currentBid)}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-white/80">
                      Highest: {player.highestBidderName || "No bids yet"}
                    </p>

                    {isCaptain ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={minBid}
                            step={MIN_BID_INCREMENT}
                            value={bidInputs[player.uid] ?? ""}
                            onChange={(event) => onBidInputChange(player.uid, event.target.value)}
                            className="input-base flex-1"
                            placeholder={`Next ${minBid}`}
                            disabled={!auctionSettings.biddingOpen}
                          />
                          <button
                            type="button"
                            onClick={() => onPlaceBid(player)}
                            disabled={busyBid || !auctionSettings.biddingOpen}
                            className="action-btn whitespace-nowrap px-4"
                          >
                            {busyBid ? "Bidding..." : "Place Bid"}
                          </button>
                        </div>

                        {!auctionSettings.biddingOpen ? (
                          <p className="text-xs text-amber-200">
                            Round stopped by admin. Start hone ke baad hi bidding chalegi.
                          </p>
                        ) : null}
                      </div>
                    ) : isAdmin ? (
                      <div className="mt-3 space-y-2">
                        <button
                          type="button"
                          onClick={() => onConfirmWinningBid(player)}
                          disabled={busyConfirm || !player.highestBidderId}
                          className="w-full rounded-xl border border-emerald-300/50 bg-emerald-600/20 px-3 py-2 text-sm font-semibold hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyConfirm ? "Allotting..." : "Allot Highest Bid"}
                        </button>
                        {!player.highestBidderId ? (
                          <p className="text-xs text-white/70">Is player par abhi bid nahi aayi hai.</p>
                        ) : (
                          <p className="text-xs text-white/80">
                            Highest bidder: {player.highestBidderName || "Captain"}.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-white/70">
                        Captains bid karenge, final allot admin panel se hoga.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="display-title text-3xl">Sold Players</h3>
            <p className="text-sm text-white/75">{soldPlayers.length} sold</p>
          </div>

          {soldPlayers.length === 0 ? (
            <p className="rounded-xl border border-white/20 bg-white/5 p-4 text-sm text-white/75">
              Squad building abhi start hona baaki hai.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {soldPlayers.map((player) => (
                <div key={player.uid} className="rounded-xl border border-white/20 bg-black/20 p-3 text-sm">
                  <p className="font-semibold">{player.name}</p>
                  <p className="text-white/75">{player.skill}</p>
                  <p className="mt-1 text-white/90">Sold to: {player.soldToCaptainName || "-"}</p>
                  <p className="text-amber-200">Price: {formatCredits(player.soldPrice ?? 0)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <div className="space-y-5">
        <section id="captain-board" className="glass overflow-hidden p-5">
          <h3 className="display-title mb-3 text-3xl">Captain Board</h3>
          {captains.length === 0 ? (
            <p className="text-sm text-white/75">No captains yet.</p>
          ) : (
            <div className="space-y-2">
              {captains.map((captain) => {
                const squadSize = squadsByCaptainId[captain.uid]?.length ?? 0;

                return (
                  <div key={captain.uid} className="rounded-xl border border-white/20 bg-white/6 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{captain.teamName || captain.name}</p>
                        <p className="text-xs text-white/75">{captain.name}</p>
                      </div>
                      <p className="text-sm font-bold text-emerald-200">{formatCredits(captain.purse)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-white/80">
                      <span>Spent: {formatCredits(captain.spent)}</span>
                      <span>Squad: {squadSize}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section id="live-tape" className="glass p-5">
          <h3 className="display-title mb-3 text-3xl">Live Tape</h3>
          {events.length === 0 ? (
            <p className="text-sm text-white/75">No auction activity yet.</p>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
              {events.map((eventItem) => {
                const line = getEventMessage(eventItem);

                return (
                  <div key={eventItem.id} className="rounded-xl border border-white/15 bg-black/20 p-3 text-xs">
                    <p className="text-white/90">{line}</p>
                    <p className="mt-1 text-white/55">{formatEventTime(eventItem.createdAt)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
