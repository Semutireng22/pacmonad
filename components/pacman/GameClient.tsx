"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** ===== Types ===== */
type Vec = { x: number; y: number };
type Mode = "scatter" | "chase" | "frightened";
type GhostName = "blinky" | "pinky" | "inky" | "clyde";
type Ghost = {
  name: GhostName;
  pos: Vec;
  dir: Vec;
  color: string;
  mode: Mode;
  frightenedTicks: number;
};

/** ===== Grid & Maze (28 x 31) ===== */
const W = 28;
const H = 31;

/** Char map legend:
 * # = wall, . = pellet, o = power pellet, = = ghost door, ' ' = empty, t = tunnel
 * Map ini meniru pola klasik 28x31 (simetris, koridor tengah, ghost house di tengah),
 * cukup autentik untuk gameplay. Anda bisa ganti sprite/art nanti.
 */
const ASCII = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "######.##### ## #####.######",
  "######.##          ##.######",
  "######.## ###==### ##.######",
  "######.## #      # ##.######",
  "      .   #      #   .      ", // <- tunnel row (spaces)
  "######.## #      # ##.######",
  "######.## ######## ##.######",
  "######.##          ##.######",
  "######.## ######## ##.######",
  "######.## ######## ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#o..##................##..o#",
  "###.##.##.########.##.##.###",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################",
];

/** Build numeric grid from ASCII */
const T_WALL = 1, T_PELLET = 2, T_POWER = 3, T_EMPTY = 0, T_DOOR = 4;

function buildGrid() {
  const g: number[][] = Array.from({ length: H }, () => Array(W).fill(T_WALL));
  for (let y = 0; y < H; y++) {
    const row = ASCII[y];
    for (let x = 0; x < W; x++) {
      const ch = row[x] ?? "#";
      g[y][x] =
        ch === "#" ? T_WALL :
        ch === "." ? T_PELLET :
        ch === "o" ? T_POWER :
        ch === "=" ? T_DOOR :
        T_EMPTY;
    }
  }
  return g;
}

/** ===== Constants (ruleset klasik Level 1) ===== */
const BASE_TPS = 60;
const FRIGHT_SECS = 6; // ~6s di level1
const FRIGHT_TICKS = FRIGHT_SECS * BASE_TPS;
// Scatter/Chase siklus (detik): S7 C20 S7 C20 S5 C20 lalu Chase selamanya
const MODE_SCHEDULE = [7, 20, 7, 20, 5, 20, 5, Infinity] as const;

const START_PAC: Vec = { x: 13, y: 23 }; // dekat bawah tengah
const START_GHOSTS: Record<GhostName, Vec> = {
  blinky: { x: 13, y: 11 }, // di atas pintu rumah
  pinky:  { x: 13, y: 14 }, // di dalam rumah
  inky:   { x: 12, y: 14 },
  clyde:  { x: 14, y: 14 },
};
const GHOST_COLORS: Record<GhostName, string> = {
  blinky: "#ff4d6d", // merah
  pinky:  "#ff8ad6", // pink
  inky:   "#6db6ff", // biru
  clyde:  "#ffb84d", // oranye
};
const CORNERS: Record<GhostName, Vec> = {
  blinky: { x: W-2, y: 1 },
  pinky:  { x: 1,   y: 1 },
  inky:   { x: W-2, y: H-2 },
  clyde:  { x: 1,   y: H-2 },
};

const EXTRA_LIFE_SCORE = 10000;

/** ===== Helpers ===== */
function eq(a: Vec, b: Vec) { return a.x === b.x && a.y === b.y; }
function manhattan(a: Vec, b: Vec) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function add(a: Vec, b: Vec) { return { x: a.x + b.x, y: a.y + b.y }; }
function clampDir(v: Vec) {
  return { x: v.x === 0 ? 0 : v.x > 0 ? 1 : -1, y: v.y === 0 ? 0 : v.y > 0 ? 1 : -1 };
}
const DIRS: Vec[] = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];

/** Responsif: hitung pixel canvas dari lebar kontainer */
function useResponsiveCanvasSize() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [px, setPx] = useState({ w: 28*18, h: 31*18, tile: 18 });

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const cw = e.contentRect.width;
        const tile = Math.floor(Math.max(12, Math.min(cw / W, 28)));
        setPx({ w: tile * W, h: tile * H, tile });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return { containerRef, ...px };
}

