"use client";

import { useState } from "react";
import GamesIdBar from "./GamesIdBar";
import GameClient from "./pacman/GameClient";

export default function AppShell() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row gap-3 sm:gap-6 sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pac-Mon — Monad Games ID</h1>
        <GamesIdBar onWallet={setWallet} onUsername={setUsername} />
      </header>

      <GameClient wallet={wallet} username={username} />

      <footer className="pt-4 text-xs sm:text-sm opacity-70">
        <p>Controls: Arrow/WASD • Mobile: swipe • R: restart</p>
      </footer>
    </main>
  );
}