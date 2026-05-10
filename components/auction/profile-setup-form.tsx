import type { FormEvent } from "react";
import { ADMIN_EMAIL, BASE_PRICE_OPTIONS } from "@/lib/auction/constants";
import type { UserRole } from "@/lib/auction/types";
import { formatCredits } from "@/lib/auction/utils";

type ProfileSetupFormProps = {
  setupName: string;
  setupRole: UserRole;
  setupTeamName: string;
  setupSkill: string;
  setupBasePrice: number;
  setupBusy: boolean;
  canUseAdminRole: boolean;
  onSetupNameChange: (value: string) => void;
  onSetupRoleChange: (value: UserRole) => void;
  onSetupTeamNameChange: (value: string) => void;
  onSetupSkillChange: (value: string) => void;
  onSetupBasePriceChange: (value: number) => void;
  onSetupSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ProfileSetupForm({
  setupName,
  setupRole,
  setupTeamName,
  setupSkill,
  setupBasePrice,
  setupBusy,
  canUseAdminRole,
  onSetupNameChange,
  onSetupRoleChange,
  onSetupTeamNameChange,
  onSetupSkillChange,
  onSetupBasePriceChange,
  onSetupSubmit,
}: ProfileSetupFormProps) {
  return (
    <form onSubmit={onSetupSubmit} className="glass mx-auto w-full max-w-3xl space-y-5 p-5 sm:p-7">
      <div>
        <h2 className="display-title text-3xl">Profile Setup</h2>
        <p className="mt-1 text-sm text-white/75">Ek baar setup hoga. Fir live auction access mil jayega.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="setup-name">
          Display Name
        </label>
        <input
          id="setup-name"
          value={setupName}
          onChange={(event) => onSetupNameChange(event.target.value)}
          className="input-base"
          placeholder="Your name"
          required
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-semibold">Select Role</span>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => onSetupRoleChange("player")}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              setupRole === "player"
                ? "border-emerald-300 bg-emerald-500/25"
                : "border-white/20 bg-white/5 hover:bg-white/10"
            }`}
          >
            <p className="font-semibold">Player</p>
            <p className="text-xs text-white/75">Register for auction pool</p>
          </button>
          <button
            type="button"
            onClick={() => onSetupRoleChange("captain")}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              setupRole === "captain"
                ? "border-emerald-300 bg-emerald-500/25"
                : "border-white/20 bg-white/5 hover:bg-white/10"
            }`}
          >
            <p className="font-semibold">Captain</p>
            <p className="text-xs text-white/75">Bid and build squad</p>
          </button>
          <button
            type="button"
            onClick={() => onSetupRoleChange("admin")}
            disabled={!canUseAdminRole}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              setupRole === "admin"
                ? "border-emerald-300 bg-emerald-500/25"
                : "border-white/20 bg-white/5 hover:bg-white/10"
            }`}
          >
            <p className="font-semibold">Admin</p>
            <p className="text-xs text-white/75">Control auction rounds</p>
          </button>
        </div>
        {!canUseAdminRole ? (
          <p className="text-xs text-amber-200">
            Admin role locked hai. Sirf {ADMIN_EMAIL} account ise select kar sakta hai.
          </p>
        ) : null}
      </div>

      {setupRole === "captain" ? (
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="team-name">
            Team Name
          </label>
          <input
            id="team-name"
            value={setupTeamName}
            onChange={(event) => onSetupTeamNameChange(event.target.value)}
            className="input-base"
            placeholder="Eg. Thunder XI"
            required
          />
        </div>
      ) : null}

      {setupRole === "player" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="player-skill">
              Skill
            </label>
            <select
              id="player-skill"
              value={setupSkill}
              onChange={(event) => onSetupSkillChange(event.target.value)}
              className="input-base"
            >
              <option>Batsman</option>
              <option>Bowler</option>
              <option>All-Rounder</option>
              <option>Wicket Keeper</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="base-price">
              Base Price (cr)
            </label>
            <select
              id="base-price"
              value={setupBasePrice}
              onChange={(event) => onSetupBasePriceChange(Number(event.target.value))}
              className="input-base"
              required
            >
              {BASE_PRICE_OPTIONS.map((priceOption) => (
                <option key={priceOption} value={priceOption}>
                  {formatCredits(priceOption)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {setupRole === "admin" ? (
        <div className="rounded-xl border border-white/20 bg-white/5 p-4 text-sm text-white/80">
          Admin account se aap bidding round start/stop aur captain purse amount set kar paoge.
        </div>
      ) : null}

      <button type="submit" disabled={setupBusy} className="action-btn w-full">
        {setupBusy ? "Saving..." : "Finish Setup"}
      </button>
    </form>
  );
}
