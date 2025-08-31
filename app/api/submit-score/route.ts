import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPublicClient, createWalletClient, http, parseAbi, privateKeyToAccount } from "viem";

// ---- Konfigurasi ----
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_MONAD_GAMES_ID_ADDR ??
  "0xceCBFF203C8B6044F52CE23D914A1bfD997541A4") as `0x${string}`;

const ABI = parseAbi([
  "function updatePlayerData(address player, uint256 scoreAmount, uint256 transactionAmount) external",
]);

// upper bound anti-cheat (map kita: 182 biscuit *10 + 4 pill *50 + ghost chain per pill 50+100+150+200 = 500 -> *4 = 2000)
// total ~ 4020 → beri margin aman
const MAX_DELTA_SCORE = 5000;
const MAX_DELTA_TX = 50;
// cooldown antar submit per wallet (ms)
const SUBMIT_COOLDOWN = 1500;

// in-memory limiter (serverless bisa reset — ini mitigasi ringan)
const lastSubmitAt = new Map<string, number>();

// Zod schema agar bebas "any"
const BodySchema = z.object({
  wallet: z.string().startsWith("0x").length(42),
  deltaScore: z.number().int().min(0).max(MAX_DELTA_SCORE),
  deltaTx: z.number().int().min(0).max(MAX_DELTA_TX).default(0),
  level: z.number().int().min(1).max(256),
  // optional telemetry ringan untuk sanity
  playedMs: z.number().int().min(1).max(15 * 60 * 1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const data = BodySchema.parse(json);

    // rate limit per wallet
    const now = Date.now();
    const last = lastSubmitAt.get(data.wallet) ?? 0;
    if (now - last < SUBMIT_COOLDOWN) {
      return NextResponse.json({ ok: false, error: "Too many submits" }, { status: 429 });
    }

    // sanity check: deltaScore wajar terhadap waktu main (opsional)
    if (typeof data.playedMs === "number") {
      // max 120 poin per 10 dtk sebagai guard sangat longgar (≈ 12 pts/dtk)
      const maxByTime = Math.ceil((data.playedMs / 1000) * 12);
      if (data.deltaScore > Math.max(800, maxByTime)) {
        return NextResponse.json({ ok: false, error: "Unreasonable deltaScore" }, { status: 400 });
      }
    }

    // kalau tidak ada kredensial on-chain, kita mock (tetap server-side & delta-only)
    const rpc = process.env.MONAD_RPC_URL;
    const pk = process.env.MONAD_GAME_SUBMITTER_PK;

    lastSubmitAt.set(data.wallet, now);

    if (!rpc || !pk) {
      // mock sukses (digunakan saat dev / belum set env)
      return NextResponse.json({
        ok: true,
        mocked: true,
        submitted: { player: data.wallet, scoreAmount: data.deltaScore, transactionAmount: data.deltaTx },
      });
    }

    // viem client
    const transport = http(rpc);
    const account = privateKeyToAccount(pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`));
    const walletClient = createWalletClient({ transport, account });
    const publicClient = createPublicClient({ transport });

    // kirim tx: delta score/tx — BUKAN total
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "updatePlayerData",
      args: [data.wallet as `0x${string}`, BigInt(data.deltaScore), BigInt(data.deltaTx)],
    });

    // tunggu mined
    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ ok: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
