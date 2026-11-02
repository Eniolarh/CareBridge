"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { explorerAccountUrl, NETWORK } from "@/lib/stellar";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  AlertIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LoaderIcon,
  WalletIcon,
  XIcon,
} from "./icons";
import { Button } from "./ui/button";

export function WalletButton() {
  const {
    address,
    connect,
    disconnect,
    isConnecting,
    isInstalled,
    isWrongNetwork,
    network,
    error,
    clearError,
  } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  if (!address) {
    return (
      <>
        <Button
          onClick={() => void connect()}
          disabled={isConnecting}
          className="h-10 px-3 sm:px-5"
        >
          {isConnecting ? (
            <LoaderIcon className="h-4 w-4" />
          ) : (
            <WalletIcon className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isConnecting ? "Connecting" : "Connect wallet"}
          </span>
          <span className="sm:hidden">{isConnecting ? "Wait" : "Connect"}</span>
        </Button>
        {error ? <WalletError message={error} onClose={clearError} /> : null}
        {isInstalled === false && !error ? (
          <p className="hidden max-w-[180px] text-right text-[11px] leading-tight text-ink-500 lg:block">
            Freighter extension required
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold text-ink-800 shadow-sm transition hover:border-care-300 hover:bg-care-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care-700",
          isWrongNetwork ? "border-coral-300" : "border-ink-200",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-care-500 to-care-700 text-[10px] font-bold text-white">
          {address.slice(0, 2)}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
        </span>
        <span className="font-mono text-xs">{shortAddress(address, 5)}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift"
        >
          <div className="border-b border-ink-100 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Connected account
            </p>
            <p className="mt-1 break-all font-mono text-xs text-ink-800">{address}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  isWrongNetwork
                    ? "bg-coral-50 text-coral-700"
                    : "bg-care-50 text-care-800",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isWrongNetwork ? "bg-coral-500" : "bg-emerald-500",
                  )}
                />
                {network || NETWORK}
                {isWrongNetwork ? " (switch network)" : ""}
              </span>
              <button
                type="button"
                onClick={() => void copyAddress()}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-ink-600 hover:bg-ink-50"
              >
                {copied ? (
                  <CheckIcon className="h-3.5 w-3.5 text-care-600" />
                ) : (
                  <CopyIcon className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {isWrongNetwork ? (
            <div className="flex gap-2 border-b border-ink-100 bg-coral-50 px-4 py-3 text-xs leading-relaxed text-coral-800">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This app is configured for {NETWORK}. Switch Freighter&apos;s network before
                signing.
              </span>
            </div>
          ) : null}

          <div className="p-1.5">
            <Link
              href={explorerAccountUrl(address)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
              onClick={() => setOpen(false)}
            >
              <ExternalLinkIcon className="h-4 w-4 text-ink-400" />
              View on Stellar Expert
            </Link>
            <button
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-coral-700 hover:bg-coral-50"
            >
              <XIcon className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        </div>
      ) : null}

      {error ? <WalletError message={error} onClose={clearError} /> : null}
    </div>
  );
}

function WalletError({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex max-w-sm items-start gap-3 rounded-xl border border-coral-200 bg-white p-4 shadow-lift">
      <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-coral-600" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink-900">Wallet notice</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-600">{message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-md p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
        aria-label="Dismiss"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
