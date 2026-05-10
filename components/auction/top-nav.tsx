type TopNavProps = {
  isAuthenticated: boolean;
  profileName?: string;
  profileRole?: string;
  biddingOpen?: boolean;
  currentRound?: number;
  purseLabel?: string;
  onSignOut?: () => void;
};

export function TopNav({
  isAuthenticated,
  profileName,
  profileRole,
  biddingOpen,
  currentRound,
  purseLabel,
  onSignOut,
}: TopNavProps) {
  const links = isAuthenticated
    ? [
        { label: "Overview", href: "#overview" },
        { label: "Open Pool", href: "#open-pool" },
        { label: "Captains", href: "#captain-board" },
        { label: "Live Tape", href: "#live-tape" },
      ]
    : [
        { label: "Join", href: "#join-auction" },
        { label: "Rules", href: "#tournament-rules" },
      ];

  return (
    <header className="top-nav glass">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="brand-badge">SPA</div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/65">Street League</p>
            <h1 className="display-title text-2xl leading-none sm:text-3xl">Premier Auction Console</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="status-chip status-chip-neutral">
                {profileName ? `${profileName} (${profileRole ?? "user"})` : "Signed in"}
              </span>
              <span className={biddingOpen ? "status-chip status-chip-live" : "status-chip status-chip-stop"}>
                {biddingOpen ? "Bidding Live" : "Bidding Stopped"}
              </span>
              <span className="status-chip status-chip-neutral">Round {currentRound ?? 1}</span>
              {purseLabel ? <span className="status-chip status-chip-neutral">{purseLabel}</span> : null}
              <button type="button" onClick={onSignOut} className="nav-logout">
                Logout
              </button>
            </>
          ) : (
            <span className="status-chip status-chip-neutral">Welcome to Live Auction Room</span>
          )}
        </div>
      </div>

      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {links.map((link) => (
          <a key={link.href} href={link.href} className="nav-link">
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
