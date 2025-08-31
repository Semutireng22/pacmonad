"use client";

import { useEffect, useState } from "react";
import LoginGamesID from "./LoginGamesID";
import { fetchUsernameForWallet } from "@/lib/gamesId";

export default function GamesIdBar({
  onWallet,
  onUsername,
}: {
  onWallet: (w: string | null) => void;
  onUsername: (u: string | null) => void;
}) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // propagate ke parent
  useEffect(() => { onWallet(wallet); }, [wallet, onWallet]);
  useEffect(() => { onUsername(username); }, [username, onUsername]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      if (!wallet) { setUsername(null); return; }
      try {
        setLoadingUser(true);
        const res = await fetchUsernameForWallet(wallet);
        if (!canceled) setUsername(res.hasUsername ? res.user!.username : null);
      } finally {
        if (!canceled) setLoadingUser(false);
      }
    })();
    return () => { canceled = true; };
  }, [wallet]);

  const handleReserve = () => {
    window.open("https://monad-games-id-site.vercel.app/", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <LoginGamesID onWallet={setWallet} />

      {wallet && (
        username ? (
          <div className="px-3 py-1 rounded bg-neutral-800">
            Logged in as <b>@{username}</b>
          </div>
        ) : loadingUser ? (
          <div className="px-3 py-1 rounded bg-neutral-800">Checking username…</div>
        ) : (
          <button
            onClick={handleReserve}
            className="px-3 py-1 rounded bg-yellow-400 text-black hover:bg-yellow-300"
          >
            Reserve your Monad Games ID username
          </button>
        )
      )}
    </div>
  );
}