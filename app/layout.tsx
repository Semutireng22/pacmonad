import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Pac-Mon — Monad Games ID",
  description: "Pac-Man on Monad Testnet with Monad Games ID integration"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}