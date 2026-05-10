"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
  type Timestamp,
} from "firebase/firestore";
import { AuctionDashboard } from "@/components/auction/dashboard";
import { AuthSection } from "@/components/auction/auth-section";
import { ProfileSetupForm } from "@/components/auction/profile-setup-form";
import { TopNav } from "@/components/auction/top-nav";
import { ToastStack } from "@/components/auction/toast-stack";
import {
  ADMIN_PASSWORD,
  BASE_PRICE_OPTIONS,
  INITIAL_CAPTAIN_PURSE,
  MIN_BID_INCREMENT,
  PROFILE_LOAD_TIMEOUT_MS,
  SETTINGS_DOC_PATH,
} from "@/lib/auction/constants";
import { mapAuctionSettings, mapUserProfileFromDoc } from "@/lib/auction/mappers";
import { readProfileCache, writeProfileCache } from "@/lib/auction/profile-cache";
import type {
  AppNotification,
  AuctionEvent,
  AuctionSettings,
  PlayerProfile,
  UserProfile,
  UserRole,
} from "@/lib/auction/types";
import {
  formatEventTime,
  formatCredits,
  getEventMessage,
  isAdminEmail,
  isClientBlockedError,
  normalizeBasePrice,
  num,
  text,
  toErrorMessage,
} from "@/lib/auction/utils";
import { auth, db, missingFirebaseEnv } from "@/lib/firebase";

