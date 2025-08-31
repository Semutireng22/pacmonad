export async function getUsernameForWallet(wallet: string): Promise<string | null> {
  try {
    const url = `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${wallet}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json: {
      hasUsername: boolean;
      user?: { username?: string };
    } = await res.json();
    return json.hasUsername && json.user?.username ? json.user.username : null;
  } catch {
    return null;
  }
}
