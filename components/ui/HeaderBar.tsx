"use client";

import Button from "./Button";

export default function HeaderBar({
  authenticated,
  username,
  onLogin,
  onLogout,
}: {
  authenticated: boolean;
  username: string | null;
  onLogin: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto max-w-[1100px] px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-yellow-400" />
          <div className="text-sm font-semibold tracking-wide">
            Pacmonad <span className="text-neutral-500">• Monad Testnet</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {username ? (
            <div className="hidden sm:block text-sm text-neutral-300">@{username}</div>
          ) : null}
          {authenticated ? (
            <Button variant="secondary" onClick={onLogout}>Logout</Button>
          ) : (
            <Button variant="secondary" onClick={onLogin}>Sign in with Monad Games ID</Button>
          )}
        </div>
      </div>
    </header>
  );
}
