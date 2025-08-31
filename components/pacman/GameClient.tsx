"use client";

import { useCallback, useEffect, useRef, useState } from "react";  // ← HAPUS useMemo dari sini

/** ====== Konfigurasi dasar ====== */
type Vec = { x: number; y: number };
type Ghost = { pos: Vec; color: string; mode: "chase" | "frightened"; frightenedTicks: number };

const GRID_W = 28;
const GRID_H = 31;
// 0 empty, 1 wall, 2 pellet, 3 power pellet
// Map sederhana gaya klasik (border + beberapa dinding)
// (disederhanakan agar cepat & stabil — bisa kamu ganti ke layout klasik penuh nanti)
const MAP: number[][] = (() => {
  const g:number[][] = Array.from({length: GRID_H}, () => Array(GRID_W).fill(2));
  for (let y=0; y<GRID_H; y++) for (let x=0;x<GRID_W;x++){
    const border = x===0||y===0||x===GRID_W-1||y===GRID_H-1;
    if (border) g[y][x] = 1;
  }
  // koridor dan dinding sederhana
  const walls = [
    // kotak tengah
    [12,12],[13,12],[14,12],[15,12],
    [12,13],[15,13],
    [12,14],[15,14],
    [12,15],[13,15],[14,15],[15,15],
    // beberapa vertikal/horizontal acak
    [4,5],[4,6],[4,7],[4,8],[4,9],[4,10],
    [23,5],[23,6],[23,7],[23,8],[23,9],[23,10],
    [6,20],[7,20],[8,20],[9,20],[10,20],[11,20],[12,20],[13,20],[14,20],[15,20],[16,20],[17,20],[18,20],[19,20],[20,20],[21,20],
  ];
  for (const [x,y] of walls) g[y][x]=1;

  // power pellets
  g[1][1] = 3;
  g[1][GRID_W-2] = 3;
  g[GRID_H-2][1] = 3;
  g[GRID_H-2][GRID_W-2] = 3;

  // ruang spawn kosong
  g[1][1] = 0; // akan jadi power pellet di bawah
  g[1][1] = 3;
  g[GRID_H-2][GRID_W-2] = 3;
  g[GRID_H-2][GRID_W-2] = 3;
  g[1][GRID_W-2] = 3;
  g[GRID_H-2][1] = 3;

  // kosongkan start pacman & ghost
  g[GRID_H-2][1] = 0;             // pac start
  g[GRID_H-2][GRID_W-2] = 0;      // ghost
  g[1][GRID_W-2] = 0;             // ghost
  g[1][1] = 0;                    // ghost

  return g;
})();

const BASE_TPS = 60; // tick per second
const FRIGHTENED_TICKS = 8 * (1000/ (1000/BASE_TPS)); // ~8s di 60fps

/** Hitung ukuran canvas responsif */
function useResponsiveCanvasSize() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [px, setPx] = useState({ w: 560, h: 620, tile: 20 });

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const cw = e.contentRect.width;
        // target aspect ~ GRID_W : GRID_H
        const tile = Math.floor(Math.max(12, Math.min(cw / GRID_W, 28))); // skala fleksibel
        setPx({ w: tile * GRID_W, h: tile * GRID_H, tile });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return { containerRef, ...px };
}

