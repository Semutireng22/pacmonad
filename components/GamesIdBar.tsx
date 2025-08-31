"use client";

import { useEffect } from "react";
import { usePrivy, CrossAppAccountWithMetadata } from "@privy-io/react-auth";

export default function GamesIdBar({
  onWallet,
  onUsername,
}: {
  onWallet: (addr: string | null) => void;
  onUsername?: (u: string | null) => void;
}) {
  const { authenticated, user, ready, login, logout } = usePrivy();

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user) {
      onWallet(null);
      onUsername?.(null);
      return;
    }
    const cross = user.linkedAccounts.find(
      (a) => a.type === "cross_app" && (a as CrossAppAccountWithMetadata).providerApp?.id === "cmd8euall0037le0my79qpz42"
    ) as CrossAppAccountWithMetadata | undefined;

    const addr = cross?.embeddedWallets?.[0]?.address ?? null;
    onWallet(addr ?? null);
    // username akan di-fetch di page; tapi kalau mau, bisa panggil fetch di sini dan kirim onUsername
  }, [authenticated, user, ready, onWallet, onUsername]);

  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2">
      <div className="text-sm text-neutral-300">Sign in with Monad Games ID</div>
      <div className="flex items-center gap-2">
        {authenticated ? (
          <button onClick={logout} className="px-3 py-1 text-sm rounded bg-neutral-800 hover:bg-neutral-700">
            Logout
          </button>
        ) : (
          <button onClick={login} className="px-3 py-1 text-sm rounded bg-yellow-400 text-black hover:bg-yellow-300">
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}