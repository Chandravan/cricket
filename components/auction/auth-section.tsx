import type { FormEvent } from "react";
import { ADMIN_EMAIL, ADMIN_PASSWORD, INITIAL_CAPTAIN_PURSE, MIN_BID_INCREMENT } from "@/lib/auction/constants";
import { formatCredits } from "@/lib/auction/utils";

type AuthSectionProps = {
  authMode: "login" | "signup";
  authEmail: string;
  authPassword: string;
  authBusy: boolean;
  onAuthModeToggle: () => void;
  onAuthEmailChange: (value: string) => void;
  onAuthPasswordChange: (value: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AuthSection({
  authMode,
  authEmail,
  authPassword,
  authBusy,
  onAuthModeToggle,
  onAuthEmailChange,
  onAuthPasswordChange,
  onAuthSubmit,
}: AuthSectionProps) {
  return (
    <section id="join-auction" className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <form onSubmit={onAuthSubmit} className="glass space-y-4 p-5 sm:p-6">
        <h2 className="display-title text-3xl">Join Auction</h2>
        <p className="text-sm text-white/75">Login ya signup karo. Role setup next step me hoga.</p>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-white/90" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            value={authEmail}
            onChange={(event) => onAuthEmailChange(event.target.value)}
            className="input-base"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-white/90" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            minLength={6}
            value={authPassword}
            onChange={(event) => onAuthPasswordChange(event.target.value)}
            className="input-base"
            placeholder="minimum 6 characters"
            required
          />
        </div>

        <button type="submit" disabled={authBusy} className="action-btn w-full">
          {authBusy ? "Please wait..." : authMode === "signup" ? "Create Account" : "Login"}
        </button>

        <button
          type="button"
          onClick={onAuthModeToggle}
          className="w-full rounded-xl border border-white/25 bg-transparent px-4 py-2 text-sm font-semibold hover:bg-white/10"
        >
          {authMode === "signup" ? "Already have account? Login" : "New user? Create account"}
        </button>

        <p className="rounded-xl border border-amber-200/30 bg-amber-500/15 px-3 py-2 text-xs text-amber-100">
          Reserved admin login: {ADMIN_EMAIL} | password: {ADMIN_PASSWORD}
        </p>
      </form>

      <section id="tournament-rules" className="glass space-y-4 p-5 sm:p-6">
        <h2 className="display-title text-3xl">Tournament Rules</h2>
        <ul className="space-y-2 text-sm text-white/85">
          <li>1. Har captain ko starting purse {formatCredits(INITIAL_CAPTAIN_PURSE)} milega.</li>
          <li>2. Player base price sirf 100, 200, 500 me se choose karega.</li>
          <li>3. Har next bid exact +{formatCredits(MIN_BID_INCREMENT)} se hi hogi.</li>
          <li>4. Admin panel se bidding round start/stop hota hai.</li>
          <li>5. Direct base-price buy allowed nahi hai, sab kuch bidding se hoga.</li>
          <li>6. Highest bidder ko final allot sirf admin karega.</li>
          <li>7. Sold hone ke baad player card lock ho jata hai.</li>
        </ul>
      </section>
    </section>
  );
}
