"use client";

import { useCallback, useEffect, useState } from "react";
import ClassicPacman from "@/components/pacman/ClassicPacman";

// (Opsional) jika Privy Provider aktif di app kamu:
import {
  usePrivy,
  CrossAppAccountWithMetadata,
} from "@privy-io/react-auth";

export default function HomePage() {
  // wallet Monad Games ID (embedded wallet)
  const [wallet, setWallet] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState<boolean>(false);

  // -------- Ambil wallet dari Privy (Cross App ID Monad Games ID) --------
  // Jika Privy belum diset, blok ini tidak akan error — hanya tidak mengisi wallet.
  const { authenticated, user, ready } = usePrivy?.() ?? {
    authenticated: false,
    user: undefined,
    ready: false,
  };

  useEffect(() => {
    if (!ready || !authenticated || !user) return;

    // Cari linked account bertipe cross_app dengan providerApp.id Monad Games ID
    const CROSS_APP_ID = "cmd8euall0037le0my79qpz42";
    const linked = (user.linkedAccounts ?? []).find(
      (acc): acc is CrossAppAccountWithMetadata =>
        (acc as CrossAppAccountWithMetadata).type === "cross_app" &&
        (acc as CrossAppAccountWithMetadata).providerApp?.id === CROSS_APP_ID
    );

    if (linked && linked.embeddedWallets && linked.embeddedWallets.length > 0) {
      setWallet(linked.embeddedWallets[0].address);
    }
  }, [ready, authenticated, user]);

  // -------- Cek username dari endpoint Monad Games ID --------
  const checkUsername = useCallback(async (addr: string) => {
    setChecking(true);
    try {
      const res = await fetch(
        `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${addr}`,
        { method: "GET" }
      );
      if (!res.ok) throw new Error("Failed to check username");
      const data: {
        hasUsername: boolean;
        user?: { id: number; username: string; walletAddress: string };
      } = await res.json();

      setUsername(data.hasUsername && data.user ? data.user.username : null);
    } catch (e) {
      console.error(e);
      setUsername(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (wallet) void checkUsername(wallet);
  }, [wallet, checkUsername]);

  // -------- Submit skor (delta-only) ke server kamu --------
  // Komponen ClassicPacman memanggil ini saat Game Over, passing total score akhir.
  // Kita treat sebagai DELTA untuk kontrak on-chain (ditambah, bukan total kumulatif).
  const handleScoreSubmit = useCallback(
    async (finalScore: number) => {
      if (!wallet || finalScore <= 0) return;
      try {
        const r = await fetch("/api/submit-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            deltaScore: finalScore, // DELTA, bukan total kumulatif global
            deltaTx: 0,             // jika kamu juga track transaksi, isi sesuai logic-mu
            level: 0,               // opsional: isi level akhir jika perlu
            playedMs: 0,            // opsional: durasi permainan, isi kalau kamu track di client
          }),
        });
        const j = (await r.json()) as unknown;
        console.log("submit-score result:", j);
      } catch (err) {
        console.error("submit-score error:", err);
      }
    },
    [wallet]
  );

  return (
    <main className="min-h-screen bg-black text-yellow-400">
      {/* Header ringan agar tidak bentrok dengan UI komponen game */}
      <header className="w-full max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Monad Pacman</h1>

        <div className="text-right text-sm">
          {checking ? (
            <span className="text-gray-300">Checking username…</span>
          ) : username ? (
            <span className="text-yellow-300">@{username}</span>
          ) : wallet ? (
            <a
              className="inline-block px-3 py-1 rounded bg-yellow-400 text-black hover:bg-yellow-300"
              href="https://monad-games-id-site.vercel.app/"
              target="_blank"
              rel="noreferrer"
            >
              Reserve username
            </a>
          ) : (
            <span className="text-gray-300">Sign in to get username</span>
          )}
        </div>
      </header>

      {/* Game */}
      <section className="w-full max-w-5xl mx-auto px-4 pb-10">
        <ClassicPacman
          wallet={wallet}
          username={username}
          onScoreSubmit={handleScoreSubmit}
          // rootAssetBase (opsional) biarkan default agar sama dengan komponenmu
        />
      </section>

      <footer className="w-full max-w-5xl mx-auto px-4 pb-6 text-xs text-gray-400">
        Tip: Desktop tekan <b>Space</b> untuk mulai. Mobile tekan tombol <b>Start</b>. Pause ada di pojok kanan atas kanvas.
      </footer>
    </main>
  );
}
