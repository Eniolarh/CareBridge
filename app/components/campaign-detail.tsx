"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  claimRefund,
  getContribution,
  getInvoice,
  humanizeError,
  refundCampaign,
  releaseFunds,
  verifyInvoice,
} from "@/lib/carebridge";
import { useCampaign } from "@/lib/hooks/use-campaign";
import { useTokenBalance } from "@/lib/hooks/use-token-balance";
import {
  formatTokenAmount,
  progressPercent,
  shortAddress,
  timeAgo,
  toStroops,
} from "@/lib/format";
import {
  CONTRACT_ID,
  READ_ACCOUNT,
  explorerAccountUrl,
  explorerContractUrl,
  explorerTxUrl,
} from "@/lib/stellar";
import { tokenName, tokenSymbol } from "@/lib/tokens";
import type { Campaign, Invoice } from "@/lib/types";
import { useWallet } from "@/lib/wallet";
import { cn } from "@/lib/cn";
import { DonateDialog } from "./donate-dialog";
import { ProgressBar } from "./progress-bar";
import { StatusBadge } from "./status-badge";
import { Button, buttonClasses } from "./ui/button";
import { Field, Input } from "./ui/field";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CopyIcon,
  ExternalLinkIcon,
  HeartIcon,
  LoaderIcon,
  LockIcon,
  RefreshIcon,
  ShieldIcon,
  StethoscopeIcon,
  WalletIcon,
  XIcon,
} from "./icons";

