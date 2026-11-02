import { cn } from "@/lib/cn";
import type { CampaignStatus } from "@/lib/types";

const styles: Record<CampaignStatus, string> = {
  Active: "bg-care-100 text-care-800 ring-care-200",
  Completed: "bg-blue-50 text-blue-700 ring-blue-200",
  Refunded: "bg-coral-50 text-coral-700 ring-coral-200",
};

const labels: Record<CampaignStatus, string> = {
  Active: "Accepting donations",
  Completed: "Fully funded",
  Refunded: "Refunds open",
};

export function StatusBadge({
  status,
  compact = false,
  className,
}: {
  status: CampaignStatus;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        styles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {compact ? status : labels[status]}
    </span>
  );
}
