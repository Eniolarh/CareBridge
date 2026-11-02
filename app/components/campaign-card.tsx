import Link from "next/link";
import type { Campaign } from "@/lib/types";
import {
  formatTokenAmount,
  progressPercent,
  shortAddress,
  timeAgo,
} from "@/lib/format";
import { tokenSymbol } from "@/lib/tokens";
import { cn } from "@/lib/cn";
import { StatusBadge } from "./status-badge";
import { ProgressBar } from "./progress-bar";
import {
  ArrowRightIcon,
  HeartIcon,
  StethoscopeIcon,
  UsersIcon,
} from "./icons";

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const percent = progressPercent(campaign.raisedAmount, campaign.targetAmount);
  const symbol = tokenSymbol(campaign.token);
  const remaining = campaign.targetAmount - campaign.raisedAmount;

  return (
    <Link
      href={`/campaigns/${campaign.id.toString()}`}
      className="group surface relative flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-care-200 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care-700"
    >
      <div
        className={cn(
          "h-1.5 w-full bg-gradient-to-r",
          campaign.status === "Refunded"
            ? "from-coral-500 to-coral-300"
            : campaign.status === "Completed"
              ? "from-blue-500 to-sky-300"
              : "from-care-700 via-care-500 to-care-300",
        )}
      />

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-care-50 text-care-700 ring-1 ring-care-100">
              <StethoscopeIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Patient
              </p>
              <p className="font-mono text-xs font-semibold text-ink-800">
                {campaign.patientId || shortAddress(campaign.patient)}
              </p>
            </div>
          </div>
          <StatusBadge status={campaign.status} compact />
        </div>

        <h3 className="mt-4 line-clamp-2 text-lg font-bold leading-snug tracking-tight text-ink-950">
          {campaign.title || "Medical funding campaign"}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-600">
          {campaign.description || "Support this verified patient's treatment escrow."}
        </p>

        <div className="mt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xl font-bold tracking-tight text-ink-950">
                {formatTokenAmount(campaign.raisedAmount)}{" "}
                <span className="text-sm font-semibold text-ink-500">{symbol}</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                of {formatTokenAmount(campaign.targetAmount)} {symbol} goal
              </p>
            </div>
            <span className="rounded-full bg-care-50 px-2.5 py-1 text-xs font-bold text-care-800">
              {percent.toFixed(percent >= 10 ? 0 : 1)}%
            </span>
          </div>
          <ProgressBar
            raised={campaign.raisedAmount}
            target={campaign.targetAmount}
            tone={campaign.status === "Refunded" ? "coral" : campaign.status === "Completed" ? "blue" : "care"}
            className="mt-3"
          />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <HeartIcon className="h-3.5 w-3.5 text-coral-500" />
            {campaign.status === "Active"
              ? `${formatTokenAmount(remaining)} ${symbol} to go`
              : campaign.status === "Completed"
                ? "Target reached"
                : "Donor refunds available"}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-care-700 transition group-hover:gap-2">
            {timeAgo(campaign.createdAt)}
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CampaignCardSkeleton() {
  return (
    <div className="surface animate-pulse overflow-hidden">
      <div className="h-1.5 w-full bg-ink-100" />
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-ink-100" />
            <div className="space-y-1.5">
              <div className="h-2 w-12 rounded bg-ink-100" />
              <div className="h-3 w-24 rounded bg-ink-100" />
            </div>
          </div>
          <div className="h-6 w-20 rounded-full bg-ink-100" />
        </div>
        <div className="h-5 w-4/5 rounded bg-ink-100" />
        <div className="h-3 w-full rounded bg-ink-100" />
        <div className="h-3 w-2/3 rounded bg-ink-100" />
        <div className="h-2.5 w-full rounded-full bg-ink-100" />
        <div className="flex justify-between border-t border-ink-100 pt-4">
          <div className="h-3 w-24 rounded bg-ink-100" />
          <div className="h-3 w-16 rounded bg-ink-100" />
        </div>
      </div>
    </div>
  );
}

export function EmptyCampaigns() {
  return (
    <div className="surface flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-care-50 text-care-700">
        <UsersIcon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-ink-950">No campaigns yet</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-600">
        Be the first to open a verified medical escrow. Patients can create a campaign and
        invite an independent verifier in a few clicks.
      </p>
      <Link
        href="/campaigns/new"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-care-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-care-800"
      >
        Start a campaign
        <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}
