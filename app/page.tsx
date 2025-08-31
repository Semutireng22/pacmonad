"use client";

import ClassicPacman from "@/components/pacman/ClassicPacman";
import HeaderBar from "@/components/ui/HeaderBar";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useMemo, useState } from "react";
import { getUsernameForWallet } from "@/lib/username";

export default function HomePage() {
  const { user, authenticated, ready, login, logout } = usePrivy();
  const [username, setUsername] = useState<string | null>(null);

  const wallet = useMemo(() => {
    // ambil wallet Cross App (Monad Games ID)
    if (!authenticated || !user) return null;
    const cross = user.linkedAccounts.find(
      (a) => a.type === "cross_app" && "providerApp" in a && a.providerApp?.id === "cmd8euall0037le0my79qpz42"
    ) as any;
    const w = cross?.embeddedWallets?.[0]?.address as string | undefined;
    return w ?? null;
  }, [authenticated, user]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      if (wallet) {
        const uname = await getUsernameForWallet(wallet);
        if (!canceled) setUsername(uname);
      } else {
        setUsername(null);
      }
    })();
    return () => { canceled = true; };
  }, [wallet]);

  async function submitDeltaScore(delta: number, playedMs?: number) {
    if (!wallet || delta <= 0) return;
    await fetch("/api/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        deltaScore: delta,
        deltaTx: 0,
        level: 1,         // bisa kamu isi level berjalan bila mau
        playedMs: playedMs ?? 0,
      }),
    }).catch(() => {});
  }

  return (
    <main className="min-h-screen bg-black text-neutral-200">
      <HeaderBar
        authenticated={authenticated}
        username={username}
        onLogin={login}
        onLogout={logout}
      />
      <div className="mx-auto max-w-[820px] px-4 py-6">
        <ClassicPacman
          wallet={wallet}
          username={username}
          // panggil dengan delta score (skor sesi)
          onScoreSubmit={(deltaScore) => submitDeltaScore(deltaScore)}
        />
      </div>
    </main>
  );
}
