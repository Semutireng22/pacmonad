"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy, CrossAppAccountWithMetadata } from "@privy-io/react-auth";

export default function LoginGamesID({ onWallet }: { onWallet: (addr: string | null) => void }) {
  const { authenticated, user, ready, login, logout } = usePrivy();
  const [address, setAddress] = useState<string | null>(null);
  const CROSS_APP_ID = process.env.NEXT_PUBLIC_PRIVY_CROSS_APP_ID || "cmd8euall0037le0my79qpz42";

  // Type guard TANPA 'any'
  const isCrossForMonad = useCallback(
    (a: unknown): a is CrossAppAccountWithMetadata => {
      if (typeof a !== "object" || a === null) return false;

      // cek a.type === "cross_app"
      if (!("type" in a)) return false;
      const t = (a as { type?: unknown }).type;
      if (t !== "cross_app") return false;

      // cek a.providerApp?.id === CROSS_APP_ID
      if (!("providerApp" in a)) return false;
      const prov = (a as { providerApp?: unknown }).providerApp;
      if (typeof prov !== "object" || prov === null) return false;
      if (!("id" in prov)) return false;
      const id = (prov as { id?: unknown }).id;

      return id === CROSS_APP_ID;
    },
    [CROSS_APP_ID]
  );

  const crossAppAccount = useMemo(() => {
    const list = user?.linkedAccounts ?? [];
    const matches = list.filter(isCrossForMonad);
    return matches[0] ?? null;
  }, [user, isCrossForMonad]);

  useEffect(() => {
    if (authenticated && ready && crossAppAccount) {
      const w = crossAppAccount.embeddedWallets?.[0]?.address || null;
      setAddress(w);
      onWallet(w);
    } else {
      setAddress(null);
      onWallet(null);
    }
  }, [authenticated, ready, crossAppAccount, onWallet]);

  if (!ready) return <button className="px-3 py-1 rounded bg-neutral-800">Loading…</button>;

  return authenticated ? (
    <div className="flex items-center gap-2">
      <span className="text-sm opacity-80">Games ID Wallet:</span>
      <code data-wallet-address className="px-2 py-1 bg-neutral-800 rounded">
        {address ?? "—"}
      </code>
      <button className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" onClick={logout}>
        Logout
      </button>
    </div>
  ) : (
    <button
      className="px-4 py-2 rounded bg-yellow-400 text-black hover:bg-yellow-300"
      onClick={login}
    >
      Sign in with Monad Games ID
    </button>
  );
}