export default function Home() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoadTimedOut, setProfileLoadTimedOut] = useState(false);
  const [profileReloadTick, setProfileReloadTick] = useState(0);
  const [streamBlocked, setStreamBlocked] = useState(false);
  const [auctionSettings, setAuctionSettings] = useState<AuctionSettings>(() =>
    mapAuctionSettings(null),
  );
  const [adminPurseInput, setAdminPurseInput] = useState(String(INITIAL_CAPTAIN_PURSE));
  const [adminBusy, setAdminBusy] = useState(false);
  const [roundOneCountInput, setRoundOneCountInput] = useState("0");
  const [roundOneSelectedIds, setRoundOneSelectedIds] = useState<string[]>([]);
  const [roundOneBusy, setRoundOneBusy] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [captains, setCaptains] = useState<UserProfile[]>([]);
  const [events, setEvents] = useState<AuctionEvent[]>([]);

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [setupName, setSetupName] = useState("");
  const [setupRole, setSetupRole] = useState<UserRole>("player");
  const [setupTeamName, setSetupTeamName] = useState("");
  const [setupSkill, setSetupSkill] = useState("All-Rounder");
  const [setupBasePrice, setSetupBasePrice] = useState(100);
  const [setupBusy, setSetupBusy] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [playerSkill, setPlayerSkill] = useState("All-Rounder");
  const [playerBasePrice, setPlayerBasePrice] = useState(100);
  const [playerBusy, setPlayerBusy] = useState(false);

  const [bidInputs, setBidInputs] = useState<Record<string, string>>({});
  const [auctionBusyKey, setAuctionBusyKey] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const knownEventIdsRef = useRef<Set<string>>(new Set());
  const didPrimeEventsRef = useRef(false);

  const myPlayer = useMemo(() => {
    if (!firebaseUser) {
      return null;
    }

    return players.find((player) => player.uid === firebaseUser.uid) ?? null;
  }, [players, firebaseUser]);

  const openPlayers = useMemo(
    () => players.filter((player) => player.status === "open"),
    [players],
  );

  const roundOneSet = useMemo(
    () => new Set(auctionSettings.roundOnePlayerIds),
    [auctionSettings.roundOnePlayerIds],
  );
  const roundOneModeActive = auctionSettings.roundOnePlayerCount > 0;
  const openPlayersForAuction = useMemo(() => {
    if (!roundOneModeActive) {
      return openPlayers;
    }
    return openPlayers.filter((player) => roundOneSet.has(player.uid));
  }, [openPlayers, roundOneModeActive, roundOneSet]);

  const filteredOpenPlayers = useMemo(() => {
    const needle = playerSearch.trim().toLowerCase();
    if (!needle) {
      return openPlayersForAuction;
    }

    return openPlayersForAuction.filter((player) => {
      return (
        player.name.toLowerCase().includes(needle) ||
        player.skill.toLowerCase().includes(needle) ||
        (player.highestBidderName ?? "").toLowerCase().includes(needle)
      );
    });
  }, [openPlayersForAuction, playerSearch]);

  const soldPlayers = useMemo(
    () => players.filter((player) => player.status === "sold"),
    [players],
  );

  const squadsByCaptainId = useMemo(() => {
    return soldPlayers.reduce<Record<string, PlayerProfile[]>>((acc, player) => {
      if (!player.soldToCaptainId) {
        return acc;
      }

      if (!acc[player.soldToCaptainId]) {
        acc[player.soldToCaptainId] = [];
      }

      acc[player.soldToCaptainId].push(player);
      return acc;
    }, {});
  }, [soldPlayers]);

  const isAdmin = profile?.role === "admin";
  const isCaptain = profile?.role === "captain";
  const isPlayer = profile?.role === "player";
  const setupEmail = (firebaseUser?.email ?? authEmail).trim().toLowerCase();
  const canUseAdminRole = isAdminEmail(setupEmail);
  const myCaptainTotalPurse = isCaptain && profile ? profile.purse + profile.spent : null;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser);
      setAuthReady(true);
      setError(null);
      setNotice(null);
      if (!currentUser) {
        knownEventIdsRef.current = new Set();
        didPrimeEventsRef.current = false;
        setToasts([]);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      setProfileLoading(false);
      setProfileLoadTimedOut(false);
      return;
    }

    const userRef = doc(db, "users", firebaseUser.uid);
    const cachedProfile = readProfileCache(firebaseUser.uid);
    setProfileLoadTimedOut(false);

    if (cachedProfile) {
      setProfile(cachedProfile);
      setProfileLoading(false);
    } else {
      setProfileLoading(true);
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (!cachedProfile) {
      timeoutId = setTimeout(() => {
        if (cancelled) {
          return;
        }

        setProfileLoading(false);
        setProfileLoadTimedOut(true);
      }, PROFILE_LOAD_TIMEOUT_MS);
    }

    void (async () => {
      try {
        const snap = await getDoc(userRef);
        if (cancelled) {
          return;
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (!snap.exists()) {
          setProfile(null);
          writeProfileCache(firebaseUser.uid, null);
          setProfileLoading(false);
          return;
        }

        const mapped = mapUserProfileFromDoc(
          firebaseUser.uid,
          firebaseUser.email ?? "",
          snap.data() as Record<string, unknown>,
        );

        setProfile(mapped);
        setProfileLoadTimedOut(false);
        writeProfileCache(firebaseUser.uid, mapped);
        setProfileLoading(false);
      } catch {
        if (cancelled) {
          return;
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        setError("Profile load failed.");
        setProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [firebaseUser, profileReloadTick]);

  useEffect(() => {
    if (!firebaseUser || !profile || profile.role !== "captain" || captains.length === 0) {
      return;
    }

    const liveCaptain = captains.find((captain) => captain.uid === firebaseUser.uid);
    if (!liveCaptain) {
      return;
    }

    const syncedProfile: UserProfile = {
      ...profile,
      name: liveCaptain.name,
      teamName: liveCaptain.teamName,
      purse: liveCaptain.purse,
      spent: liveCaptain.spent,
    };

    if (
      syncedProfile.name === profile.name &&
      syncedProfile.teamName === profile.teamName &&
      syncedProfile.purse === profile.purse &&
      syncedProfile.spent === profile.spent
    ) {
      return;
    }

    setProfile(syncedProfile);
    writeProfileCache(firebaseUser.uid, syncedProfile);
  }, [captains, firebaseUser, profile]);

  useEffect(() => {
    setAdminPurseInput(String(auctionSettings.captainPurse));
  }, [auctionSettings.captainPurse]);

  useEffect(() => {
    setRoundOneCountInput(String(auctionSettings.roundOnePlayerCount));
    setRoundOneSelectedIds(auctionSettings.roundOnePlayerIds);
  }, [auctionSettings.roundOnePlayerCount, auctionSettings.roundOnePlayerIds]);

  useEffect(() => {
    if (!firebaseUser || !profile || profileLoading || streamBlocked) {
      setPlayers([]);
      setCaptains([]);
      setEvents([]);
      if (!firebaseUser) {
        setAuctionSettings(mapAuctionSettings(null));
      }
      return;
    }

    const onStreamError = (error: unknown) => {
      if (isClientBlockedError(error)) {
        setStreamBlocked(true);
        setError(
          "Browser extension/Shield Firestore requests block kar raha hai. AdBlock/Brave Shield me firestore.googleapis.com aur localhost allow karo.",
        );
      } else {
        setError(toErrorMessage(error));
      }
    };

    const playersUnsub = onSnapshot(
      collection(db, "players"),
      (snap) => {
        const nextPlayers: PlayerProfile[] = snap.docs.map((playerDoc) => {
          const data = playerDoc.data();

          return {
            uid: playerDoc.id,
            name: text(data.name, "Unknown Player"),
            skill: text(data.skill, "All-Rounder"),
            basePrice: normalizeBasePrice(data.basePrice),
            currentBid: num(data.currentBid, normalizeBasePrice(data.basePrice)),
            status: text(data.status, "open") as "open" | "sold",
            highestBidderId: text(data.highestBidderId, "") || null,
            highestBidderName: text(data.highestBidderName, "") || null,
            soldToCaptainId: text(data.soldToCaptainId, "") || null,
            soldToCaptainName: text(data.soldToCaptainName, "") || null,
            soldPrice: num(data.soldPrice, 0) || null,
          };
        });

        nextPlayers.sort((a, b) => b.currentBid - a.currentBid);
        setPlayers(nextPlayers);
      },
      onStreamError,
    );

    const captainsUnsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "captain")),
      (snap) => {
        const nextCaptains: UserProfile[] = snap.docs.map((captainDoc) => {
          const data = captainDoc.data();

          return {
            uid: captainDoc.id,
            email: text(data.email),
            name: text(data.name, "Captain"),
            role: "captain",
            teamName: text(data.teamName, ""),
            purse: num(data.purse, auctionSettings.captainPurse),
            spent: num(data.spent),
          };
        });

        nextCaptains.sort((a, b) => b.purse - a.purse);
        setCaptains(nextCaptains);
      },
      onStreamError,
    );

    const eventsUnsub = onSnapshot(
      query(collection(db, "events"), orderBy("createdAt", "desc"), limit(40)),
      (snap) => {
        const nextEvents: AuctionEvent[] = snap.docs.map((eventDoc) => {
          const data = eventDoc.data();

          return {
            id: eventDoc.id,
            type: text(data.type, "bid") as AuctionEvent["type"],
            playerId: text(data.playerId),
            playerName: text(data.playerName, "Unknown Player"),
            captainId: text(data.captainId, ""),
            captainName: text(data.captainName, ""),
            amount: num(data.amount),
            note: text(data.note, ""),
            createdAt: (data.createdAt as Timestamp | undefined) ?? null,
          };
        });

        setEvents(nextEvents);

        if (!didPrimeEventsRef.current) {
          knownEventIdsRef.current = new Set(nextEvents.map((eventItem) => eventItem.id));
          didPrimeEventsRef.current = true;
          return;
        }

        const newEvents = nextEvents.filter((eventItem) => !knownEventIdsRef.current.has(eventItem.id));
        if (newEvents.length === 0) {
          return;
        }

        newEvents.forEach((eventItem) => {
          knownEventIdsRef.current.add(eventItem.id);
        });

        const orderedByTime = [...newEvents].sort((a, b) => {
          const aTime = a.createdAt?.toMillis() ?? 0;
          const bTime = b.createdAt?.toMillis() ?? 0;
          return aTime - bTime;
        });

        const newNotifications = orderedByTime.map((eventItem) => ({
          id: eventItem.id,
          title: eventItem.type === "bid" ? "New Bid" : "Auction Update",
          message: getEventMessage(eventItem),
          createdAtLabel: formatEventTime(eventItem.createdAt),
        }));

        newNotifications.forEach((notification) => {
          setToasts((prev) => [notification, ...prev].slice(0, 4));
          setTimeout(() => {
            setToasts((prev) => prev.filter((item) => item.id !== notification.id));
          }, 5000);
        });

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          window.Notification.permission === "granted"
        ) {
          newNotifications.forEach((notification) => {
            try {
              void new window.Notification(notification.title, {
                body: notification.message,
              });
            } catch {
              // ignore browser notification errors
            }
          });
        }
      },
      onStreamError,
    );

    const settingsRef = doc(db, SETTINGS_DOC_PATH.collection, SETTINGS_DOC_PATH.id);
    const settingsUnsub = onSnapshot(
      settingsRef,
      (snap) => {
        const nextSettings = mapAuctionSettings(
          snap.exists() ? (snap.data() as Record<string, unknown>) : null,
        );
        setAuctionSettings(nextSettings);
      },
      onStreamError,
    );

    return () => {
      playersUnsub();
      captainsUnsub();
      eventsUnsub();
      settingsUnsub();
    };
  }, [
    firebaseUser,
    profile,
    profileLoading,
    streamBlocked,
    auctionSettings.captainPurse,
  ]);

  useEffect(() => {
    if (!firebaseUser || setupName) {
      return;
    }

    const emailPrefix = firebaseUser.email?.split("@")[0] ?? "";
    if (emailPrefix) {
      setSetupName(emailPrefix);
    }
  }, [firebaseUser, setupName]);

  useEffect(() => {
    if (!myPlayer) {
      return;
    }

    setPlayerName(myPlayer.name);
    setPlayerSkill(myPlayer.skill);
    setPlayerBasePrice(normalizeBasePrice(myPlayer.basePrice));
  }, [myPlayer]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!authEmail || !authPassword) {
      setError("Email aur password dono chahiye.");
      return;
    }

    const normalizedEmail = authEmail.trim().toLowerCase();
    if (isAdminEmail(normalizedEmail) && authPassword !== ADMIN_PASSWORD) {
      setError("Admin password fixed hai. Admin login ke liye password 123456 use karo.");
      return;
    }

    setAuthBusy(true);

    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, normalizedEmail, authPassword);
        setNotice("Account ready. Ab role setup complete karo.");
      } else {
        await signInWithEmailAndPassword(auth, normalizedEmail, authPassword);
        setNotice("Welcome back!");
      }

      setAuthPassword("");
    } catch (authError) {
      setError(toErrorMessage(authError));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleProfileSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firebaseUser) {
      return;
    }

    setError(null);
    setNotice(null);

    const cleanName = setupName.trim();
    const cleanTeamName = setupTeamName.trim();
    const normalizedSignedInEmail = (firebaseUser.email ?? authEmail).trim().toLowerCase();

    if (!cleanName) {
      setError("Display name required hai.");
      return;
    }

    if (setupRole === "admin" && !isAdminEmail(normalizedSignedInEmail)) {
      setError("Admin role sirf allowed admin email use kar sakti hai.");
      return;
    }

    if (isAdminEmail(normalizedSignedInEmail) && setupRole !== "admin") {
      setError("Ye reserved admin email hai. Is account ka role Admin hi rahega.");
      return;
    }

    if (setupRole === "captain" && !cleanTeamName) {
      setError("Captain team name required hai.");
      return;
    }

    if (
      setupRole === "player" &&
      !BASE_PRICE_OPTIONS.includes(setupBasePrice as (typeof BASE_PRICE_OPTIONS)[number])
    ) {
      setError("Base price sirf 100, 200, 500 me se hona chahiye.");
      return;
    }

    setSetupBusy(true);

    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? authEmail,
        name: cleanName,
        role: setupRole,
        teamName: setupRole === "captain" ? cleanTeamName : "",
        purse: setupRole === "captain" ? auctionSettings.captainPurse : 0,
        spent: 0,
      };

      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email: newProfile.email,
        name: newProfile.name,
        role: newProfile.role,
        purse: newProfile.purse,
        spent: newProfile.spent,
        teamName: newProfile.teamName ?? "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (setupRole === "player") {
        const playerRef = doc(db, "players", firebaseUser.uid);

        await setDoc(playerRef, {
          uid: firebaseUser.uid,
          name: cleanName,
          skill: setupSkill,
          basePrice: setupBasePrice,
          currentBid: setupBasePrice,
          status: "open",
          highestBidderId: null,
          highestBidderName: null,
          soldToCaptainId: null,
          soldToCaptainName: null,
          soldPrice: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const eventRef = doc(collection(db, "events"));
        await setDoc(eventRef, {
          type: "player_update",
          playerId: firebaseUser.uid,
          playerName: cleanName,
          amount: setupBasePrice,
          note: "Player registered for auction",
          createdAt: serverTimestamp(),
        });
      }

      setProfile(newProfile);
      setProfileLoading(false);
      writeProfileCache(firebaseUser.uid, newProfile);
      setNotice("Profile setup complete. Auction ready.");
    } catch (setupError) {
      setError(toErrorMessage(setupError));
    } finally {
      setSetupBusy(false);
    }
  }

  async function handlePlayerUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firebaseUser || !myPlayer) {
      return;
    }

    const cleanName = playerName.trim();

    if (!cleanName) {
      setError("Player name blank nahi ho sakta.");
      return;
    }

    setPlayerBusy(true);
    setError(null);
    setNotice(null);

    try {
      const playerRef = doc(db, "players", firebaseUser.uid);
      const userRef = doc(db, "users", firebaseUser.uid);
      const basePriceLocked = Boolean(myPlayer.highestBidderId) || myPlayer.status === "sold";

      await updateDoc(userRef, {
        name: cleanName,
        updatedAt: serverTimestamp(),
      });

      if (basePriceLocked) {
        await updateDoc(playerRef, {
          name: cleanName,
          skill: playerSkill,
          updatedAt: serverTimestamp(),
        });
      } else {
        const sanitizedBasePrice = normalizeBasePrice(playerBasePrice);

        await updateDoc(playerRef, {
          name: cleanName,
          skill: playerSkill,
          basePrice: sanitizedBasePrice,
          currentBid: sanitizedBasePrice,
          updatedAt: serverTimestamp(),
        });
      }

      const eventRef = doc(collection(db, "events"));
      await setDoc(eventRef, {
        type: "player_update",
        playerId: myPlayer.uid,
        playerName: cleanName,
        amount: basePriceLocked ? myPlayer.basePrice : normalizeBasePrice(playerBasePrice),
        note: basePriceLocked
          ? "Player details updated"
          : "Player profile and base price updated",
        createdAt: serverTimestamp(),
      });

      setProfile((prevProfile) => {
        if (!prevProfile) {
          return prevProfile;
        }

        const nextProfile = { ...prevProfile, name: cleanName };
        writeProfileCache(firebaseUser.uid, nextProfile);
        return nextProfile;
      });
      setNotice("Player profile updated.");
    } catch (updateError) {
      setError(toErrorMessage(updateError));
    } finally {
      setPlayerBusy(false);
    }
  }

  async function placeBid(player: PlayerProfile) {
    if (!firebaseUser) {
      return;
    }

    if (!auctionSettings.biddingOpen) {
      setError("Bidding round abhi stopped hai. Admin start karega tab bid hoga.");
      return;
    }

    const rawBid = bidInputs[player.uid] ?? "";
    const amount = Number(rawBid);

    if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
      setError("Valid bid amount daalo.");
      return;
    }

    setAuctionBusyKey(`${player.uid}:bid`);
    setError(null);
    setNotice(null);

    try {
      await runTransaction(db, async (transaction) => {
        const settingsRef = doc(db, SETTINGS_DOC_PATH.collection, SETTINGS_DOC_PATH.id);
        const captainRef = doc(db, "users", firebaseUser.uid);
        const playerRef = doc(db, "players", player.uid);

        const settingsSnap = await transaction.get(settingsRef);
        const captainSnap = await transaction.get(captainRef);
        const playerSnap = await transaction.get(playerRef);

        if (!captainSnap.exists() || !playerSnap.exists()) {
          throw new Error("Captain ya player record missing hai.");
        }

        const captainData = captainSnap.data();
        const playerData = playerSnap.data();
        const settingsData = settingsSnap.exists()
          ? (settingsSnap.data() as Record<string, unknown>)
          : null;

        if (settingsData && settingsData.biddingOpen === false) {
          throw new Error("Bidding round stopped by admin.");
        }

        if (text(captainData.role) !== "captain") {
          throw new Error("Sirf captains bid kar sakte hain.");
        }

        if (text(playerData.status) !== "open") {
          throw new Error("Ye player auction se close ho chuka hai.");
        }

        const currentBid = num(playerData.currentBid, num(playerData.basePrice, 0));
        const nextBid = currentBid + MIN_BID_INCREMENT;

        if (amount !== nextBid) {
          throw new Error(`Next bid exact ${formatCredits(nextBid)} honi chahiye.`);
        }

        const captainPurse = num(captainData.purse, INITIAL_CAPTAIN_PURSE);

        if (amount > captainPurse) {
          throw new Error("Insufficient purse balance.");
        }

        const captainName = text(captainData.teamName) || text(captainData.name, "Captain");

        transaction.update(playerRef, {
          currentBid: amount,
          highestBidderId: firebaseUser.uid,
          highestBidderName: captainName,
          updatedAt: serverTimestamp(),
        });

        const eventRef = doc(collection(db, "events"));
        transaction.set(eventRef, {
          type: "bid",
          playerId: player.uid,
          playerName: text(playerData.name, "Unknown Player"),
          captainId: firebaseUser.uid,
          captainName,
          amount,
          createdAt: serverTimestamp(),
        });
      });

      setBidInputs((prev) => ({ ...prev, [player.uid]: "" }));
      setNotice(`${player.name} par bid place ho gayi.`);
    } catch (bidError) {
      setError(toErrorMessage(bidError));
    } finally {
      setAuctionBusyKey(null);
    }
  }

  async function confirmWinningBid(player: PlayerProfile) {
    if (!firebaseUser || !profile) {
      return;
    }

    if (profile.role !== "admin") {
      setError("Winning bid allot sirf admin kar sakta hai.");
      return;
    }

    setAuctionBusyKey(`${player.uid}:confirm`);
    setError(null);
    setNotice(null);

    try {
      await runTransaction(db, async (transaction) => {
        const playerRef = doc(db, "players", player.uid);

        const playerSnap = await transaction.get(playerRef);

        if (!playerSnap.exists()) {
          throw new Error("Player record missing hai.");
        }

        const playerData = playerSnap.data();

        if (text(playerData.status) !== "open") {
          throw new Error("Player already sold hai.");
        }

        const winningCaptainId = text(playerData.highestBidderId);
        if (!winningCaptainId) {
          throw new Error("Is player par abhi koi highest bid nahi hai.");
        }

        const winningCaptainRef = doc(db, "users", winningCaptainId);
        const winningCaptainSnap = await transaction.get(winningCaptainRef);
        if (!winningCaptainSnap.exists()) {
          throw new Error("Winning captain profile missing hai.");
        }

        const winningCaptainData = winningCaptainSnap.data();
        if (text(winningCaptainData.role) !== "captain") {
          throw new Error("Highest bidder captain account nahi hai.");
        }

        const finalPrice = num(playerData.currentBid, 0);
        const purse = num(winningCaptainData.purse, INITIAL_CAPTAIN_PURSE);

        if (purse < finalPrice) {
          throw new Error("Winning captain ke purse me enough balance nahi hai.");
        }

        const captainName =
          text(playerData.highestBidderName) ||
          text(winningCaptainData.teamName) ||
          text(winningCaptainData.name, "Captain");

        transaction.update(winningCaptainRef, {
          purse: purse - finalPrice,
          spent: num(winningCaptainData.spent) + finalPrice,
          updatedAt: serverTimestamp(),
        });

        transaction.update(playerRef, {
          status: "sold",
          soldToCaptainId: winningCaptainId,
          soldToCaptainName: captainName,
          soldPrice: finalPrice,
          updatedAt: serverTimestamp(),
        });

        const eventRef = doc(collection(db, "events"));
        transaction.set(eventRef, {
          type: "sold_bid",
          playerId: player.uid,
          playerName: text(playerData.name, "Unknown Player"),
          captainId: winningCaptainId,
          captainName,
          amount: finalPrice,
          note: `Winning bid allotted by admin ${profile.name}`,
          createdAt: serverTimestamp(),
        });
      });

      setNotice(`${player.name} highest bidder ko allot ho gaya.`);
    } catch (confirmError) {
      setError(toErrorMessage(confirmError));
    } finally {
      setAuctionBusyKey(null);
    }
  }

  async function setBiddingStatus(nextStatus: boolean) {
    if (!firebaseUser || !profile || profile.role !== "admin") {
      setError("Only admin can control bidding status.");
      return;
    }

    setAdminBusy(true);
    setError(null);
    setNotice(null);

    try {
      const settingsRef = doc(db, SETTINGS_DOC_PATH.collection, SETTINGS_DOC_PATH.id);
      const eventRef = doc(collection(db, "events"));

      await setDoc(
        settingsRef,
        {
          biddingOpen: nextStatus,
          captainPurse: auctionSettings.captainPurse,
          currentRound: auctionSettings.currentRound,
          updatedById: firebaseUser.uid,
          updatedByName: profile.name,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await setDoc(eventRef, {
        type: "admin_update",
        playerId: "auction",
        playerName: "Auction Control",
        amount: auctionSettings.captainPurse,
        captainId: firebaseUser.uid,
        captainName: profile.name,
        note: nextStatus ? "Bidding round started by admin" : "Bidding round stopped by admin",
        createdAt: serverTimestamp(),
      });

      setAuctionSettings((prev) => ({ ...prev, biddingOpen: nextStatus, updatedByName: profile.name }));
      setNotice(nextStatus ? "Bidding round started." : "Bidding round stopped.");
    } catch (adminError) {
      setError(toErrorMessage(adminError));
    } finally {
      setAdminBusy(false);
    }
  }

  async function applyCaptainPurseToAll() {
    if (!firebaseUser || !profile || profile.role !== "admin") {
      setError("Only admin can set captain purse.");
      return;
    }

    const targetPurse = Math.round(Number(adminPurseInput));
    if (!Number.isFinite(targetPurse) || targetPurse < 0) {
      setError("Valid purse amount daalo.");
      return;
    }

    setAdminBusy(true);
    setError(null);
    setNotice(null);

    try {
      const captainsSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "captain")),
      );

      if (captainsSnap.size > 490) {
        throw new Error("Captain count too high for single batch. Split required.");
      }

      const batch = writeBatch(db);
      captainsSnap.docs.forEach((captainDoc) => {
        batch.update(captainDoc.ref, {
          purse: targetPurse,
          spent: 0,
          updatedAt: serverTimestamp(),
        });
      });

      const settingsRef = doc(db, SETTINGS_DOC_PATH.collection, SETTINGS_DOC_PATH.id);
      batch.set(
        settingsRef,
        {
          captainPurse: targetPurse,
          biddingOpen: auctionSettings.biddingOpen,
          currentRound: auctionSettings.currentRound,
          updatedById: firebaseUser.uid,
          updatedByName: profile.name,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      const eventRef = doc(collection(db, "events"));
      batch.set(eventRef, {
        type: "admin_update",
        playerId: "auction",
        playerName: "Auction Control",
        amount: targetPurse,
        captainId: firebaseUser.uid,
        captainName: profile.name,
        note: `All captain purse reset to ${formatCredits(targetPurse)}`,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      setAuctionSettings((prev) => ({ ...prev, captainPurse: targetPurse, updatedByName: profile.name }));
      setNotice(`Captain purse updated to ${formatCredits(targetPurse)} for all teams.`);
    } catch (adminError) {
      setError(toErrorMessage(adminError));
    } finally {
      setAdminBusy(false);
    }
  }

  function toggleRoundOnePlayer(playerId: string) {
    setRoundOneSelectedIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      return [...prev, playerId];
    });
  }

  async function saveRoundOneConfig() {
    if (!firebaseUser || !profile || profile.role !== "admin") {
      setError("Only admin can set round players.");
      return;
    }

    const currentRound = Math.max(1, auctionSettings.currentRound);
    const targetCount = Math.round(Number(roundOneCountInput));
    if (!Number.isFinite(targetCount) || targetCount < 0) {
      setError(`Round ${currentRound} player count valid number hona chahiye.`);
      return;
    }

    if (targetCount > openPlayers.length) {
      setError(`Open pool me abhi sirf ${openPlayers.length} players available hain.`);
      return;
    }

    const openPlayerIdSet = new Set(openPlayers.map((player) => player.uid));
    let finalSelectedIds = Array.from(new Set(roundOneSelectedIds)).filter((id) =>
      openPlayerIdSet.has(id),
    );

    if (targetCount === 0) {
      finalSelectedIds = [];
    } else if (finalSelectedIds.length !== targetCount) {
      setError(
        `Round ${currentRound} count ${targetCount} hai, isliye exactly ${targetCount} players select karo (abhi ${finalSelectedIds.length}).`,
      );
      return;
    }

    setRoundOneBusy(true);
    setError(null);
    setNotice(null);

    try {
      const settingsRef = doc(db, SETTINGS_DOC_PATH.collection, SETTINGS_DOC_PATH.id);
      await setDoc(
        settingsRef,
        {
          currentRound,
          roundOnePlayerCount: targetCount,
          roundOnePlayerIds: finalSelectedIds,
          updatedById: firebaseUser.uid,
          updatedByName: profile.name,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      const eventRef = doc(collection(db, "events"));
      await setDoc(eventRef, {
        type: "admin_update",
        playerId: "round_one",
        playerName: `Round ${currentRound}`,
        amount: targetCount,
        captainId: firebaseUser.uid,
        captainName: profile.name,
        note:
          targetCount === 0
            ? `Round ${currentRound} players cleared by admin`
            : `Round ${currentRound} configured: ${targetCount} players selected`,
        createdAt: serverTimestamp(),
      });

      setAuctionSettings((prev) => ({
        ...prev,
        roundOnePlayerCount: targetCount,
        roundOnePlayerIds: finalSelectedIds,
        updatedByName: profile.name,
      }));
      setRoundOneSelectedIds(finalSelectedIds);
      setNotice(
        targetCount === 0
          ? `Round ${currentRound} list cleared. Ab full open pool visible hoga.`
          : `Round ${currentRound} saved with ${targetCount} players.`,
      );
    } catch (roundError) {
      setError(toErrorMessage(roundError));
    } finally {
      setRoundOneBusy(false);
    }
  }

  async function goToNextRound() {
    if (!firebaseUser || !profile || profile.role !== "admin") {
      setError("Only admin can move to next round.");
      return;
    }

    if (auctionSettings.biddingOpen) {
      setError("Next round pe jane se pehle current bidding stop karo.");
      return;
    }

    const nextRound = Math.max(1, auctionSettings.currentRound) + 1;
    setRoundOneBusy(true);
    setError(null);
    setNotice(null);

    try {
      const settingsRef = doc(db, SETTINGS_DOC_PATH.collection, SETTINGS_DOC_PATH.id);
      await setDoc(
        settingsRef,
        {
          currentRound: nextRound,
          roundOnePlayerCount: 0,
          roundOnePlayerIds: [],
          updatedById: firebaseUser.uid,
          updatedByName: profile.name,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      const eventRef = doc(collection(db, "events"));
      await setDoc(eventRef, {
        type: "admin_update",
        playerId: "round_shift",
        playerName: `Round ${nextRound}`,
        amount: 0,
        captainId: firebaseUser.uid,
        captainName: profile.name,
        note: `Moved to Round ${nextRound}. Select players and start bidding.`,
        createdAt: serverTimestamp(),
      });

      setAuctionSettings((prev) => ({
        ...prev,
        currentRound: nextRound,
        roundOnePlayerCount: 0,
        roundOnePlayerIds: [],
        updatedByName: profile.name,
      }));
      setRoundOneCountInput("0");
      setRoundOneSelectedIds([]);
      setNotice(`Round ${nextRound} ready. Ab players select karke save karo.`);
    } catch (nextRoundError) {
      setError(toErrorMessage(nextRoundError));
    } finally {
      setRoundOneBusy(false);
    }
  }

  async function handleSignOut() {
    setError(null);
    setNotice(null);
    await signOut(auth);
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-lg text-white/80">
        Loading auction room...
      </main>
    );
  }

  return (
    <main className="stadium-grid min-h-screen px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <TopNav
          isAuthenticated={Boolean(firebaseUser)}
          profileName={profile?.name}
          profileRole={profile?.role}
          biddingOpen={auctionSettings.biddingOpen}
          currentRound={auctionSettings.currentRound}
          purseLabel={
            firebaseUser && profile
              ? isCaptain && myCaptainTotalPurse !== null
                ? `Total ${formatCredits(myCaptainTotalPurse)}`
                : `Purse ${formatCredits(auctionSettings.captainPurse)}`
              : undefined
          }
          onSignOut={firebaseUser ? handleSignOut : undefined}
        />

        {missingFirebaseEnv.length > 0 ? (
          <section className="glass border border-amber-300/40 bg-amber-500/15 p-4 text-sm text-amber-100">
            Firebase setup pending. Missing env keys: {missingFirebaseEnv.join(", ")}
          </section>
        ) : null}

        {error ? (
          <section className="glass border border-rose-300/40 bg-rose-600/20 p-4 text-sm text-rose-100">
            {error}
          </section>
        ) : null}

        {notice ? (
          <section className="glass border border-emerald-300/40 bg-emerald-600/20 p-4 text-sm text-emerald-100">
            {notice}
          </section>
        ) : null}

        {firebaseUser && profile ? (
          <section id="overview" className="glass flex flex-wrap items-center gap-3 p-4 text-sm">
            <span
              className={`rounded-full border px-3 py-1 font-semibold ${
                auctionSettings.biddingOpen
                  ? "border-emerald-300/50 bg-emerald-500/20 text-emerald-100"
                  : "border-rose-300/50 bg-rose-600/20 text-rose-100"
              }`}
            >
              Bidding: {auctionSettings.biddingOpen ? "Open" : "Stopped"}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/85">
              {isCaptain && myCaptainTotalPurse !== null
                ? `My Total Purse: ${formatCredits(myCaptainTotalPurse)}`
                : `Captain Purse Setting: ${formatCredits(auctionSettings.captainPurse)}`}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/85">
              {roundOneModeActive
                ? `Round ${auctionSettings.currentRound}: ${openPlayersForAuction.length}/${auctionSettings.roundOnePlayerCount} live`
                : `Round ${auctionSettings.currentRound}: not configured (all open players visible)`}
            </span>
            {auctionSettings.updatedByName ? (
              <span className="text-white/65">Updated by: {auctionSettings.updatedByName}</span>
            ) : null}
          </section>
        ) : null}

        {streamBlocked ? (
          <section className="glass space-y-3 border border-amber-300/40 bg-amber-600/20 p-4 text-sm text-amber-100">
            <p>
              Live Firestore stream block ho raha hai (`ERR_BLOCKED_BY_CLIENT`). Browser extension ya shield
              off karke retry karo.
            </p>
            <button
              type="button"
              onClick={() => {
                setStreamBlocked(false);
                setError(null);
                setProfileReloadTick((prev) => prev + 1);
              }}
              className="rounded-xl border border-amber-100/40 bg-amber-300/20 px-4 py-2 font-semibold hover:bg-amber-300/30"
            >
              Retry Live Sync
            </button>
          </section>
        ) : null}

        {!firebaseUser ? (
          <AuthSection
            authMode={authMode}
            authEmail={authEmail}
            authPassword={authPassword}
            authBusy={authBusy}
            onAuthModeToggle={() => setAuthMode((prev) => (prev === "signup" ? "login" : "signup"))}
            onAuthEmailChange={setAuthEmail}
            onAuthPasswordChange={setAuthPassword}
            onAuthSubmit={handleAuthSubmit}
          />
        ) : null}

        {firebaseUser && profileLoading ? (
          <section className="glass space-y-3 p-6 text-white/80">
            <p>Loading profile...</p>
            <button
              type="button"
              onClick={() => setProfileReloadTick((prev) => prev + 1)}
              className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
            >
              Retry Profile Sync
            </button>
          </section>
        ) : null}

        {firebaseUser && !profileLoading && !profile && profileLoadTimedOut ? (
          <section className="glass space-y-3 border border-amber-300/40 bg-amber-600/20 p-5 text-amber-100">
            <p className="text-sm">
              Profile sync slow hai. Existing account ho to retry karo, warna setup continue kar sakte ho.
            </p>
            <button
              type="button"
              onClick={() => {
                setProfileLoadTimedOut(false);
                setProfileLoading(true);
                setProfileReloadTick((prev) => prev + 1);
              }}
              className="w-full rounded-xl border border-amber-100/40 bg-amber-300/20 px-4 py-2 text-sm font-semibold hover:bg-amber-300/30 sm:w-auto"
            >
              Retry Profile Sync
            </button>
          </section>
        ) : null}

        {firebaseUser && !profileLoading && !profile ? (
          <ProfileSetupForm
            setupName={setupName}
            setupRole={setupRole}
            setupTeamName={setupTeamName}
            setupSkill={setupSkill}
            setupBasePrice={setupBasePrice}
            setupBusy={setupBusy}
            canUseAdminRole={canUseAdminRole}
            onSetupNameChange={setSetupName}
            onSetupRoleChange={setSetupRole}
            onSetupTeamNameChange={setSetupTeamName}
            onSetupSkillChange={setSetupSkill}
            onSetupBasePriceChange={setSetupBasePrice}
            onSetupSubmit={handleProfileSetup}
          />
        ) : null}

        {firebaseUser && profile && !profileLoading ? (
          <AuctionDashboard
            profile={profile}
            firebaseUserId={firebaseUser.uid}
            isAdmin={isAdmin}
            isCaptain={isCaptain}
            isPlayer={isPlayer}
            myPlayer={myPlayer}
            auctionSettings={auctionSettings}
            adminBusy={adminBusy}
            adminPurseInput={adminPurseInput}
            roundOneCountInput={roundOneCountInput}
            roundOneSelectedIds={roundOneSelectedIds}
            roundOneBusy={roundOneBusy}
            openPlayers={openPlayers}
            roundOneModeActive={roundOneModeActive}
            playerName={playerName}
            playerSkill={playerSkill}
            playerBasePrice={playerBasePrice}
            playerBusy={playerBusy}
            playerSearch={playerSearch}
            filteredOpenPlayers={filteredOpenPlayers}
            bidInputs={bidInputs}
            auctionBusyKey={auctionBusyKey}
            soldPlayers={soldPlayers}
            captains={captains}
            squadsByCaptainId={squadsByCaptainId}
            events={events}
            onSetBiddingStatus={setBiddingStatus}
            onAdminPurseInputChange={setAdminPurseInput}
            onApplyCaptainPurseToAll={applyCaptainPurseToAll}
            onRoundOneCountInputChange={setRoundOneCountInput}
            onSaveRoundConfig={saveRoundOneConfig}
            onNextRound={goToNextRound}
            onToggleRoundPlayer={toggleRoundOnePlayer}
            onPlayerNameChange={setPlayerName}
            onPlayerSkillChange={setPlayerSkill}
            onPlayerBasePriceChange={setPlayerBasePrice}
            onPlayerUpdateSubmit={handlePlayerUpdate}
            onPlayerSearchChange={setPlayerSearch}
            onBidInputChange={(playerId, value) =>
              setBidInputs((prev) => ({
                ...prev,
                [playerId]: value,
              }))
            }
            onPlaceBid={placeBid}
            onConfirmWinningBid={confirmWinningBid}
          />
        ) : null}

        <ToastStack toasts={toasts} />
      </div>
    </main>
  );
}
