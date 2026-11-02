"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCampaigns } from "@/lib/hooks/use-campaigns";
import { formatCompactAmount, formatTokenAmount, progressPercent } from "@/lib/format";
import type { CampaignStatus } from "@/lib/types";
import { CampaignCard, CampaignCardSkeleton, EmptyCampaigns } from "@/components/campaign-card";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { buttonClasses } from "@/components/ui/button";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  HeartIcon,
  LockIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  SparkleIcon,
  StethoscopeIcon,
  WalletIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";

type Filter = "All" | CampaignStatus;

const FILTERS: Filter[] = ["All", "Active", "Completed", "Refunded"];

export default function HomePage() {
  const { campaigns, loading, error } = useCampaigns();
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      const matchesFilter = filter === "All" || campaign.status === filter;
      const matchesQuery =
        !normalized ||
        campaign.title.toLowerCase().includes(normalized) ||
        campaign.patientId.toLowerCase().includes(normalized) ||
        campaign.description.toLowerCase().includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [campaigns, filter, query]);

  const stats = useMemo(() => {
    let raised = 0n;
    let released = 0n;
    let active = 0;
    const patients = new Set<string>();

    for (const campaign of campaigns) {
      raised += campaign.raisedAmount;
      released += campaign.releasedAmount;
      if (campaign.status === "Active") active += 1;
      patients.add(campaign.patientId || campaign.patient);
    }

    return { raised, released, active, patients: patients.size };
  }, [campaigns]);

  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] grid-fade opacity-70" />
        <div className="container-page grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-care-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-care-800 shadow-sm">
              <SparkleIcon className="h-3.5 w-3.5" />
              Transparent care, programmable on Stellar
            </span>
            <h1 className="mt-5 max-w-2xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-950 sm:text-5xl lg:text-6xl">
              Fund a patient.
              <br />
              <span className="bg-gradient-to-r from-care-800 via-care-600 to-care-400 bg-clip-text text-transparent">
                Release against proof.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg">
              CareBridge is a humanitarian crowdfunding escrow. Donors fund verified patient
              campaigns, and funds unlock only when an independent verifier approves a real
              medical invoice.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="#campaigns" className={buttonClasses({ size: "lg" })}>
                <HeartIcon className="h-4 w-4" />
                Support a patient
              </Link>
              <Link
                href="/campaigns/new"
                className={buttonClasses({ variant: "secondary", size: "lg" })}
              >
                <PlusIcon className="h-4 w-4" />
                Start a campaign
              </Link>
            </div>

            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-ink-200/70 pt-6">
              <Stat label="Active campaigns" value={loading ? "—" : String(stats.active)} />
              <Stat label="Patients supported" value={loading ? "—" : String(stats.patients)} />
              <Stat
                label="Released to care"
                value={
                  loading
                    ? "—"
                    : `${formatCompactAmount(stats.released)}`
                }
                suffix="token units"
              />
            </dl>
          </div>

          <HeroVisual />
        </div>
      </section>

      {error ? (
        <div className="container-page">
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm text-coral-800">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Could not load campaigns</p>
              <p className="mt-0.5 text-coral-700">{error}</p>
            </div>
          </div>
        </div>
      ) : null}

      <section id="campaigns" className="container-page scroll-mt-24">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Live campaigns</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
              Verified patients, open escrows
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
              Every campaign has a named medical provider and an independent verifier. Progress
              is read directly from the Soroban contract.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient or campaign"
              className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3.5 text-sm text-ink-900 shadow-sm outline-none transition placeholder:text-ink-400 focus:border-care-400 focus:ring-4 focus:ring-care-100"
              aria-label="Search campaigns"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => {
            const count =
              item === "All"
                ? campaigns.length
                : campaigns.filter((campaign) => campaign.status === item).length;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition",
                  filter === item
                    ? "border-care-700 bg-care-700 text-white shadow-sm"
                    : "border-ink-200 bg-white text-ink-600 hover:border-care-200 hover:bg-care-50",
                )}
              >
                {item}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    filter === item ? "bg-white/15 text-white" : "bg-ink-100 text-ink-500",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-7">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <CampaignCardSkeleton key={key} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyCampaigns />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((campaign) => (
                <CampaignCard key={campaign.id.toString()} campaign={campaign} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="how-it-works" className="container-page scroll-mt-24 pt-24">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
            Escrow that follows the medical proof
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            CareBridge separates the people who need help, the donors, the medical provider and
            the verifier. No single party can move funds alone.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              step: "01",
              icon: StethoscopeIcon,
              title: "Open a verified campaign",
              body: "A patient names their medical provider and an independent verifier, sets a target, and locks the campaign rules on-chain.",
            },
            {
              step: "02",
              icon: HeartIcon,
              title: "Donors fund the escrow",
              body: "Supporters contribute XLM or USDC. The contract holds every donation — the platform never gets custody of funds.",
            },
            {
              step: "03",
              icon: CheckCircleIcon,
              title: "Release against invoices",
              body: "The verifier approves a medical invoice, then releases exactly that amount to the provider or patient.",
            },
          ].map((item) => (
            <div key={item.step} className="surface relative p-6">
              <span className="absolute right-5 top-5 font-mono text-xs font-bold text-ink-300">
                {item.step}
              </span>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-care-50 text-care-700 ring-1 ring-care-100">
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-ink-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="transparency" className="container-page scroll-mt-24 pt-24">
        <div className="overflow-hidden rounded-3xl border border-care-800/10 bg-care-950 text-white shadow-lift">
          <div className="grid gap-10 p-8 sm:p-10 lg:grid-cols-[1fr_0.9fr] lg:p-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-care-100">
                <ShieldIcon className="h-3.5 w-3.5" />
                On-chain transparency
              </span>
              <h2 className="mt-5 max-w-lg text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Every donation and release is auditable.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-care-100/80">
                Funding totals, escrow balances, verified invoices and refunds live in Soroban
                contract storage. The dashboard reads them directly from Stellar testnet — no
                hidden spreadsheets, no opaque intermediary.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <TransparencyItem icon={LockIcon} label="Non-custodial escrow" />
                <TransparencyItem icon={CheckCircleIcon} label="Invoice-gated releases" />
                <TransparencyItem icon={WalletIcon} label="Freighter signing" />
                <TransparencyItem icon={ShieldIcon} label="Independent verifier" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-care-200/70">
                  Escrow snapshot
                </p>
                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                  Live contract
                </span>
              </div>
              <div className="mt-5 space-y-4">
                <SnapshotRow
                  label="Raised across campaigns"
                  value={loading ? "—" : formatTokenAmount(stats.raised)}
                />
                <SnapshotRow
                  label="Released to care"
                  value={loading ? "—" : formatTokenAmount(stats.released)}
                />
                <SnapshotRow
                  label="Open campaigns"
                  value={loading ? "—" : String(stats.active)}
                />
              </div>
              <div className="mt-6 rounded-xl border border-white/10 bg-care-900/60 p-4 font-mono text-[11px] leading-relaxed text-care-100/70">
                <p>
                  <span className="text-care-300">donate</span>(campaign_id, donor, amount)
                </p>
                <p className="mt-1">
                  <span className="text-care-300">verify_invoice</span>(campaign_id, invoice_id,
                  amount)
                </p>
                <p className="mt-1">
                  <span className="text-care-300">release_funds</span>(...recipient)
                </p>
                <p className="mt-3 text-care-200/40">
                  All state transitions emit Soroban events.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pt-20">
        <div className="surface flex flex-col items-start justify-between gap-6 p-7 sm:flex-row sm:items-center sm:p-9">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink-950 sm:text-2xl">
              Need help funding care?
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-600">
              Open a campaign with your provider and a trusted verifier. Supporters can start
              contributing in under a minute.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/campaigns/new"
              className={buttonClasses({ variant: "primary", size: "lg" })}
            >
              Start a campaign
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="#campaigns"
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              Browse campaigns
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold tracking-tight text-ink-950">
        {value}
        {suffix ? (
          <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-ink-400">
            {suffix}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function HeroVisual() {
  const demoPercent = progressPercent(7_400n * 10_000_000n, 12_000n * 10_000_000n);

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute -left-6 top-10 hidden h-24 w-24 rounded-3xl bg-care-200/40 blur-2xl sm:block" />
      <div className="absolute -right-4 bottom-8 hidden h-32 w-32 rounded-full bg-coral-200/30 blur-3xl sm:block" />

      <div className="surface relative overflow-hidden p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-care-700 text-white">
              <StethoscopeIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                Campaign #24
              </p>
              <p className="text-sm font-bold text-ink-950">Cardiac surgery escrow</p>
            </div>
          </div>
          <StatusBadge status="Active" compact />
        </div>

        <div className="mt-5 rounded-2xl bg-gradient-to-br from-care-50 to-white p-4 ring-1 ring-care-100">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-care-700">
                Raised
              </p>
              <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink-950">
                7,400 <span className="text-sm font-semibold text-ink-500">USDC</span>
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-care-800 shadow-sm">
              {demoPercent.toFixed(0)}%
            </span>
          </div>
          <ProgressBar
            raised={7_400n * 10_000_000n}
            target={12_000n * 10_000_000n}
            className="mt-3"
          />
          <p className="mt-2 text-[11px] text-ink-500">Goal 12,000 USDC · Provider verified</p>
        </div>

        <div className="mt-4 space-y-2.5">
          <FlowRow
            icon={HeartIcon}
            label="Donation received"
            detail="+250 USDC · just now"
            tone="care"
          />
          <FlowRow
            icon={CheckCircleIcon}
            label="Invoice INV-2291 verified"
            detail="Cardiology · 1,800 USDC"
            tone="blue"
          />
          <FlowRow
            icon={LockIcon}
            label="Escrow released to provider"
            detail="1,800 USDC · on-chain"
            tone="coral"
          />
        </div>
      </div>

      <div className="absolute -bottom-6 -left-4 hidden w-52 rotate-[-3deg] rounded-2xl border border-ink-100 bg-white p-4 shadow-lift sm:block">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-care-800">
          <ShieldIcon className="h-4 w-4" />
          Verifier approved
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">
          Funds cannot move without a matching medical invoice.
        </p>
      </div>
    </div>
  );
}

function FlowRow({
  icon: Icon,
  label,
  detail,
  tone,
}: {
  icon: typeof HeartIcon;
  label: string;
  detail: string;
  tone: "care" | "blue" | "coral";
}) {
  const tones = {
    care: "bg-care-50 text-care-700",
    blue: "bg-blue-50 text-blue-600",
    coral: "bg-coral-50 text-coral-600",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-3 py-2.5">
      <span className={cn("grid h-8 w-8 place-items-center rounded-lg", tones[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-ink-800">{label}</p>
        <p className="truncate text-[11px] text-ink-500">{detail}</p>
      </div>
    </div>
  );
}

function TransparencyItem({
  icon: Icon,
  label,
}: {
  icon: typeof LockIcon;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-care-50">
      <Icon className="h-4 w-4 text-care-300" />
      {label}
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-sm last:border-0 last:pb-0">
      <span className="text-care-100/70">{label}</span>
      <span className="font-mono text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
