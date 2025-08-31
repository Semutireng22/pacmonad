import { NextRequest, NextResponse } from "next/server";
import { serverWallet, gameAccount } from "@/lib/viemServer";
import { GAMES_ID_ABI } from "@/lib/gamesId.abi";
import { isAddress } from "viem";

const CONTRACT = (process.env.GAME_CONTRACT_ADDRESS || "").toLowerCase();

export async function POST(req: NextRequest) {
  try {
    const { player, scoreDelta, txDelta } = await req.json() as {
      player: string; scoreDelta: number; txDelta?: number;
    };

    if (!isAddress(player)) {
      return NextResponse.json({ error: "bad_player" }, { status: 400 });
    }
    if (!Number.isFinite(scoreDelta) || scoreDelta <= 0 || scoreDelta > 1_000_000) {
      return NextResponse.json({ error: "bad_score" }, { status: 400 });
    }
    const txD = Number.isFinite(txDelta) && (txDelta as number) > 0 ? Math.floor(txDelta as number) : 0;

    if (!CONTRACT) {
      return NextResponse.json({ error: "missing_contract" }, { status: 500 });
    }

    // Penting: pastikan alamat gameAccount SUDAH ter-register via registerGame
    const hash = await serverWallet.writeContract({
      address: CONTRACT as `0x${string}`,
      abi: GAMES_ID_ABI,
      functionName: "updatePlayerData",
      args: [player as `0x${string}`, BigInt(scoreDelta), BigInt(txD)],
    });

    return NextResponse.json({ ok: true, txHash: hash, from: gameAccount.address });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "internal_error" }, { status: 500 });
  }
}