export function CampaignDetail({ id }: { id: string }) {
  const campaignId = useMemo(() => {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }, [id]);

  const { campaign, loading, error, refresh } = useCampaign(campaignId);
  const { address, connect, isConnecting, sign, isWrongNetwork } = useWallet();
  const { balance: tokenBalance } = useTokenBalance(campaign?.token ?? null, address);
  const [donateOpen, setDonateOpen] = useState(false);
  const [contribution, setContribution] = useState(0n);
  const [copied, setCopied] = useState(false);

  const loadContribution = useCallback(async () => {
    if (!campaign || !address) {
      setContribution(0n);
      return;
    }
    try {
      const value = await getContribution(
        campaign.id,
        address,
        READ_ACCOUNT || address,
      );
      setContribution(value);
    } catch {
      setContribution(0n);
    }
  }, [address, campaign]);

  useEffect(() => {
    void loadContribution();
  }, [loadContribution]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), loadContribution()]);
  }, [refresh, loadContribution]);

  if (campaignId === null) {
    return <CampaignError message="That campaign id is not valid." />;
  }

  if (loading && !campaign) {
    return <CampaignDetailSkeleton />;
  }

  if (error && !campaign) {
    return <CampaignError message={error} />;
  }

  if (!campaign) {
    return <CampaignError message="Campaign not found on this network." />;
  }

  const percent = progressPercent(campaign.raisedAmount, campaign.targetAmount);
  const available =
    campaign.raisedAmount - campaign.releasedAmount - campaign.refundedAmount > 0n
      ? campaign.raisedAmount - campaign.releasedAmount - campaign.refundedAmount
      : 0n;
  const isVerifier = Boolean(address && address === campaign.verifier);
  const isPatient = Boolean(address && address === campaign.patient);
  const symbol = tokenSymbol(campaign.token);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <>
      <div className="container-page py-8">
        <nav className="flex items-center gap-2 text-xs font-medium text-ink-500">
          <Link href="/" className="hover:text-care-700">
            Campaigns
          </Link>
          <span>/</span>
          <span className="text-ink-700">Campaign #{campaign.id.toString()}</span>
        </nav>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertIcon className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <section className="surface overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-care-700 via-care-500 to-care-300" />
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={campaign.status} />
                  <span className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-600">
                    {symbol} escrow
                  </span>
                  {isVerifier ? (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                      You are the verifier
                    </span>
                  ) : null}
                  {isPatient ? (
                    <span className="rounded-full bg-care-50 px-2.5 py-1 text-xs font-semibold text-care-800 ring-1 ring-inset ring-care-200">
                      Your campaign
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink-950 sm:text-4xl">
                  {campaign.title || "Patient campaign"}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
                  <span>
                    Patient / case{" "}
                    <span className="font-mono font-semibold text-ink-700">
                      {campaign.patientId || shortAddress(campaign.patient)}
                    </span>
                  </span>
                  <span>Opened {timeAgo(campaign.createdAt)}</span>
                </div>

                <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                  {campaign.description || "No description provided."}
                </p>

                <div className="mt-7 rounded-2xl border border-ink-100 bg-ink-50/50 p-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                        Raised so far
                      </p>
                      <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink-950">
                        {formatTokenAmount(campaign.raisedAmount)}{" "}
                        <span className="text-base font-semibold text-ink-500">{symbol}</span>
                      </p>
                      <p className="mt-1 text-xs text-ink-500">
                        of {formatTokenAmount(campaign.targetAmount)} {symbol} goal
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-care-800">{percent.toFixed(1)}%</p>
                      <p className="text-xs text-ink-500">
                        {campaign.status === "Active"
                          ? `${formatTokenAmount(
                              campaign.targetAmount > campaign.raisedAmount
                                ? campaign.targetAmount - campaign.raisedAmount
                                : 0n,
                            )} ${symbol} remaining`
                          : campaign.status === "Completed"
                            ? "Goal reached"
                            : "Refunds open"}
                      </p>
                    </div>
                  </div>
                  <ProgressBar
                    raised={campaign.raisedAmount}
                    target={campaign.targetAmount}
                    tone={
                      campaign.status === "Refunded"
                        ? "coral"
                        : campaign.status === "Completed"
                          ? "blue"
                          : "care"
                    }
                    className="mt-4"
                  />
                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-ink-200/70 pt-4">
                    <Metric
                      label="Released"
                      value={formatTokenAmount(campaign.releasedAmount)}
                      suffix={symbol}
                    />
                    <Metric
                      label="In escrow"
                      value={formatTokenAmount(available)}
                      suffix={symbol}
                    />
                    <Metric
                      label="Refunded"
                      value={formatTokenAmount(campaign.refundedAmount)}
                      suffix={symbol}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void copyLink()}
                    className="h-9"
                  >
                    {copied ? (
                      <CheckCircleIcon className="h-4 w-4 text-care-600" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                    {copied ? "Link copied" : "Share campaign"}
                  </Button>
                  <Link
                    href={explorerContractUrl(CONTRACT_ID)}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClasses({ variant: "ghost", size: "sm" })}
                  >
                    View contract
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </section>

            <section className="surface p-6 sm:p-7">
              <div className="flex items-center gap-2">
                <ShieldIcon className="h-5 w-5 text-care-700" />
                <h2 className="text-lg font-bold tracking-tight text-ink-950">
                  Escrow accounting
                </h2>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Live values read from the CareBridge Soroban contract.
              </p>

              <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-ink-100">
                <Segment
                  value={campaign.releasedAmount}
                  total={campaign.raisedAmount}
                  className="bg-care-700"
                  label="Released"
                />
                <Segment
                  value={campaign.refundedAmount}
                  total={campaign.raisedAmount}
                  className="bg-coral-500"
                  label="Refunded"
                />
                <Segment
                  value={available}
                  total={campaign.raisedAmount}
                  className="bg-care-300"
                  label="In escrow"
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <LedgerRow
                  color="bg-care-700"
                  label="Released to care"
                  value={`${formatTokenAmount(campaign.releasedAmount)} ${symbol}`}
                />
                <LedgerRow
                  color="bg-care-300"
                  label="Held in escrow"
                  value={`${formatTokenAmount(available)} ${symbol}`}
                />
                <LedgerRow
                  color="bg-coral-500"
                  label="Returned to donors"
                  value={`${formatTokenAmount(campaign.refundedAmount)} ${symbol}`}
                />
              </div>

              <div className="mt-6 grid gap-4 rounded-xl border border-ink-100 bg-white p-4 sm:grid-cols-2">
                <RoleRow
                  label="Patient"
                  address={campaign.patient}
                  current={address === campaign.patient}
                />
                <RoleRow
                  label="Medical provider"
                  address={campaign.provider}
                  current={address === campaign.provider}
                />
                <RoleRow
                  label="Independent verifier"
                  address={campaign.verifier}
                  current={isVerifier}
                />
                <RoleRow
                  label="Donation token"
                  address={campaign.token}
                  current={false}
                  contract
                  tokenLabel={`${symbol} · ${tokenName(campaign.token)}`}
                />
              </div>
            </section>

            <VerifierPanel
              campaign={campaign}
              address={address}
              sign={sign}
              onRefresh={refreshAll}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="surface p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink-950">Fund this campaign</p>
                <HeartIcon className="h-5 w-5 text-coral-500" />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                Contributions are held in escrow and released only against verified invoices.
              </p>

              <div className="mt-4 rounded-xl bg-care-50 px-3.5 py-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-care-900">
                    {formatTokenAmount(campaign.raisedAmount)} {symbol} raised
                  </span>
                  <span className="font-bold text-care-800">{percent.toFixed(0)}%</span>
                </div>
                <ProgressBar
                  raised={campaign.raisedAmount}
                  target={campaign.targetAmount}
                  className="mt-2 h-2"
                />
              </div>

              {campaign.status === "Active" ? (
                <Button
                  size="lg"
                  className="mt-4 w-full"
                  onClick={() => setDonateOpen(true)}
                >
                  <HeartIcon className="h-4 w-4" />
                  Donate {symbol}
                </Button>
              ) : (
                <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5 text-center text-xs font-semibold text-ink-600">
                  {campaign.status === "Completed"
                    ? "This campaign reached its goal."
                    : "This campaign is refunding donors."}
                </div>
              )}

              {address ? (
                <div className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-500">Wallet balance</span>
                    <span className="font-semibold text-ink-800">
                      {formatTokenAmount(tokenBalance)} {symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-500">Your contribution</span>
                    <span className="font-semibold text-ink-800">
                      {formatTokenAmount(contribution)} {symbol}
                    </span>
                  </div>
                  {campaign.status === "Refunded" && contribution > 0n ? (
                    <ClaimRefundButton
                      campaign={campaign}
                      address={address}
                      sign={sign}
                      onRefresh={refreshAll}
                    />
                  ) : null}
                </div>
              ) : (
                <Button
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => void connect()}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <LoaderIcon className="h-4 w-4" />
                  ) : (
                    <WalletIcon className="h-4 w-4" />
                  )}
                  Connect wallet
                </Button>
              )}

              {isWrongNetwork ? (
                <p className="mt-3 rounded-lg bg-coral-50 px-3 py-2 text-[11px] leading-relaxed text-coral-800">
                  Switch Freighter to the app network before signing.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-care-100 bg-care-50/70 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-care-950">
                <LockIcon className="h-4 w-4" />
                How the escrow protects donors
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-care-900/80">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-care-600" />
                  Funds can only go to the patient or the named provider.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-care-600" />
                  Each release needs a verified invoice and verifier signature.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-care-600" />
                  If the goal fails, donors claim their contribution back.
                </li>
              </ul>
            </div>

            <div className="surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Campaign facts
              </p>
              <dl className="mt-3 space-y-2.5 text-xs">
                <FactRow label="Campaign ID" value={`#${campaign.id.toString()}`} mono />
                <FactRow label="Token" value={symbol} />
                <FactRow
                  label="Created"
                  value={new Date(Number(campaign.createdAt) * 1000).toLocaleDateString()}
                />
                <FactRow label="Status" value={campaign.status} />
              </dl>
            </div>
          </aside>
        </div>
      </div>

      <DonateDialog
        campaign={campaign}
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
        onSuccess={() => void refreshAll()}
      />
    </>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-ink-900">
        {value} <span className="text-[10px] font-semibold text-ink-400">{suffix}</span>
      </p>
    </div>
  );
}

