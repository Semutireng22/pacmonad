// app/api/submit-score/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverWallet, gameAccount } from "@/lib/viemServer";
import { GAMES_ID_ABI } from "@/lib/gamesId.abi";
import { isAddress } from "viem";

export const runtime = "nodejs";           // ⬅️ pakai Node runtime (bukan Edge)
export const dynamic = "force-dynamic";    // ⬅️ jangan pernah cache response
export const preferredRegion = "auto";

const CONTRACT = (process.env.GAME_CONTRACT_ADDRESS || "").toLowerCase();
const RPC = process.env.NEXT_PUBLIC_RPC_URL;

export async function POST(req: NextRequest) {
  // env sanity check
  if (!CONTRACT) return NextResponse.json({ error: "missing_contract" }, { status: 500 });
  if (!RPC) return NextResponse.json({ error: "missing_rpc" }, { status: 500 });

  try {
    const body = (await req.json()) as { player?: string; scoreDelta?: unknown; txDelta?: unknown };

    const player = body?.player ?? "";
    const scoreDeltaNum = Number(body?.scoreDelta);
    const txDeltaNum = Number(body?.txDelta ?? 0);

    if (!isAddress(player)) {
      return NextResponse.json({ error: "bad_player" }, { status: 400 });
    }
    if (!Number.isFinite(scoreDeltaNum) || scoreDeltaNum <= 0 || scoreDeltaNum > 1_000_000) {
      return NextResponse.json({ error: "bad_score" }, { status: 400 });
    }
    const txD = Number.isFinite(txDeltaNum) && txDeltaNum > 0 ? Math.floor(txDeltaNum) : 0;

    // IMPORTANT: _game (gameAccount.address) harus sudah registerGame di kontrak
    const txHash = await serverWallet.writeContract({
      address: CONTRACT as `0x${string}`,
      abi: GAMES_ID_ABI,
      functionName: "updatePlayerData",
      args: [player as `0x${string}`, BigInt(scoreDeltaNum), BigInt(txD)],
    });

    return NextResponse.json({ ok: true, txHash, from: gameAccount.address }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "internal_error";
    console.error("[submit-score] error:", message); // ⬅️ terlihat di Vercel Logs
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// (opsional, bantu debugging via curl GET)
export async function GET() {
  return NextResponse.json({
    ok: true,
    runtime,
    contractSet: Boolean(CONTRACT),
    rpcSet: Boolean(RPC),
    gameAddress: gameAccount.address
  });
}