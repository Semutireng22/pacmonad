"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Vec = { x: number, y: number };

const W = 28;        // grid width
const H = 20;        // grid height
const TILE = 22;     // px per tile
const SPEED = 1;     // tile per tick (simple)
const PELLET_SCORE = 10;

export default function GameClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [alive, setAlive] = useState(true);
  const [pelletsLeft, setPelletsLeft] = useState(0);

  const worldRef = useRef<number[][]>([]);
  const pacRef = useRef<Vec>({ x: 1, y: 1 });
  const dirRef = useRef<Vec>({ x: 0, y: 0 });
  const ghostRef = useRef<Vec>({ x: W - 2, y: H - 2 });

  // build world: 0 empty, 1 wall (border), 2 pellet
  const buildWorld = useCallback(() => {
    const g: number[][] = [];
    let pelletCount = 0;
    for (let y = 0; y < H; y++) {
      g[y] = [];
      for (let x = 0; x < W; x++) {
        const isBorder = x === 0 || x === W - 1 || y === 0 || y === H - 1;
        g[y][x] = isBorder ? 1 : 2;
        if (!isBorder) pelletCount++;
      }
    }
    // clear spawn pellets
    g[1][1] = 0;
    g[H - 2][W - 2] = 0;
    worldRef.current = g;
    setPelletsLeft(pelletCount - 2);
  }, []);

  const canMove = (p: Vec) =>
    p.x >= 0 && p.x < W && p.y >= 0 && p.y < H && worldRef.current[p.y][p.x] !== 1;

  const step = useCallback(() => {
    if (!alive) return;

    // move pac
    const next = { x: pacRef.current.x + dirRef.current.x, y: pacRef.current.y + dirRef.current.y };
    if (canMove(next)) pacRef.current = next;

    // eat pellet
    if (worldRef.current[pacRef.current.y][pacRef.current.x] === 2) {
      worldRef.current[pacRef.current.y][pacRef.current.x] = 0;
      setScore((s) => s + PELLET_SCORE);
      setPelletsLeft((n) => n - 1);
    }

    // move ghost (random 4-dir until valid)
    const dirs = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 },
    ];
    const tryDir = dirs[Math.floor(Math.random() * dirs.length)];
    const gNext = { x: ghostRef.current.x + tryDir.x, y: ghostRef.current.y + tryDir.y };
    if (canMove(gNext)) ghostRef.current = gNext;

    // collision
    if (ghostRef.current.x === pacRef.current.x && ghostRef.current.y === pacRef.current.y) {
      setAlive(false);
    }
  }, [alive]);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W * TILE, H * TILE);

    // background
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, W * TILE, H * TILE);

    // grid
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = worldRef.current[y][x];
        if (t === 1) {
          ctx.fillStyle = "#1f3b70";
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        } else if (t === 2) {
          ctx.fillStyle = "#ffd83d";
          ctx.beginPath();
          ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // pac
    ctx.fillStyle = "#ffe14a";
    ctx.beginPath();
    ctx.arc(pacRef.current.x * TILE + TILE / 2, pacRef.current.y * TILE + TILE / 2, TILE * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // ghost
    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(ghostRef.current.x * TILE + 4, ghostRef.current.y * TILE + 4, TILE - 8, TILE - 8);

    // UI
    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    ctx.fillText(`Score: ${score}`, 8, 16);
    ctx.fillText(`Pellets: ${pelletsLeft}`, 8, 32);

    if (!alive) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, W * TILE, H * TILE);
      ctx.fillStyle = "#fff";
      ctx.font = "24px monospace";
      ctx.fillText("Game Over", W * TILE / 2 - 70, H * TILE / 2);
      ctx.font = "14px monospace";
      ctx.fillText("Press R to restart", W * TILE / 2 - 70, H * TILE / 2 + 24);
    } else if (pelletsLeft <= 0) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, W * TILE, H * TILE);
      ctx.fillStyle = "#fff";
      ctx.font = "24px monospace";
      ctx.fillText("You Win!", W * TILE / 2 - 55, H * TILE / 2);
      ctx.font = "14px monospace";
      ctx.fillText("Press R to play again", W * TILE / 2 - 80, H * TILE / 2 + 24);
    }
  }, [score, pelletsLeft, alive]);

  // init world
  useEffect(() => { buildWorld(); }, [buildWorld]);

  // loop
  useEffect(() => {
    const interval = setInterval(() => { step(); draw(); }, 60);
    return () => clearInterval(interval);
  }, [step, draw]);

  // controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!alive && e.key.toLowerCase() === "r") {
        // reset
        pacRef.current = { x: 1, y: 1 };
        ghostRef.current = { x: W - 2, y: H - 2 };
        dirRef.current = { x: 0, y: 0 };
        setScore(0);
        setAlive(true);
        buildWorld();
      }
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") dirRef.current = { x: -SPEED, y: 0 };
      else if (k === "arrowright" || k === "d") dirRef.current = { x: SPEED, y: 0 };
      else if (k === "arrowup" || k === "w") dirRef.current = { x: 0, y: -SPEED };
      else if (k === "arrowdown" || k === "s") dirRef.current = { x: 0, y: SPEED };
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alive, buildWorld]);

  const submitScore = useCallback(async () => {
    // Ambil wallet dari bar (komponen LoginGamesID menaruh address di code element)
    const walletEl = document.querySelector('[data-wallet-address]');
    const wallet = walletEl?.textContent?.trim() || "";
    if (!wallet || !wallet.startsWith("0x")) {
      alert("Login with Monad Games ID first");
      return;
    }
    const delta = Math.max(0, score); // kirim delta skor
    if (delta <= 0) { alert("Score is zero"); return; }

    const res = await fetch("/api/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: wallet, scoreDelta: delta, txDelta: 0 })
    }).then(r => r.json());

    if (res.ok) alert(`Submitted! tx: ${res.txHash}`);
    else alert(`Failed: ${res.error}`);
  }, [score]);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="px-2 py-1 rounded bg-neutral-800">Score: <b>{score}</b></div>
        <button
          className="px-3 py-1 rounded bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50"
          onClick={submitScore}
          disabled={!alive && score === 0}
        >
          Submit Score (onchain)
        </button>
      </div>
      <canvas
        width={W * TILE}
        height={H * TILE}
        ref={canvasRef}
        className="rounded-lg border border-neutral-800"
      />
    </section>
  );
}