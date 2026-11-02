import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-care-700 text-white shadow-sm hover:bg-care-800 focus-visible:outline-care-700 disabled:bg-care-700/50",
  secondary:
    "bg-white text-ink-900 border border-ink-200 shadow-sm hover:border-care-300 hover:bg-care-50 focus-visible:outline-care-700",
  ghost: "text-ink-700 hover:bg-ink-100 focus-visible:outline-care-700",
  danger:
    "bg-coral-600 text-white shadow-sm hover:bg-coral-700 focus-visible:outline-coral-600 disabled:bg-coral-600/50",
  outline:
    "border border-care-200 bg-care-50/60 text-care-800 hover:bg-care-100 focus-visible:outline-care-700",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-[15px] rounded-xl gap-2",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
});
