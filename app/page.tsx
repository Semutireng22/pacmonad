"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ClassicPacman from "@/components/pacman/ClassicPacman";

export default function HomePage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  const playedSinceRef = useRef<number | null>(null);

  // --- Cek username dari API monad-games-id-site ---
  const checkUsername = useCallback(async (addr: string) => {
    try {
      setLoadingUser(true);
      const res = await fetch(
        `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${addr}`
      );
      if (!res.ok) throw new Error("Failed to check username");
      const data = await res.json();
      if (data.hasUsername) {
        setUsername(data.user.username);
      } else {
        setUsername(null);
      }
    } catch (err) {
      console.error(err);
      setUsername(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  // --- Simulasi get wallet address (ganti sesuai integrasi real Privy/MetaMask/PrivyAuth dsb) ---
  useEffect(() => {
    const demoWallet = "0xC665F5bBb5435Bd4d3d60419fA260355cE47256B";
    setWallet(demoWallet);
    checkUsername(demoWallet);
  }, [checkUsername]);

  // --- Submit score delta ke API backend ---
  const handleSubmitScore = useCallback(
    async (deltaScore: number) => {
      if (!wallet || deltaScore <= 0) return;

      const playedMs =
        playedSinceRef.current != null
          ? Date.now() - playedSinceRef.current
          : 0;

      try {
        const res = await fetch("/api/submit-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            deltaScore,
            deltaTx: 0,
            level: 1,
            playedMs,
          }),
        });
        const json = await res.json();
        console.log("Score submit result:", json);
      } catch (err) {
        console.error("Submit score error:", err);
      }
    },
    [wallet]
  );

  // --- Handler game events dari ClassicPacman ---
  const handleGameStart = useCallback(() => {
    setGameStarted(true);
    setPaused(false);
    setGameOver(false);
    playedSinceRef.current = Date.now();
  }, []);

  const handleGamePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const handleGameOver = useCallback(
    (finalScore: number) => {
      setGameOver(true);
      setGameStarted(false);
      setLastScore(finalScore);
      playedSinceRef.current = null;
      // submit delta akhir
      handleSubmitScore(finalScore);
    },
    [handleSubmitScore]
  );

  const handlePlayAgain = useCallback(() => {
    setGameStarted(true);
    setPaused(false);
    setGameOver(false);
    setLastScore(0);
    playedSinceRef.current = Date.now();
  }, []);

  // --- Keyboard shortcut (space start) untuk desktop ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !gameStarted && !gameOver) {
        handleGameStart();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameStarted, gameOver, handleGameStart]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black text-yellow-400 p-4">
      <h1 className="text-3xl font-bold mb-2">Monad Pacman</h1>

      {loadingUser ? (
        <p className="text-gray-300 mb-2">Checking username...</p>
      ) : username ? (
        <p className="mb-4">Welcome, {username}!</p>
      ) : (
        <button className="mb-4 px-4 py-2 bg-blue-600 rounded">
          Reserve your Monad Games ID
        </button>
      )}

      {!gameStarted && !gameOver && (
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleGameStart}
            className="px-4 py-2 bg-green-600 rounded"
          >
            ▶ Start
          </button>
        </div>
      )}

      {gameStarted && (
        <>
          <ClassicPacman
            paused={paused}
            onGameOver={handleGameOver}
            onScore={(delta) => handleSubmitScore(delta)}
          />
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleGamePause}
              className="px-4 py-2 bg-yellow-600 rounded"
            >
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
        </>
      )}

      {gameOver && (
        <div className="mt-6 text-center">
          <h2 className="text-2xl mb-2">Game Over</h2>
          <p className="mb-4">Your Score: {lastScore}</p>
          <button
            onClick={handlePlayAgain}
            className="px-4 py-2 bg-green-600 rounded"
          >
            🔄 Play Again
          </button>
        </div>
      )}
    </main>
  );
}
