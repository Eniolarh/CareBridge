import Link from "next/link";
import { CONTRACT_ID, EXPLORER_BASE, IS_MAINNET } from "@/lib/stellar";
import { Logo } from "./logo";
import { ExternalLinkIcon, GlobeIcon, ShieldIcon } from "./icons";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-100 bg-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-600">
            Transparent patient crowdfunding with milestone-based escrow and verified medical
            invoices, built on the Stellar network with Soroban smart contracts.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-care-100 bg-care-50 px-3 py-1.5 text-xs font-semibold text-care-800">
            <ShieldIcon className="h-4 w-4" />
            Non-custodial escrow
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
            Platform
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-600">
            <li>
              <Link href="/#campaigns" className="hover:text-care-800">
                Browse campaigns
              </Link>
            </li>
            <li>
              <Link href="/campaigns/new" className="hover:text-care-800">
                Start a campaign
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="hover:text-care-800">
                How escrow works
              </Link>
            </li>
            <li>
              <Link href="/#transparency" className="hover:text-care-800">
                Transparency
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
            Network
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-600">
            <li className="inline-flex items-center gap-2">
              <GlobeIcon className="h-4 w-4 text-care-600" />
              Stellar {IS_MAINNET ? "Mainnet" : "Testnet"}
            </li>
            {CONTRACT_ID ? (
              <li>
                <Link
                  href={`${EXPLORER_BASE}/contract/${CONTRACT_ID}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-care-800"
                >
                  View contract
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                </Link>
              </li>
            ) : null}
            <li>
              <Link
                href="https://developers.stellar.org/docs/build/smart-contracts/overview"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-care-800"
              >
                Soroban docs
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>CareBridge is a reference implementation. Not medical or financial advice.</p>
          <p>Built with Soroban, Next.js, Tailwind CSS and Freighter.</p>
        </div>
      </div>
    </footer>
  );
}