/** ====== Game Component ====== */
export default function GameClient({ wallet, username }: { wallet: string | null; username: string | null }) {
  const { containerRef, w, h, tile } = useResponsiveCanvasSize();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [alive, setAlive] = useState(true);
  const [win, setWin] = useState(false);

  const worldRef = useRef<number[][]>([]);
  const pelletsRef = useRef(0);
  const pacRef = useRef<Vec>({ x: 1, y: GRID_H - 2 });
  const dirRef = useRef<Vec>({ x: 0, y: 0 });
  const nextDirRef = useRef<Vec>({ x: 0, y: 0 }); // buffering arah
  const ghostsRef = useRef<Ghost[]>([]);

  const reset = useCallback(() => {
    worldRef.current = MAP.map(r => r.slice());
    pelletsRef.current = worldRef.current.flat().filter(v => v === 2 || v === 3).length;
    pacRef.current = { x: 1, y: GRID_H - 2 };
    dirRef.current = { x: 0, y: 0 };
    nextDirRef.current = { x: 0, y: 0 };
    ghostsRef.current = [
      { pos: { x: GRID_W - 2, y: GRID_H - 2 }, color: "#ff4d6d", mode: "chase", frightenedTicks: 0 },
      { pos: { x: GRID_W - 2, y: 1 },         color: "#4dd2ff", mode: "chase", frightenedTicks: 0 },
      { pos: { x: 1, y: 1 },                   color: "#ffb84d", mode: "chase", frightenedTicks: 0 },
      { pos: { x: Math.floor(GRID_W/2), y: 12 }, color: "#77ff6d", mode: "chase", frightenedTicks: 0 },
    ];
    setScore(0);
    setAlive(true);
    setWin(false);
  }, []);
  useEffect(() => { reset(); }, [reset]);

  const canMove = useCallback((p: Vec) =>
    p.x >= 0 && p.x < GRID_W && p.y >= 0 && p.y < GRID_H && worldRef.current[p.y][p.x] !== 1, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const apply = (dx:number, dy:number) => { nextDirRef.current = { x: dx, y: dy }; };
      if (k === "arrowleft" || k === "a") apply(-1, 0);
      else if (k === "arrowright" || k === "d") apply(1, 0);
      else if (k === "arrowup" || k === "w") apply(0, -1);
      else if (k === "arrowdown" || k === "s") apply(0, 1);
      else if (!alive && k === "r") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alive, reset]);

  // Touch/Swipe controls
  useEffect(() => {
    let startX = 0, startY = 0, active = false;
    const thresh = 24; // px minimal
    const onStart = (e: TouchEvent) => {
      if (!canvasRef.current) return;
      active = true;
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < thresh && Math.abs(dy) < thresh) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        nextDirRef.current = { x: dx > 0 ? 1 : -1, y: 0 };
      } else {
        nextDirRef.current = { x: 0, y: dy > 0 ? 1 : -1 };
      }
      active = false;
    };
    const onEnd = () => { active = false; };

    const el = canvasRef.current;
    el?.addEventListener("touchstart", onStart, { passive: true });
    el?.addEventListener("touchmove", onMove, { passive: true });
    el?.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el?.removeEventListener("touchstart", onStart);
      el?.removeEventListener("touchmove", onMove);
      el?.removeEventListener("touchend", onEnd);
    };
  }, []);

  // Ghost pathing sederhana: pilih langkah yang mendekati Pac-Man (Manhattan), hindari wall
  const ghostNextStep = useCallback((g: Ghost): Vec => {
    const candidates: Vec[] = [
      { x: g.pos.x + 1, y: g.pos.y },
      { x: g.pos.x - 1, y: g.pos.y },
      { x: g.pos.x, y: g.pos.y + 1 },
      { x: g.pos.x, y: g.pos.y - 1 },
    ].filter(canMove);

    if (g.mode === "frightened") {
      // menjauh dari Pac-Man (kebalikan)
      candidates.sort((a,b) => {
        const da = Math.abs(a.x - pacRef.current.x) + Math.abs(a.y - pacRef.current.y);
        const db = Math.abs(b.x - pacRef.current.x) + Math.abs(b.y - pacRef.current.y);
        return db - da;
      });
    } else {
      // mendekati Pac-Man
      candidates.sort((a,b) => {
        const da = Math.abs(a.x - pacRef.current.x) + Math.abs(a.y - pacRef.current.y);
        const db = Math.abs(b.x - pacRef.current.x) + Math.abs(b.y - pacRef.current.y);
        return da - db;
      });
    }
    return candidates[0] ?? g.pos;
  }, [canMove]);

  // Tick
  const step = useCallback(() => {
    if (!alive || win) return;

    // apply buffered direction jika memungkinkan
    const want = { x: pacRef.current.x + nextDirRef.current.x, y: pacRef.current.y + nextDirRef.current.y };
    if (canMove(want)) {
      dirRef.current = nextDirRef.current;
    }
    const next = { x: pacRef.current.x + dirRef.current.x, y: pacRef.current.y + dirRef.current.y };
    if (canMove(next)) pacRef.current = next;

    // makan pellet
    const t = worldRef.current[pacRef.current.y][pacRef.current.x];
    if (t === 2) {
      worldRef.current[pacRef.current.y][pacRef.current.x] = 0;
      pelletsRef.current--;
      setScore(s => s + 10);
    } else if (t === 3) {
      worldRef.current[pacRef.current.y][pacRef.current.x] = 0;
      pelletsRef.current--;
      setScore(s => s + 50);
      // semua ghost frightened
      ghostsRef.current = ghostsRef.current.map(g => ({ ...g, mode: "frightened", frightenedTicks: FRIGHTENED_TICKS }));
    }

    // gerak ghost
    ghostsRef.current = ghostsRef.current.map(g => {
      let mode: Ghost["mode"] = g.mode;
      let frightenedTicks = g.frightenedTicks;
      if (g.mode === "frightened") {
        frightenedTicks = Math.max(0, frightenedTicks - 1);
        if (frightenedTicks === 0) mode = "chase";
      }
      const n = ghostNextStep({ ...g, frightenedTicks, mode });
      return { ...g, pos: n, frightenedTicks, mode };
    });

    // collision
    for (const g of ghostsRef.current) {
      if (g.pos.x === pacRef.current.x && g.pos.y === pacRef.current.y) {
        if (g.mode === "frightened") {
          // “makan” ghost
          setScore(s => s + 200);
          // kirim ghost ke pojok
          g.pos = { x: GRID_W - 2, y: 1 };
          g.mode = "chase";
          g.frightenedTicks = 0;
        } else {
          setAlive(false);
        }
      }
    }

    if (pelletsRef.current <= 0) setWin(true);
  }, [alive, win, canMove, ghostNextStep]);

  // Draw
  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // background
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);

    // grid
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const t = worldRef.current[y][x];
        if (t === 1) {
          ctx.fillStyle = "#1f3b70";
          ctx.fillRect(x * tile, y * tile, tile, tile);
        } else if (t === 2) {
          ctx.fillStyle = "#ffd83d";
          ctx.beginPath();
          ctx.arc(x * tile + tile/2, y * tile + tile/2, Math.max(2, tile*0.12), 0, Math.PI*2);
          ctx.fill();
        } else if (t === 3) {
          ctx.fillStyle = "#ffd83d";
          ctx.beginPath();
          ctx.arc(x * tile + tile/2, y * tile + tile/2, Math.max(3, tile*0.22), 0, Math.PI*2);
          ctx.fill();
        }
      }
    }

    // pacman
    ctx.fillStyle = "#ffe14a";
    ctx.beginPath();
    ctx.arc(pacRef.current.x * tile + tile/2, pacRef.current.y * tile + tile/2, tile*0.45, 0, Math.PI*2);
    ctx.fill();

    // ghosts
    for (const g of ghostsRef.current) {
      ctx.fillStyle = g.mode === "frightened" ? "#6db6ff" : g.color;
      const x = g.pos.x * tile, y = g.pos.y * tile;
      ctx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
    }

    // UI
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(12, Math.floor(tile*0.6))}px monospace`;
    ctx.fillText(`Score: ${score}`, 8, Math.max(16, Math.floor(tile*0.7)+4));
    if (username) {
      const label = `@${username}`;
      const tw = ctx.measureText(label).width;
      ctx.fillText(label, w - tw - 8, Math.max(16, Math.floor(tile*0.7)+4));
    }

    if (!alive || win) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.max(18, Math.floor(tile*0.9))}px monospace`;
      const msg = win ? "YOU WIN!" : "GAME OVER";
      const tw = ctx.measureText(msg).width;
      ctx.fillText(msg, (w - tw) / 2, h / 2);
      ctx.font = `${Math.max(12, Math.floor(tile*0.6))}px monospace`;
      const sub = "Press R to restart";
      const tw2 = ctx.measureText(sub).width;
      ctx.fillText(sub, (w - tw2) / 2, h / 2 + Math.max(18, Math.floor(tile*0.9)));
    }
  }, [w, h, tile, score, username, alive, win]);

  // Loop
  useEffect(() => {
    const tickMs = Math.floor(1000 / BASE_TPS);
    const id = setInterval(() => { step(); draw(); }, tickMs);
    return () => clearInterval(id);
  }, [step, draw]);

  // Initial world clone
  useEffect(() => { worldRef.current = MAP.map(r=>r.slice()); }, []);

  const submitScore = useCallback(async () => {
    if (!wallet) {
      alert("Login with Monad Games ID first");
      return;
    }
    if (score <= 0) {
      alert("Score is zero");
      return;
    }
    const res = await fetch("/api/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: wallet, scoreDelta: score, txDelta: 0 })
    }).then(r => r.json());

    if (res.ok) alert(`Submitted! tx: ${res.txHash}`);
    else alert(`Failed: ${res.error}`);
  }, [wallet, score]);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="px-2 py-1 rounded bg-neutral-800 text-sm">
          Score: <b>{score}</b>
        </div>
        <button
          className="px-3 py-1 rounded bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50"
          onClick={submitScore}
          disabled={!wallet || score <= 0}
          aria-disabled={!wallet || score <= 0}
        >
          Submit Score (onchain)
        </button>
        {!wallet && (
          <span className="text-xs opacity-70">Login with Monad Games ID to submit</span>
        )}
      </div>

      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          width={w}
          height={h}
          className="w-full h-auto rounded-lg border border-neutral-800 touch-pan-y select-none"
          aria-label="Pac-Mon canvas"
        />
      </div>
    </section>
  );
}