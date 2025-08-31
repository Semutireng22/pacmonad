// app/api/health/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      PRIVY_APP: Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
      CROSS_APP: Boolean(process.env.NEXT_PUBLIC_PRIVY_CROSS_APP_ID),
      RPC: Boolean(process.env.NEXT_PUBLIC_RPC_URL),
      CHAIN_ID: Boolean(process.env.NEXT_PUBLIC_CHAIN_ID),
      CONTRACT: Boolean(process.env.GAME_CONTRACT_ADDRESS),
      SERVER_PK: Boolean(process.env.GAME_SERVER_PRIVATE_KEY),
    },
  });
}