/** ===== Component ===== */
export default function GameClient({ wallet, username }: { wallet: string | null; username: string | null }) {
  const { containerRef, w, h, tile } = useResponsiveCanvasSize();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [awardedExtraLife, setAwardedExtraLife] = useState(false);
  const [alive, setAlive] = useState(true);
  const [win, setWin] = useState(false);

  const gridRef = useRef<number[][]>(buildGrid());
  const pelletsLeftRef = useRef<number>(countPellets(gridRef.current));
  const pacRef = useRef<Vec>({...START_PAC});
  const pacDirRef = useRef<Vec>({x:0,y:0});
  const pacNextRef = useRef<Vec>({x:0,y:0});
  const ghostsRef = useRef<Ghost[]>([]);
  const frightenedComboRef = useRef<number>(0); // 200→400→800→1600
  const frightenedTicksRef = useRef<number>(0);
  const modeIndexRef = useRef<number>(0);
  const modeTimerTicksRef = useRef<number>(MODE_SCHEDULE[0]*BASE_TPS);
  const readyTicksRef = useRef<number>(2*BASE_TPS); // awal READY!
  const submittedRef = useRef<boolean>(false);

  function countPellets(g:number[][]) {
    let c=0; for (let y=0;y<H;y++) for (let x=0;x<W;x++) if (g[y][x]===T_PELLET||g[y][x]===T_POWER) c++;
    return c;
  }

  /** Reset full level */
  const resetLevel = useCallback(() => {
    gridRef.current = buildGrid();
    pelletsLeftRef.current = countPellets(gridRef.current);
    pacRef.current = {...START_PAC};
    pacDirRef.current = {x:0,y:0};
    pacNextRef.current = {x:0,y:0};
    ghostsRef.current = [
      { name:"blinky", pos:{...START_GHOSTS.blinky}, dir:{x:0,y:0}, color:GHOST_COLORS.blinky, mode:"scatter", frightenedTicks:0 },
      { name:"pinky",  pos:{...START_GHOSTS.pinky }, dir:{x:0,y:0}, color:GHOST_COLORS.pinky,  mode:"scatter", frightenedTicks:0 },
      { name:"inky",   pos:{...START_GHOSTS.inky  }, dir:{x:0,y:0}, color:GHOST_COLORS.inky,   mode:"scatter", frightenedTicks:0 },
      { name:"clyde",  pos:{...START_GHOSTS.clyde }, dir:{x:0,y:0}, color:GHOST_COLORS.clyde,  mode:"scatter", frightenedTicks:0 },
    ];
    frightenedComboRef.current = 0;
    frightenedTicksRef.current = 0;
    modeIndexRef.current = 0;
    modeTimerTicksRef.current = MODE_SCHEDULE[0]*BASE_TPS;
    readyTicksRef.current = 2*BASE_TPS;
    submittedRef.current = false;
    setAlive(true);
    setWin(false);
  }, []);

  /** Lose a life and respawn (tanpa reset skor/pellet) */
  const respawn = useCallback(() => {
    pacRef.current = {...START_PAC};
    pacDirRef.current = {x:0,y:0};
    pacNextRef.current = {x:0,y:0};
    ghostsRef.current = [
      { name:"blinky", pos:{...START_GHOSTS.blinky}, dir:{x:0,y:0}, color:GHOST_COLORS.blinky, mode: currentMode(), frightenedTicks:0 },
      { name:"pinky",  pos:{...START_GHOSTS.pinky }, dir:{x:0,y:0}, color:GHOST_COLORS.pinky,  mode: currentMode(), frightenedTicks:0 },
      { name:"inky",   pos:{...START_GHOSTS.inky  }, dir:{x:0,y:0}, color:GHOST_COLORS.inky,   mode: currentMode(), frightenedTicks:0 },
      { name:"clyde",  pos:{...START_GHOSTS.clyde }, dir:{x:0,y:0}, color:GHOST_COLORS.clyde,  mode: currentMode(), frightenedTicks:0 },
    ];
    frightenedComboRef.current = 0;
    frightenedTicksRef.current = 0;
    readyTicksRef.current = 2*BASE_TPS;
    setAlive(true);
  }, []);

  useEffect(() => { resetLevel(); }, [resetLevel]);

  /** Helpers: tile checks */
  const passableForPac = useCallback((p:Vec) => {
    if (p.y === 14 && (p.x < 0 || p.x >= W)) return true; // tunnel wrap allowed
    if (p.x < 0 || p.x >= W || p.y < 0 || p.y >= H) return false;
    const t = gridRef.current[p.y][p.x];
    return t !== T_WALL && t !== T_DOOR; // pac tidak lewat door
  }, []);
  const passableForGhost = useCallback((p:Vec) => {
    if (p.y === 14 && (p.x < 0 || p.x >= W)) return true;
    if (p.x < 0 || p.x >= W || p.y < 0 || p.y >= H) return false;
    const t = gridRef.current[p.y][p.x];
    return t !== T_WALL; // ghost boleh melewati door
  }, []);

  /** Warp tunnel di row 14 (baris dengan spasi di ASCII) */
  function warpIfNeeded(p:Vec): Vec {
    if (p.y === 14 && p.x < 0) return { x: W-1, y: 14 };
    if (p.y === 14 && p.x >= W) return { x: 0, y: 14 };
    return p;
  }

  /** Mode global (scatter/chase), frightened override per ghost */
  function currentMode(): Mode {
    return "scatter"; // default; akan diganti oleh scheduler pada tick
  }

  /** Ghost target selection (aturan klasik) */
  function ghostTarget(g:Ghost, pac:Vec, pacDir:Vec, blinkyPos:Vec): Vec {
    if (g.mode === "scatter") return CORNERS[g.name];
    if (g.mode === "frightened") return pac; // kita gerakkan menjauh via heuristik

    // CHASE rules:
    if (g.name === "blinky") return pac;
    if (g.name === "pinky")  return { x: pac.x + 4*pacDir.x, y: pac.y + 4*pacDir.y };
    if (g.name === "inky")   {
      const twoAhead = { x: pac.x + 2*pacDir.x, y: pac.y + 2*pacDir.y };
      return {
        x: twoAhead.x + (twoAhead.x - blinkyPos.x),
        y: twoAhead.y + (twoAhead.y - blinkyPos.y),
      };
    }
    // clyde: jika jarak >= 8 tile, ke pac, else corner
    const d = manhattan(g.pos, pac);
    return d >= 8 ? pac : CORNERS.clyde;
  }

  /** Pilih langkah ghost (prioritas jarak target; hindari balik arah tajam bila ada pilihan) */
  function chooseGhostStep(g:Ghost, tgt:Vec): Vec {
    const options = DIRS
      .map(d => ({ d, n: warpIfNeeded(add(g.pos, d)) }))
      .filter(({n}) => passableForGhost(n));
    if (options.length === 0) return g.pos;

    // sort by distance (frightened → menjauh)
    options.sort((A,B) => {
      const a = manhattan(A.n, tgt), b = manhattan(B.n, tgt);
      return g.mode === "frightened" ? b - a : a - b;
    });

    // hindari reversal total jika ada alternatif
    for (const opt of options) {
      if (g.dir && opt.d.x === -g.dir.x && opt.d.y === -g.dir.y && options.length > 1) continue;
      return opt.n;
    }
    return options[0].n;
  }

  /** Keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const set = (dx:number,dy:number) => { pacNextRef.current = { x:dx, y:dy }; };
      if (k==="arrowleft"||k==="a") set(-1,0);
      else if (k==="arrowright"||k==="d") set(1,0);
      else if (k==="arrowup"||k==="w") set(0,-1);
      else if (k==="arrowdown"||k==="s") set(0,1);
      else if (k==="r" && (!alive || win)) { // restart
        setLives(3); setAwardedExtraLife(false); setScore(0); resetLevel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alive, win, resetLevel]);

  /** Touch (swipe) */
  useEffect(() => {
    let sx=0, sy=0, active=false;
    const thresh = 24;
    const onStart = (e:TouchEvent) => { active=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; };
    const onMove = (e:TouchEvent) => {
      if (!active) return;
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;
      if (Math.abs(dx)<thresh && Math.abs(dy)<thresh) return;
      if (Math.abs(dx)>Math.abs(dy)) pacNextRef.current = { x: dx>0?1:-1, y:0 };
      else pacNextRef.current = { x:0, y: dy>0?1:-1 };
      active=false;
    };
    const onEnd = () => { active=false; };
    const el = canvasRef.current;
    el?.addEventListener("touchstart", onStart, { passive:true });
    el?.addEventListener("touchmove", onMove, { passive:true });
    el?.addEventListener("touchend", onEnd, { passive:true });
    return () => {
      el?.removeEventListener("touchstart", onStart);
      el?.removeEventListener("touchmove", onMove);
      el?.removeEventListener("touchend", onEnd);
    };
  }, []);

  /** Mode scheduler (scatter ↔ chase) + frightened timer */
  function advanceModeTimers() {
    if (frightenedTicksRef.current > 0) {
      frightenedTicksRef.current--;
      if (frightenedTicksRef.current === 0) {
        frightenedComboRef.current = 0; // reset combo saat selesai frightened
        // kembali ke mode jadwal
        ghostsRef.current = ghostsRef.current.map(g => ({ ...g, mode: scheduleMode() }));
      }
      return;
    }
    if (readyTicksRef.current > 0) return;
    if (!Number.isFinite(MODE_SCHEDULE[modeIndexRef.current])) {
      // chase selamanya
      ghostsRef.current = ghostsRef.current.map(g => ({ ...g, mode: "chase" }));
      return;
    }
    modeTimerTicksRef.current--;
    if (modeTimerTicksRef.current <= 0) {
      modeIndexRef.current++;
      const m = scheduleMode();
      ghostsRef.current = ghostsRef.current.map(g => ({ ...g, mode: m, dir: { ...g.dir, x:-g.dir.x, y:-g.dir.y } })); // reversal
      const secs = MODE_SCHEDULE[modeIndexRef.current] ?? Infinity;
      modeTimerTicksRef.current = Number.isFinite(secs) ? secs*BASE_TPS : Number.POSITIVE_INFINITY;
    }
  }
  function scheduleMode(): Mode {
    if (frightenedTicksRef.current > 0) return "frightened";
    if (modeIndexRef.current % 2 === 0) return "scatter";
    return "chase";
  }

  /** Tick */
  const step = useCallback(() => {
    if (!alive || win) return;

    // READY period (ghost diam, no collision)
    if (readyTicksRef.current > 0) {
      readyTicksRef.current--;
    }

    // apply next dir saat memungkinkan (grid-locked belok di tile)
    const want = add(pacRef.current, pacNextRef.current);
    if (passableForPac(warpIfNeeded(want))) pacDirRef.current = pacNextRef.current;

    // move pac
    let next = add(pacRef.current, pacDirRef.current);
    next = warpIfNeeded(next);
    if (passableForPac(next)) pacRef.current = next;

    // makan pellet/power
    const t = tileAt(pacRef.current);
    if (t === T_PELLET) {
      setScore(s => s + 10);
      pelletsLeftRef.current--;
      setWin(pelletsLeftRef.current <= 0);
      setTile(pacRef.current, T_EMPTY);
    } else if (t === T_POWER) {
      setScore(s => s + 50);
      pelletsLeftRef.current--;
      setWin(pelletsLeftRef.current <= 0);
      setTile(pacRef.current, T_EMPTY);
      frightenedTicksRef.current = FRIGHT_TICKS;
      frightenedComboRef.current = 0;
      ghostsRef.current = ghostsRef.current.map(g => ({ ...g, mode: "frightened" }));
    }

    // extra life at 10k
    setScore(s => {
      if (!awardedExtraLife && s >= EXTRA_LIFE_SCORE) { setLives(v => v+1); setAwardedExtraLife(true); }
      return s;
    });

    // Mode timing
    advanceModeTimers();

    // move ghosts (diam saat READY)
    if (readyTicksRef.current === 0) {
      const blinky = ghostsRef.current.find(g => g.name==="blinky")!;
      ghostsRef.current = ghostsRef.current.map(g => {
        const tgt = ghostTarget(g, pacRef.current, pacDirRef.current, blinky.pos);
        const n = chooseGhostStep(g, tgt);
        const nd = clampDir({ x: n.x - g.pos.x, y: n.y - g.pos.y });
        return { ...g, pos: n, dir: nd };
      });
    }

    // collision (kecuali saat READY)
    if (readyTicksRef.current === 0) {
      ghostsRef.current.forEach(g => {
        if (eq(g.pos, pacRef.current)) {
          if (g.mode === "frightened") {
            // makan ghost (combo 200, 400, 800, 1600)
            const pts = 200 << Math.min(frightenedComboRef.current, 3);
            frightenedComboRef.current++;
            setScore(s => s + pts);
            // kirim balik ke ghost house
            g.pos = { ...START_GHOSTS[g.name] };
            g.mode = scheduleMode();
            g.frightenedTicks = 0;
          } else {
            // mati satu nyawa
            setLives(v => {
              const left = v - 1;
              if (left <= 0) {
                setAlive(false);
              } else {
                // respawn
                setTimeout(() => respawn(), 50);
              }
              return left;
            });
          }
        }
      });
    }

    // auto submit saat game selesai
    if ((win || !alive) && !submittedRef.current) {
      submittedRef.current = true;
      if (wallet && score > 0) {
        fetch("/api/submit-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player: wallet, scoreDelta: score, txDelta: 0 }),
        }).catch(() => void 0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alive, win, awardedExtraLife, wallet, score]); // (pakai refs untuk state lain)

  function tileAt(p:Vec) {
    if (p.x<0||p.x>=W||p.y<0||p.y>=H) return T_WALL;
    return gridRef.current[p.y][p.x];
  }
  function setTile(p:Vec, v:number) {
    if (p.x<0||p.x>=W||p.y<0||p.y>=H) return;
    gridRef.current[p.y][p.x] = v;
  }

  /** Draw */
  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0,0,w,h);

    // bg
    ctx.fillStyle = "#03040a";
    ctx.fillRect(0,0,w,h);

    // grid
    for (let y=0;y<H;y++) {
      for (let x=0;x<W;x++) {
        const t = gridRef.current[y][x];
        if (t===T_WALL || t===T_DOOR) {
          ctx.fillStyle = t===T_WALL? "#1f3b70" : "#7aa2ff";
          ctx.fillRect(x*tile, y*tile, tile, tile);
        } else if (t===T_PELLET) {
          ctx.fillStyle = "#ffd83d";
          ctx.beginPath();
          ctx.arc(x*tile+tile/2, y*tile+tile/2, Math.max(2, tile*0.12), 0, Math.PI*2);
          ctx.fill();
        } else if (t===T_POWER) {
          ctx.fillStyle = "#ffd83d";
          ctx.beginPath();
          ctx.arc(x*tile+tile/2, y*tile+tile/2, Math.max(3, tile*0.22), 0, Math.PI*2);
          ctx.fill();
        }
      }
    }

    // pac-man (lingkaran sederhana; bisa diganti sprite animasi)
    ctx.fillStyle = "#ffe14a";
    ctx.beginPath();
    ctx.arc(pacRef.current.x*tile+tile/2, pacRef.current.y*tile+tile/2, tile*0.45, 0, Math.PI*2);
    ctx.fill();

    // ghosts
    for (const g of ghostsRef.current) {
      const c = g.mode==="frightened" ? "#6db6ff" : g.color;
      ctx.fillStyle = c;
      const x = g.pos.x*tile, y=g.pos.y*tile;
      ctx.fillRect(x+3, y+3, tile-6, tile-6);
    }

    // HUD
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(12, Math.floor(tile*0.6))}px monospace`;
    ctx.fillText(`Score: ${score}`, 8, Math.max(16, Math.floor(tile*0.7)+4));
    const livesTxt = `Lives: ${lives}`;
    const twL = ctx.measureText(livesTxt).width;
    ctx.fillText(livesTxt, w - twL - 8, Math.max(16, Math.floor(tile*0.7)+4));
    if (username) {
      const tag = `@${username}`;
      ctx.fillText(tag, 8, Math.max(16, Math.floor(tile*0.7)+4) + Math.max(14, Math.floor(tile*0.6)));
    }

    // overlays
    if (readyTicksRef.current > 0) {
      ctx.fillStyle="rgba(0,0,0,0.35)";
      ctx.fillRect(0,0,w,h);
      ctx.fillStyle="#fff";
      ctx.font = `${Math.max(18, Math.floor(tile*0.9))}px monospace`;
      const msg = "READY!";
      const tw = ctx.measureText(msg).width;
      ctx.fillText(msg, (w-tw)/2, h/2);
    }

    if (win || !alive) {
      ctx.fillStyle="rgba(0,0,0,0.6)";
      ctx.fillRect(0,0,w,h);
      ctx.fillStyle="#fff";
      ctx.font = `${Math.max(18, Math.floor(tile*0.9))}px monospace`;
      const msg = win ? "YOU WIN!" : "GAME OVER";
      const tw = ctx.measureText(msg).width;
      ctx.fillText(msg, (w-tw)/2, h/2);
      ctx.font = `${Math.max(12, Math.floor(tile*0.6))}px monospace`;
      const sub = "Press R or tap Restart";
      const tw2 = ctx.measureText(sub).width;
      ctx.fillText(sub, (w-tw2)/2, h/2 + Math.max(18, Math.floor(tile*0.9)));
    }
  }, [w,h,tile,score,lives,username,win,alive]);

  /** Loop */
  useEffect(() => {
    const ms = Math.floor(1000/BASE_TPS);
    const id = setInterval(() => { step(); draw(); }, ms);
    return () => clearInterval(id);
  }, [step, draw]);

  /** Restart button (mobile & desktop setelah end) */
  const restart = () => { setLives(3); setAwardedExtraLife(false); setScore(0); resetLevel(); };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="px-2 py-1 rounded bg-neutral-800 text-sm">Score: <b>{score}</b></div>
        <div className="px-2 py-1 rounded bg-neutral-800 text-sm">Lives: <b>{lives}</b></div>
        {(!alive || win) && (
          <button className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" onClick={restart}>
            Restart
          </button>
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