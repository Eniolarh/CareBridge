export const STROOPS_PER_UNIT = 10_000_000n;

export function toStroops(value: string, decimals = 7): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter a positive amount");
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const padded = fraction.padEnd(decimals, "0").slice(0, decimals);
  const amount = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");

  if (amount <= 0n) {
    throw new Error("Amount must be greater than zero");
  }

  return amount;
}

export function fromStroops(value: bigint, decimals = 7): number {
  return Number(value) / 10 ** decimals;
}

export function formatTokenAmount(value: bigint, maximumFractionDigits = 2): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / STROOPS_PER_UNIT;
  const fraction = absolute % STROOPS_PER_UNIT;

  const wholeText = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(whole);

  let fractionText = fraction.toString().padStart(7, "0");
  if (maximumFractionDigits === 0) {
    fractionText = "";
  } else {
    fractionText = fractionText.slice(0, maximumFractionDigits).replace(/0+$/, "");
  }

  return `${negative ? "-" : ""}${wholeText}${fractionText ? `.${fractionText}` : ""}`;
}

export function formatInputAmount(value: bigint, decimals = 7): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

export function formatCompactAmount(value: bigint): string {
  const numeric = fromStroops(value);
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numeric);
}

export function progressPercent(raised: bigint, target: bigint): number {
  if (target <= 0n) return 0;
  const basisPoints = (raised * 10_000n) / target;
  return Math.min(100, Number(basisPoints) / 100);
}

export function shortAddress(address: string, visible = 4): string {
  if (!address) return "";
  if (address.length <= visible * 2 + 3) return address;
  return `${address.slice(0, visible)}...${address.slice(-visible)}`;
}

export function timeAgo(timestamp: bigint): string {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return "";

  const delta = Math.max(0, Date.now() / 1000 - seconds);
  if (delta < 60) return "just now";
  if (delta < 3_600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86_400) return `${Math.floor(delta / 3_600)}h ago`;
  if (delta < 2_592_000) return `${Math.floor(delta / 86_400)}d ago`;

  return new Date(seconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function tokensEqual(a: string, b: string): boolean {
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}
