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
  const [username, setUsername] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { onWallet(wallet); }, [wallet, onWallet]);
  useEffect(() => { onUsername(username ?? null); }, [username, onUsername]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      setError(null);
      if (!wallet) { setUsername(undefined); return; }
      try {
        setUsername(undefined); // loading
        const res = await fetchUsernameForWallet(wallet);
        if (canceled) return;
        if (res.hasUsername && res.user?.username) {
          setUsername(res.user.username);
        } else {
          setUsername(null);
        }
      } catch {
        if (!canceled) { setError("Failed to check username"); setUsername(undefined); }
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
        <>
          {username === undefined && !error && (
            <div className="px-3 py-1 rounded bg-neutral-800">Checking username…</div>
          )}

          {typeof username === "string" && (
            <div className="px-3 py-1 rounded bg-neutral-800">
              Logged in as <b>@{username}</b>
            </div>
          )}

          {username === null && (
            <button
              onClick={handleReserve}
              className="px-3 py-1 rounded bg-yellow-400 text-black hover:bg-yellow-300"
            >
              Reserve your Monad Games ID username
            </button>
          )}

          {error && (
            <div className="px-3 py-1 rounded bg-red-600/30 border border-red-600/50 text-red-200">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}