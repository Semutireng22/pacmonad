// app/api/submit-score/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Pastikan route berjalan di Node.js (bukan Edge) karena perlu signing private key.
export const runtime = "nodejs";

// ---- Konfigurasi ----
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_MONAD_GAMES_ID_ADDR ??
  "0xceCBFF203C8B6044F52CE23D914A1bfD997541A4") as `0x${string}`;

const ABI = parseAbi([
  "function updatePlayerData(address player, uint256 scoreAmount, uint256 transactionAmount) external",
]);

// Guard anti-cheat sederhana (server-side)
const MAX_DELTA_SCORE = 5000;
const MAX_DELTA_TX = 50;
const SUBMIT_COOLDOWN = 1500; // ms

// In-memory limiter (serverless bisa reset; ini mitigasi ringan)
const lastSubmitAt = new Map<string, number>();

// Validasi body
const BodySchema = z.object({
  wallet: z.string().startsWith("0x").length(42),
  deltaScore: z.number().int().min(0).max(MAX_DELTA_SCORE),
  deltaTx: z.number().int().min(0).max(MAX_DELTA_TX).default(0),
  level: z.number().int().min(1).max(256),
  playedMs: z.number().int().min(1).max(15 * 60 * 1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const data = BodySchema.parse(json);

    // Rate-limit per wallet
    const now = Date.now();
    const last = lastSubmitAt.get(data.wallet) ?? 0;
    if (now - last < SUBMIT_COOLDOWN) {
      return NextResponse.json({ ok: false, error: "Too many submits" }, { status: 429 });
    }

    // Sanity check sangat longgar berbasis waktu main (opsional)
    if (typeof data.playedMs === "number") {
      const maxByTime = Math.ceil((data.playedMs / 1000) * 12); // ≈12 pts/detik
      if (data.deltaScore > Math.max(800, maxByTime)) {
        return NextResponse.json({ ok: false, error: "Unreasonable deltaScore" }, { status: 400 });
      }
    }

    lastSubmitAt.set(data.wallet, now);

    const rpc = process.env.MONAD_RPC_URL;
    const pk = process.env.MONAD_GAME_SUBMITTER_PK;

    // Jika env belum di-set, mock sukses (dev mode/preview)
    if (!rpc || !pk) {
      return NextResponse.json({
        ok: true,
        mocked: true,
        submitted: {
          player: data.wallet,
          scoreAmount: data.deltaScore,
          transactionAmount: data.deltaTx,
        },
      });
    }

    // viem clients
    const transport = http(rpc);
    const account = privateKeyToAccount(
      pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`)
    );

    const walletClient = createWalletClient({ transport, account });
    const publicClient = createPublicClient({ transport });

    // Kirim DELTA (bukan total) ke kontrak
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "updatePlayerData",
      args: [data.wallet as `0x${string}`, BigInt(data.deltaScore), BigInt(data.deltaTx)],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ ok: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
