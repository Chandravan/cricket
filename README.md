# Street Premier Auction

Fun IPL-style fair auction web app built with `Next.js (React) + Tailwind + Firebase`.

## Core Features

- Email/password login and signup
- Role-based onboarding (`Player`, `Captain`, `Admin`)
- Player self-registration with skill + fixed base price options
- Equal fixed purse for all captains
- Real-time bidding with minimum increment rules
- Direct buy at base price (before any bid)
- Winning bidder confirmation to lock player
- Auto purse deduction + live captain leaderboard
- Live event tape for bid and sale history
- Admin panel for start/stop bidding round + captain purse reset

## Auction Rules Implemented

1. Each captain gets the same starting purse: `120 cr`
2. Player sets base price from fixed options: `100 cr`, `200 cr`, `500 cr`
3. Each next bid is fixed: `current bid + 200 cr`
4. Direct buy only available before first bid
5. Highest bidder can confirm and finalize purchase
6. Sold player becomes read-only for bidding
7. Admin can stop bidding globally and set equal purse for all captains

## Admin Access

- Reserved admin email: `chandravankumar5145@gmail.com`
- Reserved admin password: `123456`
- Admin role cannot be selected by any other email.

## Project Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Fill Firebase keys in `.env`.

4. Run local dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Firebase Setup Checklist

1. Create Firebase project
2. Enable Authentication -> Email/Password
3. Create Firestore Database (production or test mode)
4. Deploy rules from `firestore.rules`
5. Add web app config values to `.env`

## Firestore Collections Used

- `users/{uid}`
- `players/{uid}`
- `events/{autoId}`
- `settings/auction`

## Important Notes

- This is a fun-auction app; add stricter server-side validation if you want tournament-grade security.
- Current logic is fully real-time and optimized for small-to-medium private groups.
