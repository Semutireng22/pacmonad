export type UsernameResponse = {
  hasUsername: boolean;
  user?: { id: number; username: string; walletAddress: string };
};

export async function fetchUsernameForWallet(wallet: string): Promise<UsernameResponse> {
  const res = await fetch(`/api/check-username?wallet=${encodeURIComponent(wallet)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`check-username failed: ${res.status}`);
  }
  return res.json();
}