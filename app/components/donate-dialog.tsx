"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { donate, humanizeError } from "@/lib/carebridge";
import { useTokenBalance } from "@/lib/hooks/use-token-balance";
import {
  formatInputAmount,
  formatTokenAmount,
  progressPercent,
  toStroops,
} from "@/lib/format";
import { explorerTxUrl } from "@/lib/stellar";
import { tokenSymbol } from "@/lib/tokens";
import type { Campaign } from "@/lib/types";
import { useWallet } from "@/lib/wallet";
import { cn } from "@/lib/cn";
import {
  AlertIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  HeartIcon,
  LoaderIcon,
  LockIcon,
  WalletIcon,
  XIcon,
} from "./icons";
import { Button } from "./ui/button";
import { ProgressBar } from "./progress-bar";

const QUICK_AMOUNTS = ["25", "50", "100", "250"];

export function DonateDialog({
  campaign,
  open,
  onClose,
  onSuccess,
}: {
  campaign: Campaign;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { address, connect, isConnecting, sign, isWrongNetwork } = useWallet();
  const { balance } = useTokenBalance(campaign.token, address);
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const symbol = tokenSymbol(campaign.token);
  const active = campaign.status === "Active";
  const previewAmount = (() => {
    try {
      return toStroops(amount || "0");
    } catch {
      return 0n;
    }
  })();
  const projectedRaised = campaign.raisedAmount + previewAmount;
  const projectedPercent = progressPercent(projectedRaised, campaign.targetAmount);

  useEffect(() => {
    if (!open) return;

    setAmount("");
    setError(null);
    setHash(null);
    setPending(false);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);

    if (!address) {
      await connect();
      return;
    }
    if (!active) {
      setError("This campaign is no longer accepting donations.");
      return;
    }

    let stroops: bigint;
    try {
      stroops = toStroops(amount);
    } catch (cause) {
      setError(humanizeError(cause));
      return;
    }

    if (balance > 0n && stroops > balance) {
      setError(
        `Your balance is ${formatTokenAmount(balance)} ${symbol}. Add funds in Freighter or lower the amount.`,
      );
      return;
    }

    setPending(true);
    try {
      const result = await donate(campaign.id, address, stroops, sign);
      setHash(result.hash);
      onSuccess?.();
    } catch (cause) {
      setError(humanizeError(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-lift sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <div>
            <p className="eyebrow">Make a donation</p>
            <h2 id="donate-title" className="mt-1 text-lg font-bold tracking-tight text-ink-950">
              {campaign.title || "Patient campaign"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {hash ? (
          <div className="px-5 py-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-care-100 text-care-700">
              <CheckCircleIcon className="h-7 w-7" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink-950">Thank you for your support</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              Your donation is now held in the campaign escrow. It can only be released once
              the verifier approves a medical invoice.
            </p>
            <Link
              href={explorerTxUrl(hash)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-care-700 hover:underline"
            >
              View transaction
              <ExternalLinkIcon className="h-4 w-4" />
            </Link>
            <div className="mt-6">
              <Button variant="secondary" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-5 py-5">
            <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Funding progress</span>
                <span className="font-bold text-care-800">
                  {projectedPercent.toFixed(projectedPercent >= 10 ? 0 : 1)}%
                </span>
              </div>
              <ProgressBar
                raised={projectedRaised}
                target={campaign.targetAmount}
                className="mt-2"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                <span>
                  {formatTokenAmount(projectedRaised)} {symbol}
                </span>
                <span>
                  goal {formatTokenAmount(campaign.targetAmount)} {symbol}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="donation-amount" className="text-sm font-semibold text-ink-800">
                  Amount
                </label>
                {address ? (
                  <button
                    type="button"
                    onClick={() => setAmount(formatInputAmount(balance))}
                    className="text-xs font-semibold text-care-700 hover:underline"
                  >
                    Balance: {formatTokenAmount(balance)} {symbol} · Max
                  </button>
                ) : (
                  <span className="text-xs text-ink-500">Connect to view balance</span>
                )}
              </div>
              <div className="relative mt-1.5">
                <input
                  id="donation-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
                  disabled={pending}
                  className="h-14 w-full rounded-xl border border-ink-200 bg-white pl-4 pr-20 text-xl font-bold tracking-tight text-ink-950 shadow-sm outline-none transition placeholder:text-ink-300 focus:border-care-400 focus:ring-4 focus:ring-care-100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-500">
                  {symbol}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value)}
                    disabled={pending}
                    className={cn(
                      "h-9 rounded-lg border text-xs font-semibold transition",
                      amount === value
                        ? "border-care-400 bg-care-50 text-care-800"
                        : "border-ink-200 bg-white text-ink-600 hover:border-care-200 hover:bg-care-50/50",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-care-50 p-3 text-xs leading-relaxed text-care-900">
              <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Your contribution is locked in the CareBridge escrow. The verifier can only
                release it to the patient or the verified medical provider against an
                approved invoice.
              </p>
            </div>

            {isWrongNetwork ? (
              <div className="flex items-start gap-2 rounded-xl bg-coral-50 p-3 text-xs leading-relaxed text-coral-800">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Freighter is on a different network. Switch to the network configured for
                  this app before signing.
                </p>
              </div>
            ) : null}

            {error ? (
              <div className="flex items-start gap-2 rounded-xl bg-coral-50 p-3 text-xs leading-relaxed text-coral-800">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}

            {address ? (
              <Button
                size="lg"
                className="w-full"
                onClick={() => void handleSubmit()}
                disabled={pending || !active}
              >
                {pending ? (
                  <>
                    <LoaderIcon className="h-4 w-4" />
                    Confirming in wallet
                  </>
                ) : (
                  <>
                    <HeartIcon className="h-4 w-4" />
                    Donate {amount ? `${amount} ${symbol}` : "now"}
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full"
                onClick={() => void connect()}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <LoaderIcon className="h-4 w-4" />
                ) : (
                  <WalletIcon className="h-4 w-4" />
                )}
                Connect Freighter to donate
              </Button>
            )}

            {!active ? (
              <p className="text-center text-xs text-ink-500">
                This campaign is {campaign.status.toLowerCase()} and cannot accept new
                donations.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
