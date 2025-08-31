"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy, CrossAppAccountWithMetadata } from "@privy-io/react-auth";

export default function LoginGamesID({ onWallet }: { onWallet: (addr: string | null) => void }) {
  const { authenticated, user, ready, login, logout } = usePrivy();
  const [address, setAddress] = useState<string | null>(null);
  const CROSS_APP_ID = process.env.NEXT_PUBLIC_PRIVY_CROSS_APP_ID || "cmd8euall0037le0my79qpz42";

  const crossAppAccount = useMemo(() => {
    if (!user) return null;
    const list = (user.linkedAccounts || []) as any[];
    const matches = list.filter(
      (a) => a.type === "cross_app" && (a as CrossAppAccountWithMetadata).providerApp?.id === CROSS_APP_ID
    ) as CrossAppAccountWithMetadata[];
    return matches[0] || null;
  }, [user, CROSS_APP_ID]);

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