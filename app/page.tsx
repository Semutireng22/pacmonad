import GamesIdBar from "@/components/GamesIdBar";
import GameClient from "@/components/pacman/GameClient";

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pac-Mon — Monad Games ID</h1>
        <GamesIdBar />
      </header>
      <GameClient />
      <footer className="pt-6 text-sm opacity-70">
        <p>Tip: Makan pellet untuk skor. Hindari ghost. Tekan R untuk restart.</p>
      </footer>
    </main>
  );
}