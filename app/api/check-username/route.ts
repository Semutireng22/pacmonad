import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet")?.trim();
    if (!wallet) {
      return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
    }

    const url = `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${encodeURIComponent(wallet)}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Upstream error checking username" }, { status: 502 });
  }
}