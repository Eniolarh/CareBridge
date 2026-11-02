import Link from "next/link";
import { PulseIcon } from "./icons";
import { cn } from "@/lib/cn";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-care-700"
      aria-label="CareBridge home"
    >
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-care-800 text-white shadow-sm transition-transform group-hover:-rotate-3">
        <PulseIcon className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-coral-400" />
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-bold tracking-tight text-ink-950">CareBridge</span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-care-700">
            On Stellar
          </span>
        </span>
      ) : null}
    </Link>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 place-items-center rounded-xl bg-care-800 text-white shadow-sm",
        className,
      )}
    >
      <PulseIcon className="h-5 w-5" />
    </span>
  );
}
