// app/page.tsx
"use client";

import ClassicPacman from "@/components/pacman/ClassicPacman";
import HeaderBar from "@/components/ui/HeaderBar";
import { usePrivy, CrossAppAccountWithMetadata, LinkedAccount } from "@privy-io/react-auth";
import { useEffect, useMemo, useState } from "react";
import { getUsernameForWallet } from "@/lib/username";

const MONAD_CROSS_APP_ID = "cmd8euall0037le0my79qpz42";

function isCrossAppAccount(
  acc: LinkedAccount | CrossAppAccountWithMetadata | undefined
): acc is CrossAppAccountWithMetadata {
  return !!acc && acc.type === "cross_app" && "providerApp" in acc && !!acc.providerApp;
}

export default function HomePage() {
  const { user, authenticated, login, logout } = usePrivy(); // removed `ready`
  const [username, setUsername] = useState<string | null>(null);

  // Ambil wallet dari Cross App (Monad Games ID) dengan tipe aman
  const wallet = useMemo(() => {
    if (!authenticated || !user) return null;

    const crossAcc = user.linkedAccounts.find(
      (a) => a.type === "cross_app" && "providerApp" in a && (a as CrossAppAccountWithMetadata).providerApp?.id === MONAD_CROSS_APP_ID
    );

    if (!isCrossAppAccount(crossAcc)) return null;

    const addr = crossAcc.embeddedWallets?.[0]?.address;
    return typeof addr === "string" && addr.startsWith("0x") ? addr : null;
  }, [authenticated, user]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      if (!wallet) {
        setUsername(null);
        return;
      }
      const uname = await getUsernameForWallet(wallet);
      if (!canceled) setUsername(uname);
    })();
    return () => {
      canceled = true;
    };
  }, [wallet]);

  async function submitDeltaScore(delta: number, playedMs?: number) {
    if (!wallet || delta <= 0) return;
    try {
      const res = await fetch("/api/submit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          deltaScore: delta, // delta-only, BUKAN total
          deltaTx: 0,
          level: 1, // bisa diisi dari state level game kamu
          playedMs: playedMs ?? 0,
        }),
      });
      // optional: gunakan response untuk toast/telemetry
      // const json = await res.json();
      // console.log("submit score:", json);
    } catch {
      // swallow: biar tidak ganggu gameplay
    }
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
          onScoreSubmit={(delta) => submitDeltaScore(delta)}
        />
      </div>
    </main>
  );
}
