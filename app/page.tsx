"use client";

import { useEffect, useState } from "react";
import ClassicPacman from "@/components/pacman/ClassicPacman";
import GamesIdBar from "@/components/GamesIdBar";
import { fetchUsernameForWallet } from "@/lib/gamesId";

export default function GamePage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userErr, setUserErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Ambil username saat wallet tersedia
  useEffect(() => {
    let cancel = false;
    (async () => {
      setUserErr(null);
      if (!wallet) { setUsername(null); return; }
      try {
        const res = await fetchUsernameForWallet(wallet);
        if (cancel) return;
        setUsername(res.hasUsername && res.user?.username ? res.user.username : null);
      } catch {
        if (!cancel) {
          setUsername(null);
          setUserErr("Failed to check username");
        }
      }
    })();
    return () => { cancel = true; };
  }, [wallet]);

  const handleSubmitScore = (finalScore: number) => {
    if (!wallet || finalScore <= 0 || submitting) return;
    setSubmitting(true);
    fetch("/api/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: wallet, scoreDelta: finalScore, txDelta: 0 }),
    })
      .catch(() => {})
      .finally(() => setSubmitting(false));
  };

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      <GamesIdBar onWallet={setWallet} onUsername={setUsername} />
      {userErr && <p className="text-xs text-red-400">{userErr}</p>}

      <ClassicPacman
        wallet={wallet}
        username={username}
        onScoreSubmit={handleSubmitScore}
      />

      {submitting && <p className="text-xs text-neutral-400">Submitting score…</p>}
    </main>
  );
}