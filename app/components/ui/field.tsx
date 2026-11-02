import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const inputClasses =
  "h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 shadow-sm outline-none transition placeholder:text-ink-400 focus:border-care-400 focus:ring-4 focus:ring-care-100 disabled:bg-ink-50 disabled:text-ink-500";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        inputClasses,
        "min-h-[104px] h-auto resize-y py-3 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-ink-800">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs font-medium text-coral-700">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-ink-500">{hint}</span>
      ) : null}
    </label>
  );
}
