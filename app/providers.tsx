"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const crossAppId = process.env.NEXT_PUBLIC_PRIVY_CROSS_APP_ID || "cmd8euall0037le0my79qpz42";

  if (!privyAppId) {
    console.warn("NEXT_PUBLIC_PRIVY_APP_ID is not set. Privy authentication will not be available.");
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethodsAndOrder: {
          // Monad Games ID sebagai metode utama (jangan ubah ID)
          primary: [`privy:${crossAppId}`],
          // secondary: ["email", "google", "passkey", "wallet"], // opsional fallback
        },
        embeddedWallets: { createOnLogin: "users-without-wallets" },
        appearance: { theme: "dark", accentColor: "#ffd83d" }
      }}
    >
      {children}
    </PrivyProvider>
  );
}