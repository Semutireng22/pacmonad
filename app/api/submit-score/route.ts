import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const runtime = "nodejs";

// ---- Chain config: Monad Testnet (ID 10143) ----
// RPC di sini tidak dipakai untuk konstruk chain (agar type statis),
// RPC actual tetap dari ENV (MONAD_RPC_URL) untuk koneksi client.
const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
    public: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
});

// ---- Konfigurasi kontrak ----
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_MONAD_GAMES_ID_ADDR ??
  "0xceCBFF203C8B6044F52CE23D914A1bfD997541A4") as `0x${string}`;

const ABI = parseAbi([
  "function updatePlayerData(address player, uint256 scoreAmount, uint256 transactionAmount) external",
]);

// ---- Guard anti-cheat ----
const MAX_DELTA_SCORE = 5000;
const MAX_DELTA_TX = 50;
const SUBMIT_COOLDOWN = 1500; // ms
const lastSubmitAt = new Map<string, number>();

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

    const now = Date.now();
    const last = lastSubmitAt.get(data.wallet) ?? 0;
    if (now - last < SUBMIT_COOLDOWN) {
      return NextResponse.json({ ok: false, error: "Too many submits" }, { status: 429 });
    }

    if (typeof data.playedMs === "number") {
      const maxByTime = Math.ceil((data.playedMs / 1000) * 12); // ≈12 pts/detik
      if (data.deltaScore > Math.max(800, maxByTime)) {
        return NextResponse.json({ ok: false, error: "Unreasonable deltaScore" }, { status: 400 });
      }
    }

    lastSubmitAt.set(data.wallet, now);

    const rpc = process.env.MONAD_RPC_URL;
    const pk = process.env.MONAD_GAME_SUBMITTER_PK;

    // Jika env belum di-set, mock sukses (dev/preview)
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

    const transport = http(rpc);
    const account = privateKeyToAccount(
      pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`)
    );

    const walletClient = createWalletClient({
      account,
      chain: monadTestnet,
      transport,
    });
    const publicClient = createPublicClient({
      chain: monadTestnet,
      transport,
    });

    // DELTA (bukan total)
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "updatePlayerData",
      args: [data.wallet as `0x${string}`, BigInt(data.deltaScore), BigInt(data.deltaTx)],
      // chain sudah disediakan di client
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ ok: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
