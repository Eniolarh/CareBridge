import { cn } from "@/lib/cn";
import { progressPercent } from "@/lib/format";

const tones = {
  care: "from-care-600 via-care-500 to-care-400",
  coral: "from-coral-600 via-coral-500 to-coral-400",
  blue: "from-blue-600 via-blue-500 to-sky-400",
} as const;

export function ProgressBar({
  raised,
  target,
  tone = "care",
  className,
}: {
  raised: bigint;
  target: bigint;
  tone?: keyof typeof tones;
  className?: string;
}) {
  const percent = progressPercent(raised, target);

  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-ink-100", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <div
        className={cn(
          "relative h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
          tones[tone],
        )}
        style={{ width: `${percent}%` }}
      >
        {percent > 3 ? (
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute inset-y-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
