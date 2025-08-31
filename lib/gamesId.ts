export async function fetchUsernameForWallet(wallet: string) {
  const base = process.env.GAMES_ID_USERNAME_CHECK!;
  const url = `${base}?wallet=${wallet}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("username-check-failed");
  return r.json() as Promise<{
    hasUsername: boolean;
    user?: { id: number; username: string; walletAddress: string };
  }>;
}