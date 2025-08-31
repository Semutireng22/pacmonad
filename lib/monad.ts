import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 10143),
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz"] },
    public:  { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: process.env.NEXT_PUBLIC_EXPLORER || "https://testnet.monadexplorer.com"
    }
  },
});