"use client";

import { useEffect, useState } from "react";
import LoginGamesID from "./LoginGamesID";
import { fetchUsernameForWallet } from "@/lib/gamesId";

export default function GamesIdBar() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

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
          <a
            className="underline underline-offset-4 text-yellow-300"
            href="https://monad-games-id-site.vercel.app/"
            target="_blank" rel="noreferrer"
          >
            Reserve your Monad Games ID username →
          </a>
        )
      )}
    </div>
  );
}