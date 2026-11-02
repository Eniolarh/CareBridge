import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ConfigBanner } from "@/components/config-banner";

export const metadata: Metadata = {
  title: {
    default: "CareBridge — Transparent patient crowdfunding on Stellar",
    template: "%s · CareBridge",
  },
  description:
    "CareBridge is a transparent humanitarian crowdfunding dashboard on Stellar. Donate to verified patient campaigns and release escrow against real medical invoices.",
  keywords: [
    "Stellar",
    "Soroban",
    "crowdfunding",
    "healthcare",
    "humanitarian",
    "escrow",
    "USDC",
  ],
  openGraph: {
    title: "CareBridge — Transparent patient crowdfunding on Stellar",
    description:
      "Invoice-verified medical escrow built with Soroban smart contracts and Freighter.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7faf8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <WalletProvider>
          <Navbar />
          <ConfigBanner />
          <main className="flex-1">{children}</main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
