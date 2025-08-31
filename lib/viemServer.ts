// lib/viemServer.ts
import { createWalletClient, http, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "./monad";

const pk = (process.env.GAME_SERVER_PRIVATE_KEY || "") as Hex;
if (!pk || !pk.startsWith("0x")) {
  throw new Error("Missing GAME_SERVER_PRIVATE_KEY in .env (server)");
}

export const gameAccount = privateKeyToAccount(pk);

export const serverWallet = createWalletClient({
  account: gameAccount,
  chain: monadTestnet,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL!)
});