function Segment({
  value,
  total,
  className,
  label,
}: {
  value: bigint;
  total: bigint;
  className: string;
  label: string;
}) {
  const percent = progressPercent(value, total);
  if (percent <= 0) return null;
  return (
    <div
      className={cn("h-full transition-all duration-700", className)}
      style={{ width: `${percent}%` }}
      title={`${label}: ${percent.toFixed(1)}%`}
    />
  );
}

function LedgerRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-ink-100 bg-white p-3">
      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", color)} />
      <div>
        <p className="text-[11px] text-ink-500">{label}</p>
        <p className="mt-0.5 text-xs font-bold text-ink-900">{value}</p>
      </div>
    </div>
  );
}

function RoleRow({
  label,
  address,
  current,
  contract = false,
  tokenLabel,
}: {
  label: string;
  address: string;
  current: boolean;
  contract?: boolean;
  tokenLabel?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </p>
        {current ? (
          <span className="rounded bg-care-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-care-800">
            You
          </span>
        ) : null}
      </div>
      <Link
        href={contract ? explorerContractUrl(address) : explorerAccountUrl(address)}
        target="_blank"
        rel="noreferrer"
        className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate font-mono text-[11px] text-ink-700 hover:text-care-700"
        title={address}
      >
        <span className="truncate">{tokenLabel ?? shortAddress(address, 6)}</span>
        <ExternalLinkIcon className="h-3 w-3 shrink-0" />
      </Link>
    </div>
  );
}

function FactRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className={cn("font-semibold text-ink-900", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

function ClaimRefundButton({
  campaign,
  address,
  sign,
  onRefresh,
}: {
  campaign: Campaign;
  address: string;
  sign: (xdr: string) => Promise<string>;
  onRefresh: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = async () => {
    setPending(true);
    setError(null);
    try {
      await claimRefund(campaign.id, address, sign);
      await onRefresh();
    } catch (cause) {
      setError(humanizeError(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <Button
        variant="danger"
        size="sm"
        className="w-full"
        onClick={() => void claim()}
        disabled={pending}
      >
        {pending ? <LoaderIcon className="h-4 w-4" /> : <RefreshIcon className="h-4 w-4" />}
        Claim refund
      </Button>
      {error ? <p className="mt-1.5 text-[11px] text-coral-700">{error}</p> : null}
    </div>
  );
}

function VerifierPanel({
  campaign,
  address,
  sign,
  onRefresh,
}: {
  campaign: Campaign;
  address: string | null;
  sign: (xdr: string) => Promise<string>;
  onRefresh: () => Promise<void>;
}) {
  const isVerifier = Boolean(address && address === campaign.verifier);
  const [invoiceId, setInvoiceId] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [lookup, setLookup] = useState<Invoice | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [recipient, setRecipient] = useState<"provider" | "patient">("provider");
  const [action, setAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    message: string;
    hash?: string;
  } | null>(null);
  const symbol = tokenSymbol(campaign.token);

  useEffect(() => {
    setLookup(null);
    if (!lookupId.trim()) return;

    let cancelled = false;
    setLookupLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await getInvoice(
          campaign.id,
          lookupId.trim(),
          READ_ACCOUNT || address || undefined,
        );
        if (!cancelled) setLookup(result);
      } catch {
        if (!cancelled) setLookup(null);
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [address, campaign.id, lookupId]);

  const run = async (
    key: string,
    fn: () => Promise<{ hash: string; message: string }>,
  ): Promise<boolean> => {
    setAction(key);
    setNotice(null);
    try {
      const result = await fn();
      setNotice({ kind: "success", message: result.message, hash: result.hash });
      await onRefresh();
      return true;
    } catch (cause) {
      setNotice({ kind: "error", message: humanizeError(cause) });
      return false;
    } finally {
      setAction(null);
    }
  };

  const handleVerify = async () => {
    if (!address) return;
    const verifiedId = invoiceId.trim();
    let amount: bigint;
    try {
      amount = toStroops(invoiceAmount);
    } catch {
      setNotice({ kind: "error", message: "Enter a valid invoice amount." });
      return;
    }
    if (!verifiedId) {
      setNotice({ kind: "error", message: "Enter the medical invoice ID." });
      return;
    }

    const ok = await run("verify", async () => {
      const result = await verifyInvoice(campaign.id, address, verifiedId, amount, sign);
      return {
        hash: result.hash,
        message: `Invoice ${verifiedId} verified for ${formatTokenAmount(amount)} ${symbol}.`,
      };
    });

    if (ok) {
      setInvoiceId("");
      setInvoiceAmount("");
      setLookupId(verifiedId);
    }
  };

  const handleRelease = async () => {
    if (!address) return;
    let amount: bigint;
    try {
      amount = toStroops(releaseAmount);
    } catch {
      setNotice({ kind: "error", message: "Enter a valid release amount." });
      return;
    }
    if (!lookup) {
      setNotice({
        kind: "error",
        message: "Look up a verified invoice before releasing funds.",
      });
      return;
    }

    const invoice = lookup;
    const remaining = invoice.amount - invoice.releasedAmount;
    if (amount > remaining) {
      setNotice({
        kind: "error",
        message: `Only ${formatTokenAmount(remaining)} ${symbol} remains on this invoice.`,
      });
      return;
    }

    const target = recipient === "provider" ? campaign.provider : campaign.patient;

    const ok = await run("release", async () => {
      const result = await releaseFunds(
        campaign.id,
        address,
        invoice.invoiceId,
        amount,
        target,
        sign,
      );
      return {
        hash: result.hash,
        message: `Released ${formatTokenAmount(amount)} ${symbol} to the ${
          recipient === "provider" ? "medical provider" : "patient"
        }.`,
      };
    });

    if (ok) {
      setReleaseAmount("");
      setLookup((current) =>
        current
          ? { ...current, releasedAmount: current.releasedAmount + amount }
          : current,
      );
    }
  };

  const handleRefund = async () => {
    if (!address) return;
    if (
      !window.confirm(
        "Open refunds for this campaign? Donors will be able to claim their full contribution back.",
      )
    ) {
      return;
    }

    await run("refund", async () => {
      const result = await refundCampaign(campaign.id, address, sign);
      return { hash: result.hash, message: "Refund mode is now open for donors." };
    });
  };

  const canRefund =
    campaign.status === "Active" && campaign.raisedAmount < campaign.targetAmount;

  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <ShieldIcon className="h-5 w-5 text-care-700" />
          <div>
            <h2 className="text-base font-bold tracking-tight text-ink-950">
              Invoice verification & release
            </h2>
            <p className="text-[11px] text-ink-500">
              Only the campaign verifier can sign these actions.
            </p>
          </div>
        </div>
        {isVerifier ? (
          <span className="rounded-full bg-care-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-care-800">
            Verifier
          </span>
        ) : (
          <span className="hidden rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-semibold text-ink-500 sm:inline">
            Read only
          </span>
        )}
      </div>

      <div className="p-6">
        {notice ? (
          <div
            className={cn(
              "mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs leading-relaxed",
              notice.kind === "success"
                ? "border-care-200 bg-care-50 text-care-900"
                : "border-coral-200 bg-coral-50 text-coral-800",
            )}
          >
            <div className="flex items-start gap-2">
              {notice.kind === "success" ? (
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                <p>{notice.message}</p>
                {notice.hash ? (
                  <Link
                    href={explorerTxUrl(notice.hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
                  >
                    View transaction
                    <ExternalLinkIcon className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="rounded p-0.5 hover:bg-black/5"
              aria-label="Dismiss"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {!isVerifier ? (
          <div className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-4 text-xs leading-relaxed text-ink-600">
            <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
            <p>
              The verifier{" "}
              <Link
                href={explorerAccountUrl(campaign.verifier)}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-semibold text-ink-800 hover:text-care-700"
              >
                {shortAddress(campaign.verifier, 6)}
              </Link>{" "}
              must approve a medical invoice before funds can move. Connect that wallet to
              operate this panel.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-ink-100 p-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-care-700" />
                <h3 className="text-sm font-bold text-ink-950">1. Verify a medical invoice</h3>
              </div>
              <div className="mt-3 space-y-3">
                <Field label="Invoice ID">
                  <Input
                    value={invoiceId}
                    onChange={(event) => setInvoiceId(event.target.value)}
                    placeholder="INV-2026-0042"
                    className="font-mono text-xs"
                  />
                </Field>
                <Field label="Invoice amount" hint={`Amount in ${symbol} units.`}>
                  <Input
                    inputMode="decimal"
                    value={invoiceAmount}
                    onChange={(event) =>
                      setInvoiceAmount(event.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="1800"
                  />
                </Field>
                <Button
                  className="w-full"
                  onClick={handleVerify}
                  disabled={action !== null}
                >
                  {action === "verify" ? (
                    <LoaderIcon className="h-4 w-4" />
                  ) : (
                    <CheckCircleIcon className="h-4 w-4" />
                  )}
                  Verify invoice
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-ink-100 p-4">
              <div className="flex items-center gap-2">
                <StethoscopeIcon className="h-4 w-4 text-care-700" />
                <h3 className="text-sm font-bold text-ink-950">2. Release escrow</h3>
              </div>
              <div className="mt-3 space-y-3">
                <Field
                  label="Verified invoice ID"
                  hint={
                    lookupLoading
                      ? "Looking up invoice..."
                      : lookup
                        ? `Verified ${formatTokenAmount(lookup.amount)} ${symbol}, ${formatTokenAmount(
                            lookup.amount - lookup.releasedAmount,
                          )} ${symbol} remaining.`
                        : "Enter an invoice ID to load its remaining balance."
                  }
                >
                  <Input
                    value={lookupId}
                    onChange={(event) => setLookupId(event.target.value)}
                    placeholder="INV-2026-0042"
                    className="font-mono text-xs"
                  />
                </Field>

                {lookup ? (
                  <div className="rounded-lg bg-care-50 px-3 py-2 text-[11px] text-care-900">
                    Invoice <span className="font-mono font-semibold">{lookup.invoiceId}</span>{" "}
                    is verified and eligible for release.
                  </div>
                ) : null}

                <Field label="Release amount">
                  <Input
                    inputMode="decimal"
                    value={releaseAmount}
                    onChange={(event) =>
                      setReleaseAmount(event.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="900"
                    disabled={!lookup}
                  />
                </Field>

                <div>
                  <p className="text-sm font-semibold text-ink-800">Recipient</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {(
                      [
                        ["provider", "Medical provider"],
                        ["patient", "Patient"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRecipient(value)}
                        className={cn(
                          "h-10 rounded-lg border px-2 text-xs font-semibold transition",
                          recipient === value
                            ? "border-care-400 bg-care-50 text-care-800"
                            : "border-ink-200 bg-white text-ink-600 hover:border-care-200",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleRelease}
                  disabled={action !== null || !lookup}
                >
                  {action === "release" ? (
                    <LoaderIcon className="h-4 w-4" />
                  ) : (
                    <LockIcon className="h-4 w-4" />
                  )}
                  Release funds
                </Button>
              </div>
            </div>

            {canRefund ? (
              <div className="rounded-xl border border-coral-200 bg-coral-50/50 p-4 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-coral-900">Open donor refunds</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-coral-800/80">
                      Available only while the campaign is active and below its target. This
                      is irreversible and stops new donations.
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleRefund}
                    disabled={action !== null}
                  >
                    {action === "refund" ? (
                      <LoaderIcon className="h-4 w-4" />
                    ) : (
                      <RefreshIcon className="h-4 w-4" />
                    )}
                    Open refunds
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function CampaignError({ message }: { message: string }) {
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-coral-50 text-coral-600">
        <AlertIcon className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-ink-950">Unable to open campaign</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-600">{message}</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          Back to campaigns
        </Link>
        <Link href="/campaigns/new" className={buttonClasses()}>
          Start a campaign
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function CampaignDetailSkeleton() {
  return (
    <div className="container-page animate-pulse py-8">
      <div className="h-3 w-40 rounded bg-ink-100" />
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="surface space-y-4 p-8">
            <div className="flex gap-2">
              <div className="h-6 w-32 rounded-full bg-ink-100" />
              <div className="h-6 w-20 rounded-full bg-ink-100" />
            </div>
            <div className="h-9 w-3/4 rounded bg-ink-100" />
            <div className="h-3 w-48 rounded bg-ink-100" />
            <div className="h-3 w-full rounded bg-ink-100" />
            <div className="h-3 w-5/6 rounded bg-ink-100" />
            <div className="mt-6 h-40 rounded-2xl bg-ink-100" />
          </div>
          <div className="surface h-64 bg-ink-100/60" />
        </div>
        <div className="space-y-4">
          <div className="surface h-64 bg-ink-100/60" />
          <div className="surface h-40 bg-ink-100/60" />
        </div>
      </div>
    </div>
  );
}
