"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** ==== Constants & Types ==== */
const NONE = 4,
  UP = 3,
  LEFT = 2,
  DOWN = 1,
  RIGHT = 11,
  WAITING = 5,
  PAUSE = 6,
  PLAYING = 7,
  COUNTDOWN = 8,
  EATEN_PAUSE = 9,
  DYING = 10;

type Vec = { x: number; y: number };

type AudioFileMap = {
  [name: string]: HTMLAudioElement;
};

const KEY = {
  ARROW_LEFT: 37,
  ARROW_UP: 38,
  ARROW_RIGHT: 39,
  ARROW_DOWN: 40,
  N: 78,
  P: 80,
  S: 83,
} as const;

const FPS = 30;

/** ==== MAP data ==== */
const WALL = 0;
const BISCUIT = 1;
const EMPTY = 2;
const BLOCK = 3;
const PILL = 4;

const MAP_DATA: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
  [0,4,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,4,0],
  [0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
  [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
  [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0],
  [2,2,2,0,1,0,1,1,1,1,1,1,1,0,1,0,2,2,2],
  [0,0,0,0,1,0,1,0,0,3,0,0,1,0,1,0,0,0,0],
  [2,2,2,2,1,1,1,0,3,3,3,0,1,1,1,2,2,2,2],
  [0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
  [2,2,2,0,1,0,1,1,1,2,1,1,1,0,1,0,2,2,2],
  [0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0],
  [0,4,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,4,0],
  [0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0],
  [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
  [0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

type WallCmd =
  | { move: [number, number] }
  | { line: [number, number] }
  | { curve: [number, number, number, number] };

const WALLS: WallCmd[][] = [
  [{move:[0,9.5]},{line:[3,9.5]},{curve:[3.5,9.5,3.5,9]},{line:[3.5,8]},{curve:[3.5,7.5,3,7.5]},{line:[1,7.5]},{curve:[0.5,7.5,0.5,7]},{line:[0.5,1]},{curve:[0.5,0.5,1,0.5]},{line:[9,0.5]},{curve:[9.5,0.5,9.5,1]},{line:[9.5,3.5]}],
  [{move:[9.5,1]},{curve:[9.5,0.5,10,0.5]},{line:[18,0.5]},{curve:[18.5,0.5,18.5,1]},{line:[18.5,7]},{curve:[18.5,7.5,18,7.5]},{line:[16,7.5]},{curve:[15.5,7.5,15.5,8]},{line:[15.5,9]},{curve:[15.5,9.5,16,9.5]},{line:[19,9.5]}],
  [{move:[2.5,5.5]},{line:[3.5,5.5]}],
  [{move:[3,2.5]},{curve:[3.5,2.5,3.5,3]},{curve:[3.5,3.5,3,3.5]},{curve:[2.5,3.5,2.5,3]},{curve:[2.5,2.5,3,2.5]}],
  [{move:[15.5,5.5]},{line:[16.5,5.5]}],
  [{move:[16,2.5]},{curve:[16.5,2.5,16.5,3]},{curve:[16.5,3.5,16,3.5]},{curve:[15.5,3.5,15.5,3]},{curve:[15.5,2.5,16,2.5]}],
  [{move:[6,2.5]},{line:[7,2.5]},{curve:[7.5,2.5,7.5,3]},{curve:[7.5,3.5,7,3.5]},{line:[6,3.5]},{curve:[5.5,3.5,5.5,3]},{curve:[5.5,2.5,6,2.5]}],
  [{move:[12,2.5]},{line:[13,2.5]},{curve:[13.5,2.5,13.5,3]},{curve:[13.5,3.5,13,3.5]},{line:[12,3.5]},{curve:[11.5,3.5,11.5,3]},{curve:[11.5,2.5,12,2.5]}],
  [{move:[7.5,5.5]},{line:[9,5.5]},{curve:[9.5,5.5,9.5,6]},{line:[9.5,7.5]}],
  [{move:[9.5,6]},{curve:[9.5,5.5,10.5,5.5]},{line:[11.5,5.5]}],
  [{move:[5.5,5.5]},{line:[5.5,7]},{curve:[5.5,7.5,6,7.5]},{line:[7.5,7.5]}],
  [{move:[6,7.5]},{curve:[5.5,7.5,5.5,8]},{line:[5.5,9.5]}],
  [{move:[13.5,5.5]},{line:[13.5,7]},{curve:[13.5,7.5,13,7.5]},{line:[11.5,7.5]}],
  [{move:[13,7.5]},{curve:[13.5,7.5,13.5,8]},{line:[13.5,9.5]}],
  [{move:[0,11.5]},{line:[3,11.5]},{curve:[3.5,11.5,3.5,12]},{line:[3.5,13]},{curve:[3.5,13.5,3,13.5]},{line:[1,13.5]},{curve:[0.5,13.5,0.5,14]},{line:[0.5,17]},{curve:[0.5,17.5,1,17.5]},{line:[1.5,17.5]}],
  [{move:[1,17.5]},{curve:[0.5,17.5,0.5,18]},{line:[0.5,21]},{curve:[0.5,21.5,1,21.5]},{line:[18,21.5]},{curve:[18.5,21.5,18.5,21]},{line:[18.5,18]},{curve:[18.5,17.5,18,17.5]},{line:[17.5,17.5]}],
  [{move:[18,17.5]},{curve:[18.5,17.5,18.5,17]},{line:[18.5,14]},{curve:[18.5,13.5,18,13.5]},{line:[16,13.5]},{curve:[15.5,13.5,15.5,13]},{line:[15.5,12]},{curve:[15.5,11.5,16,11.5]},{line:[19,11.5]}],
  [{move:[5.5,11.5]},{line:[5.5,13.5]}],
  [{move:[13.5,11.5]},{line:[13.5,13.5]}],
  [{move:[2.5,15.5]},{line:[3,15.5]},{curve:[3.5,15.5,3.5,16]},{line:[3.5,17.5]}],
  [{move:[16.5,15.5]},{line:[16,15.5]},{curve:[15.5,15.5,15.5,16]},{line:[15.5,17.5]}],
  [{move:[5.5,15.5]},{line:[7.5,15.5]}],
  [{move:[11.5,15.5]},{line:[13.5,15.5]}],
  [{move:[2.5,19.5]},{line:[5,19.5]},{curve:[5.5,19.5,5.5,19]},{line:[5.5,17.5]}],
  [{move:[5.5,19]},{curve:[5.5,19.5,6,19.5]},{line:[7.5,19.5]}],
  [{move:[11.5,19.5]},{line:[13,19.5]},{curve:[13.5,19.5,13.5,19]},{line:[13.5,17.5]}],
  [{move:[13.5,19]},{curve:[13.5,19.5,14,19.5]},{line:[16.5,19.5]}],
  [{move:[7.5,13.5]},{line:[9,13.5]},{curve:[9.5,13.5,9.5,14]},{line:[9.5,15.5]}],
  [{move:[9.5,14]},{curve:[9.5,13.5,10,13.5]},{line:[11.5,13.5]}],
  [{move:[7.5,17.5]},{line:[9,17.5]},{curve:[9.5,17.5,9.5,18]},{line:[9.5,19.5]}],
  [{move:[9.5,18]},{curve:[9.5,17.5,10,17.5]},{line:[11.5,17.5]}],
  [{move:[8.5,9.5]},{line:[8,9.5]},{curve:[7.5,9.5,7.5,10]},{line:[7.5,11]},{curve:[7.5,11.5,8,11.5]},{line:[11,11.5]},{curve:[11.5,11.5,11.5,11]},{line:[11.5,10]},{curve:[11.5,9.5,11,9.5]},{line:[10.5,9.5]}],
];

/** ==== Utils ==== */
const clone2D = (src: number[][]) => src.map((r) => r.slice());
const within = (h: number, w: number, y: number, x: number) =>
  y >= 0 && y < h && x >= 0 && x < w;

/** ==== Audio ==== */
function useAudioManager(rootBase: string) {
  const filesRef = useRef<AudioFileMap>({});
  const playingRef = useRef<string[]>([]);
  const soundDisabled = () =>
    typeof window !== "undefined" && localStorage.getItem("soundDisabled") === "true";

  const load = (name: string, path: string, onReady: () => void) => {
    const a = document.createElement("audio");
    a.setAttribute("preload", "true");
    a.setAttribute("autobuffer", "true");
    a.src = path;
    const handler = () => {
      a.removeEventListener("canplaythrough", handler, true);
      onReady();
    };
    a.addEventListener("canplaythrough", handler, true);
    a.pause();
    filesRef.current[name] = a;
  };

  const play = (name: string) => {
    if (soundDisabled()) return;
    const a = filesRef.current[name];
    if (!a) return;
    const ended = () => {
      a.removeEventListener("ended", ended, true);
      playingRef.current = playingRef.current.filter((n) => n !== name);
    };
    playingRef.current.push(name);
    a.addEventListener("ended", ended, true);
    a.currentTime = 0;
    void a.play();
  };

  const pause = () => {
    playingRef.current.forEach((n) => {
      const a = filesRef.current[n];
      if (a) a.pause();
    });
  };
  const resume = () => {
    if (soundDisabled()) return;
    playingRef.current.forEach((n) => {
      const a = filesRef.current[n];
      if (a) void a.play();
    });
  };
  const disable = () => {
    playingRef.current.forEach((n) => {
      const a = filesRef.current[n];
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    });
    playingRef.current = [];
  };

  const loadAll = (onAll: () => void) => {
    const ext = new Audio().canPlayType("audio/ogg") ? "ogg" : "mp3";
    const assets: [string, string][] = [
      ["start", `${rootBase}audio/opening_song.${ext}`],
      ["die", `${rootBase}audio/die.${ext}`],
      ["eatghost", `${rootBase}audio/eatghost.${ext}`],
      ["eatpill", `${rootBase}audio/eatpill.${ext}`],
      ["eating", `${rootBase}audio/eating.short.${ext}`],
      ["eating2", `${rootBase}audio/eating.short.${ext}`],
    ];
    let left = assets.length;
    assets.forEach(([n, p]) =>
      load(n, p, () => {
        left -= 1;
        if (left === 0) onAll();
      })
    );
  };

  return { loadAll, play, pause, resume, disable };
}

/** ==== Component ==== */
export default function ClassicPacman({
  wallet,
  username,
  onScoreSubmit,
  rootAssetBase = "https://raw.githubusercontent.com/daleharvey/pacman/master/",
}: {
  wallet: string | null;
  username: string | null;
  onScoreSubmit?: (finalScore: number) => void;
  rootAssetBase?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<number>(WAITING);
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [loaded, setLoaded] = useState<boolean>(false);

  const isMobile = useMemo(
    () => (typeof window !== "undefined" ? window.matchMedia("(pointer: coarse)").matches : false),
    []
  );

  // game internals
  const tickRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const eatenCountRef = useRef(0);
  const stateChangedRef = useRef(true);
  const timerStartRef = useRef(0);
  const lastCountdownRef = useRef(0);

  // map/grid
  const mapRef = useRef(clone2D(MAP_DATA));
  const pillPulseRef = useRef(0);
  const blockSizeRef = useRef(18);

  // entities
  const userPosRef = useRef<Vec>({ x: 90, y: 120 });
  const userDirRef = useRef<number>(LEFT);
  const userDueRef = useRef<number>(LEFT);

  type Ghost = {
    pos: Vec;
    dir: number;
    due: number;
    eatableTick: number | null;
    eatenTick: number | null;
    colour: string;
  };
  const ghostsRef = useRef<Ghost[]>([]);
  const ghostColours = ["#00FFDE", "#FF0000", "#FFB8DE", "#FFB847"];

  // audio
  const audio = useAudioManager(rootAssetBase);

  /** Utils */
  const getTick = () => tickRef.current;
  const pointToCoord = (x: number) => Math.round(x / 10);
  const onWhole = (x: number) => x % 10 === 0;
  const onGrid = (p: Vec) => onWhole(p.x) && onWhole(p.y);
  const nextSquare = (x: number, dir: number) => {
    const rem = x % 10;
    if (rem === 0) return x;
    if (dir === RIGHT || dir === DOWN) return x + (10 - rem);
    return x - rem;
  };
  const next = (pos: Vec, dir: number) => ({
    y: pointToCoord(nextSquare(pos.y, dir)),
    x: pointToCoord(nextSquare(pos.x, dir)),
  });
  const isWall = (pos: { y: number; x: number }) =>
    within(mapRef.current.length, mapRef.current[0].length, pos.y, pos.x) &&
    mapRef.current[pos.y][pos.x] === WALL;
  const isFloor = (pos: { y: number; x: number }) => {
    if (!within(mapRef.current.length, mapRef.current[0].length, pos.y, pos.x)) return false;
    const v = mapRef.current[pos.y][pos.x];
    return v === EMPTY || v === BISCUIT || v === PILL;
  };

  /** Drawing */
  const drawWalls = (ctx: CanvasRenderingContext2D) => {
    const s = blockSizeRef.current;
    ctx.strokeStyle = "#0000FF";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (const line of WALLS) {
      ctx.beginPath();
      for (const seg of line) {
        if ("move" in seg) {
          ctx.moveTo(seg.move[0] * s, seg.move[1] * s);
        } else if ("line" in seg) {
          ctx.lineTo(seg.line[0] * s, seg.line[1] * s);
        } else {
          ctx.quadraticCurveTo(seg.curve[0] * s, seg.curve[1] * s, seg.curve[2] * s, seg.curve[3] * s);
        }
      }
      ctx.stroke();
    }
  };

  const drawBlock = (y: number, x: number, ctx: CanvasRenderingContext2D) => {
    const layout = mapRef.current[y][x];
    const s = blockSizeRef.current;
    if (layout === PILL) return;
    ctx.beginPath();
    if (layout === EMPTY || layout === BLOCK || layout === BISCUIT) {
      ctx.fillStyle = "#000";
      ctx.fillRect(x * s, y * s, s, s);
      if (layout === BISCUIT) {
        ctx.fillStyle = "#FFF";
        ctx.fillRect(x * s + s / 2.5, y * s + s / 2.5, s / 6, s / 6);
      }
    }
    ctx.closePath();
  };

  const drawPills = (ctx: CanvasRenderingContext2D) => {
    const s = blockSizeRef.current;
    pillPulseRef.current = (pillPulseRef.current + 1) % 31;
    for (let i = 0; i < mapRef.current.length; i++) {
      for (let j = 0; j < mapRef.current[0].length; j++) {
        if (mapRef.current[i][j] === PILL) {
          ctx.beginPath();
          ctx.fillStyle = "#000";
          ctx.fillRect(j * s, i * s, s, s);

          ctx.fillStyle = "#FFF";
          const r = Math.abs(5 - pillPulseRef.current / 3);
          ctx.arc(j * s + s / 2, i * s + s / 2, r, 0, Math.PI * 2, false);
          ctx.fill();
          ctx.closePath();
        }
      }
    }
  };

  const redrawBlock = (pos: Vec, ctx: CanvasRenderingContext2D) => {
    drawBlock(Math.floor(pos.y / 10), Math.floor(pos.x / 10), ctx);
    drawBlock(Math.ceil(pos.y / 10), Math.ceil(pos.x / 10), ctx);
  };

  const dialog = (ctx: CanvasRenderingContext2D, text: string) => {
    ctx.fillStyle = "#FFFF00";
    ctx.font = "18px Calibri, Arial, sans-serif";
    const width = ctx.measureText(text).width;
    const x = (mapRef.current[0].length * blockSizeRef.current - width) / 2;
    ctx.fillText(text, x, mapRef.current.length * 10 + 8);
  };

  const drawFooter = (ctx: CanvasRenderingContext2D) => {
    const top = mapRef.current.length * blockSizeRef.current;
    const textBase = top + 17;
    const wPx = mapRef.current[0].length * blockSizeRef.current;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, top, wPx, 30);

    ctx.fillStyle = "#FFFF00";
    for (let i = 0; i < lives; i++) {
      ctx.beginPath();
      const cx = 150 + 25 * i + blockSizeRef.current / 2;
      const cy = top + 1 + blockSizeRef.current / 2;
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, blockSizeRef.current / 2, Math.PI * 0.25, Math.PI * 1.75, false);
      ctx.fill();
    }

    const soundOff = typeof window !== "undefined" && localStorage.getItem("soundDisabled") === "true";
    ctx.fillStyle = !soundOff ? "#00FF00" : "#FF0000";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("s", 10, textBase);

    ctx.fillStyle = "#FFFF00";
    ctx.font = "14px Calibri, Arial, sans-serif";
    ctx.fillText(`Score: ${score}`, 30, textBase);
    ctx.fillText(`Level: ${level}`, 260, textBase);
  };

  const drawUser = (ctx: CanvasRenderingContext2D) => {
    const s = blockSizeRef.current;
    const calcAngle = (dir: number, pos: Vec) => {
      if (dir === RIGHT && pos.x % 10 < 5) return { start: 0.25, end: 1.75, rev: false };
      if (dir === DOWN && pos.y % 10 < 5) return { start: 0.75, end: 2.25, rev: false };
      if (dir === UP && pos.y % 10 < 5) return { start: 1.25, end: 1.75, rev: true };
      if (dir === LEFT && pos.x % 10 < 5) return { start: 0.75, end: 1.25, rev: true };
      return { start: 0, end: 2, rev: false };
    };
    const angle = calcAngle(userDirRef.current, userPosRef.current);
    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    ctx.moveTo((userPosRef.current.x / 10) * s + s / 2, (userPosRef.current.y / 10) * s + s / 2);
    ctx.arc(
      (userPosRef.current.x / 10) * s + s / 2,
      (userPosRef.current.y / 10) * s + s / 2,
      s / 2,
      Math.PI * angle.start,
      Math.PI * angle.end,
      angle.rev
    );
    ctx.fill();
  };

  const drawUserDead = (ctx: CanvasRenderingContext2D, amount: number) => {
    const s = blockSizeRef.current;
    const half = s / 2;
    if (amount >= 1) return;
    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    const cx = (userPosRef.current.x / 10) * s + half;
    const cy = (userPosRef.current.y / 10) * s + half;
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, half, 0, Math.PI * 2 * amount, true);
    ctx.fill();
  };

  function drawGhost(ctx: CanvasRenderingContext2D, g: Ghost): void {
    const s = blockSizeRef.current;
    const top = (g.pos.y / 10) * s;
    const left = (g.pos.x / 10) * s;

    const secondsAgo = (tick: number | null) =>
      tick === null ? Number.MAX_SAFE_INTEGER : (getTick() - tick) / FPS;
    const eatable = g.eatableTick !== null ? secondsAgo(g.eatableTick) : Number.MAX_SAFE_INTEGER;
    const eatenAgo = g.eatenTick !== null ? secondsAgo(g.eatenTick) : Number.MAX_SAFE_INTEGER;

    let colour: string;
    if (g.eatableTick !== null) {
      colour = eatable > 5 ? (getTick() % 20 > 10 ? "#FFFFFF" : "#0000BB") : "#0000BB";
    } else if (g.eatenTick !== null) {
      colour = "#222";
    } else {
      colour = g.colour;
    }

    if (g.eatableTick !== null && eatable > 8) g.eatableTick = null;
    if (g.eatenTick !== null && eatenAgo > 3) g.eatenTick = null;

    const tl = left + s;
    const base = top + s - 3;
    const inc = s / 10;
    const high = getTick() % 10 > 5 ? 3 : -3;
    const low = getTick() % 10 > 5 ? -3 : 3;

    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(left, base);
    ctx.quadraticCurveTo(left, top, left + s / 2, top);
    ctx.quadraticCurveTo(left + s, top, left + s, base);

    ctx.quadraticCurveTo(tl - inc * 1, base + high, tl - inc * 2, base);
    ctx.quadraticCurveTo(tl - inc * 3, base + low, tl - inc * 4, base);
    ctx.quadraticCurveTo(tl - inc * 5, base + high, tl - inc * 6, base);
    ctx.quadraticCurveTo(tl - inc * 7, base + low, tl - inc * 8, base);
    ctx.quadraticCurveTo(tl - inc * 9, base + high, tl - inc * 10, base);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "#FFF";
    ctx.arc(left + 6, top + 6, s / 6, 0, 300, false);
    ctx.arc(left + s - 6, top + 6, s / 6, 0, 300, false);
    ctx.closePath();
    ctx.fill();

    const f = s / 12;
    const off: Record<number, [number, number]> = {
      [RIGHT]: [f, 0],
      [LEFT]: [-f, 0],
      [UP]: [0, -f],
      [DOWN]: [0, f],
      [NONE]: [0, 0],
    };

    ctx.beginPath();
    ctx.fillStyle = "#000";
    const o = off[g.dir] ?? [0, 0];
    ctx.arc(left + 6 + o[0], top + 6 + o[1], s / 15, 0, 300, false);
    ctx.arc(left + s - 6 + o[0], top + 6 + o[1], s / 15, 0, 300, false);
    ctx.closePath();
    ctx.fill();
  }

  /** Movement */
  const userNewCoord = (dir: number, cur: Vec): Vec => ({
    x: cur.x + ((dir === LEFT && -2) || (dir === RIGHT && 2) || 0),
    y: cur.y + ((dir === DOWN && 2) || (dir === UP && -2) || 0),
  });

  const ghostAddBounded = (x1: number, x2: number) => {
    const rem = x1 % 10;
    const result = rem + x2;
    if (rem !== 0 && result > 10) return x1 + (10 - rem);
    if (rem > 0 && result < 0) return x1 - rem;
    return x1 + x2;
  };
  const ghostNewCoord = (dir: number, cur: Vec, g: { eatableTick: number | null; eatenTick: number | null }): Vec => {
    const speed = g.eatableTick !== null ? 1 : g.eatenTick !== null ? 4 : 2;
    const xSpeed = dir === LEFT ? -speed : dir === RIGHT ? speed : 0;
    const ySpeed = dir === DOWN ? speed : dir === UP ? -speed : 0;
    return { x: ghostAddBounded(cur.x, xSpeed), y: ghostAddBounded(cur.y, ySpeed) };
  };
  const ghostOpposite = (dir: number) =>
    (dir === LEFT && RIGHT) || (dir === RIGHT && LEFT) || (dir === UP && DOWN) || UP;

  const isOnSamePlane = (a: number, b: number) =>
    ((a === LEFT || a === RIGHT) && (b === LEFT || b === RIGHT)) ||
    ((a === UP || a === DOWN) && (b === UP || b === DOWN));

  const pane = (pos: Vec, dir: number): Vec | false => {
    if (pos.y === 100 && pos.x >= 190 && dir === RIGHT) return { y: 100, x: -10 };
    if (pos.y === 100 && pos.x <= -10 && dir === LEFT) return { y: 100, x: 190 };
    return false;
  };

  /** Gameplay handlers */
  const eatenPill = () => {
    audio.play("eatpill");
    timerStartRef.current = getTick();
    eatenCountRef.current = 0;
    ghostsRef.current = ghostsRef.current.map((g) => ({
      ...g,
      dir: ghostOpposite(g.dir),
      eatableTick: getTick(),
    }));
  };

  const completedLevel = () => {
    setState(WAITING);
    setLevel((lv) => lv + 1);
    mapRef.current = clone2D(MAP_DATA);
    userPosRef.current = { x: 90, y: 120 };
    userDirRef.current = LEFT;
    userDueRef.current = LEFT;
    startLevel();
  };

  const startLevel = () => {
    ghostsRef.current = ghostColours.map((c) => ({
      pos: { x: 90, y: 80 },
      dir: Math.random() < 0.5 ? UP : DOWN,
      due: Math.random() < 0.5 ? LEFT : RIGHT,
      eatableTick: null,
      eatenTick: null,
      colour: c,
    }));
    audio.play("start");
    timerStartRef.current = getTick();
    setState(COUNTDOWN);
    stateChangedRef.current = true;
  };

  const startNewGame = () => {
    setState(WAITING);
    setLevel(1);
    setLives(3);
    setScore(0);
    mapRef.current = clone2D(MAP_DATA);
    userPosRef.current = { x: 90, y: 120 };
    userDirRef.current = LEFT;
    userDueRef.current = LEFT;
    startLevel();
  };

  const loseLife = (ctx: CanvasRenderingContext2D) => {
    setState(WAITING);
    setLives((v) => {
      const left = v - 1;
      if (left > 0) startLevel();
      else {
        drawAll(ctx, true);
        dialog(ctx, "GAME OVER");
        if (typeof onScoreSubmit === "function") onScoreSubmit(score);
      }
      return left;
    });
  };

  /** Core draw */
  const drawMap = (ctx: CanvasRenderingContext2D) => {
    const s = blockSizeRef.current;
    const h = mapRef.current.length;
    const w = mapRef.current[0].length;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w * s, h * s);
    drawWalls(ctx);
    for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) drawBlock(i, j, ctx);
  };

  const drawAll = (ctx: CanvasRenderingContext2D, skipEntities = false) => {
    drawPills(ctx);
    if (!skipEntities) {
      ghostsRef.current.forEach((g) => drawGhost(ctx, g));
      drawUser(ctx);
    }
    drawFooter(ctx);
  };

  /** Main loop */
  const collided = (u: Vec, g: Vec) => Math.hypot(g.x - u.x, g.y - u.y) < 10;

  const mainDraw = (ctx: CanvasRenderingContext2D) => {
    // ghosts
    const ghostPosOld = ghostsRef.current.map((g) => ({ ...g.pos }));
    ghostsRef.current = ghostsRef.current.map((g) => {
      const onGridSq = onGrid(g.pos);
      let due = g.due;
      if (onGridSq) {
        due = g.dir === LEFT || g.dir === RIGHT ? (Math.random() < 0.5 ? UP : DOWN) : (Math.random() < 0.5 ? LEFT : RIGHT);
      }
      let npos = ghostNewCoord(due, g.pos, g);
      if (onGridSq && isWall({ y: pointToCoord(nextSquare(npos.y, due)), x: pointToCoord(nextSquare(npos.x, due)) })) {
        npos = ghostNewCoord(g.dir, g.pos, g);
        if (onGridSq && isWall({ y: pointToCoord(nextSquare(npos.y, g.dir)), x: pointToCoord(nextSquare(npos.x, g.dir)) })) {
          npos = g.pos;
        }
      } else {
        g.dir = due;
      }
      const wrap = pane(npos, g.dir);
      if (wrap) npos = wrap;
      return { ...g, pos: npos, due };
    });

    // user
    const oldUser = { ...userPosRef.current };
    let npos = userNewCoord(userDueRef.current, userPosRef.current);
    if (
      (userDueRef.current === userDirRef.current && isOnSamePlane(userDueRef.current, userDirRef.current)) ||
      (onGrid(userPosRef.current) && isFloor(next(npos, userDueRef.current)))
    ) {
      userDirRef.current = userDueRef.current;
    } else {
      npos = userNewCoord(userDirRef.current, userPosRef.current);
    }
    if (onGrid(userPosRef.current) && isWall(next(npos, userDirRef.current))) {
      userDirRef.current = NONE;
    }
    if (userDirRef.current !== NONE) {
      if (npos.y === 100 && npos.x >= 190 && userDirRef.current === RIGHT) npos = { y: 100, x: -10 };
      if (npos.y === 100 && npos.x <= -12 && userDirRef.current === LEFT) npos = { y: 100, x: 190 };
      userPosRef.current = npos;
    }

    ghostsRef.current.forEach((_, i) => redrawBlock(ghostPosOld[i], ctx));
    redrawBlock(oldUser, ctx);

    const ns = next(userPosRef.current, userDirRef.current);
    const block = mapRef.current[ns.y]?.[ns.x];
    const isMid = (v: number) => {
      const r = v % 10;
      return r > 3 || r < 7;
    };
    if ((isMid(userPosRef.current.x) || isMid(userPosRef.current.y)) && (block === BISCUIT || block === PILL)) {
      mapRef.current[ns.y][ns.x] = EMPTY;
      const add = block === BISCUIT ? 10 : 50;
      setScore((s) => {
        const n = s + add;
        if (n >= 10000 && s < 10000) setLives((v) => v + 1);
        return n;
      });
      eatenCountRef.current += 1;
      if (eatenCountRef.current === 182) {
        completedLevel();
      }
      if (block === PILL) eatenPill();
    }

    ghostsRef.current.forEach((g) => drawGhost(ctx, g));
    drawUser(ctx);

    for (const g of ghostsRef.current) {
      if (collided(userPosRef.current, g.pos)) {
        if (g.eatableTick !== null) {
          audio.play("eatghost");
          g.eatableTick = null;
          g.eatenTick = getTick();
          const idx = Math.min(eatenCountRef.current, 4);
          const combo = [200, 400, 800, 1600][Math.max(0, idx - 1)];
          setScore((s) => s + combo);
          setState(EATEN_PAUSE);
          timerStartRef.current = getTick();
        } else if (g.eatenTick === null) {
          audio.play("die");
          setState(DYING);
          timerStartRef.current = getTick();
          break;
        }
      }
    }
  };

  const loop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (state !== PAUSE) tickRef.current += 1;

    drawPills(ctx);

    if (state === PLAYING) {
      mainDraw(ctx);
    } else if (state === WAITING && stateChangedRef.current) {
      stateChangedRef.current = false;
      drawMap(ctx);
      dialog(ctx, "Press N/Space to start");
    } else if (state === EATEN_PAUSE && getTick() - timerStartRef.current > FPS / 3) {
      drawMap(ctx);
      setState(PLAYING);
    } else if (state === DYING) {
      if (getTick() - timerStartRef.current > FPS * 2) {
        loseLife(ctx);
      } else {
        redrawBlock(userPosRef.current, ctx);
        ghostsRef.current.forEach((g) => redrawBlock(g.pos, ctx));
        drawUserDead(ctx, (getTick() - timerStartRef.current) / (FPS * 2));
      }
    } else if (state === COUNTDOWN) {
      const diff = 5 + Math.floor((timerStartRef.current - getTick()) / FPS);
      if (diff === 0) {
        drawMap(ctx);
        setState(PLAYING);
      } else {
        if (diff !== lastCountdownRef.current) {
          lastCountdownRef.current = diff;
          drawMap(ctx);
          dialog(ctx, `Starting in: ${diff}`);
        }
      }
    }
    drawFooter(ctx);
  };

  /** Effects */
  const handleStart = () => startNewGame();

  // responsive canvas
  useEffect(() => {
    const parent = canvasRef.current?.parentElement;
    const resize = () => {
      if (!canvasRef.current || !parent) return;
      const block = Math.floor(parent.clientWidth / 19);
      blockSizeRef.current = Math.max(14, Math.min(block, 28));
      canvasRef.current.width = blockSizeRef.current * 19;
      canvasRef.current.height = blockSizeRef.current * 22 + 30;
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        drawMap(ctx);
        drawFooter(ctx);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (parent) ro.observe(parent);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load audio & start timer
  useEffect(() => {
    audio.loadAll(() => setLoaded(true));
    return () => audio.disable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // timer
  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(loop, 1000 / FPS) as unknown as number;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, level, score, lives, loaded]);

  // keyboard (Space/N start + controls)
  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (e.keyCode === KEY.N) {
        startNewGame();
      } else if (e.keyCode === 32) { // SPACE
        if (state === WAITING) {
          startNewGame();
          e.preventDefault();
          e.stopPropagation();
          return false as unknown as boolean;
        }
      } else if (e.keyCode === KEY.S) {
        audio.disable();
        const flag = localStorage.getItem("soundDisabled") === "true";
        localStorage.setItem("soundDisabled", (!flag).toString());
      } else if (e.keyCode === KEY.P && state === PAUSE) {
        audio.resume();
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) drawMap(ctx);
        setState(WAITING);
      } else if (e.keyCode === KEY.P) {
        setState(PAUSE);
        audio.pause();
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          drawMap(ctx);
          dialog(ctx, "Paused");
        }
      } else if (state !== PAUSE) {
        const km: Record<number, number> = {
          [KEY.ARROW_LEFT]: LEFT,
          [KEY.ARROW_UP]: UP,
          [KEY.ARROW_RIGHT]: RIGHT,
          [KEY.ARROW_DOWN]: DOWN,
          65: LEFT, // A
          87: UP,   // W
          68: RIGHT,// D
          83: DOWN, // S
        };
        const d = km[e.keyCode];
        if (typeof d !== "undefined") {
          userDueRef.current = d;
          e.preventDefault();
          e.stopPropagation();
          return false as unknown as boolean;
        }
      }
      return true as unknown as boolean;
    };
    document.addEventListener("keydown", keyDown, true);
    const keyPress = (e: KeyboardEvent) => {
      if (state !== WAITING && state !== PAUSE) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keypress", keyPress, true);
    return () => {
      document.removeEventListener("keydown", keyDown, true);
      document.removeEventListener("keypress", keyPress, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // swipe mobile - prevent page scroll
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let sx = 0, sy = 0, active = false;
    const TH = 20;
    const dirFrom = (dx: number, dy: number) =>
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? RIGHT : LEFT) : dy > 0 ? DOWN : UP;

    const onStart = (e: TouchEvent) => {
      active = true;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      e.preventDefault();
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;
      if (Math.abs(dx) < TH && Math.abs(dy) < TH) { e.preventDefault(); return; }
      userDueRef.current = dirFrom(dx, dy);
      active = false;
      e.preventDefault();
    };
    const onEnd = (e: TouchEvent) => {
      active = false;
      e.preventDefault();
    };

    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);

  // kirim score ke parent (opsional)
  useEffect(() => {
    try {
      window.parent?.postMessage({ __monadGame: true, type: "score", payload: { score }, sessionId: "react" }, "*");
    } catch {}
  }, [score]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="px-2 py-1 rounded bg-neutral-900/70 border border-neutral-800">Score: <b>{score}</b></div>
        <div className="px-2 py-1 rounded bg-neutral-900/70 border border-neutral-800">Level: <b>{level}</b></div>
        <div className="px-2 py-1 rounded bg-neutral-900/70 border border-neutral-800">Lives: <b>{lives}</b></div>
        {username ? (
          <div className="px-2 py-1 rounded bg-neutral-900/70 border border-neutral-800">@{username}</div>
        ) : wallet ? (
          <a
            className="px-3 py-1 rounded bg-yellow-400 text-black hover:bg-yellow-300"
            href="https://monad-games-id-site.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            Reserve your Monad Games ID username
          </a>
        ) : null}
      </div>

      <div className="relative w-full rounded-2xl border border-neutral-800 bg-black shadow-inner p-2 overflow-hidden">
        {state === WAITING && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
            {isMobile ? (
              <button
                onClick={handleStart}
                className="px-5 py-3 rounded-2xl bg-yellow-400 text-black font-medium hover:bg-yellow-300 active:scale-[0.99]"
              >
                Start
              </button>
            ) : (
              <div className="px-4 py-2 rounded-2xl bg-neutral-900/80 border border-neutral-700 text-neutral-200">
                Press <span className="font-semibold">Space</span> to Start
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="w-full h-auto block rounded-md select-none touch-none" />
      </div>

      <div className="text-xs text-neutral-400">
        <p>Controls: Arrow / WASD • Mobile: swipe • Space/N = Start • P = Pause • S = Toggle Sound</p>
      </div>
    </div>
  );
}