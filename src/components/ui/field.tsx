import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  children,
  hint,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { hint?: string }) {
  return (
    <label
      className={cn("flex items-baseline justify-between gap-3 pb-1.5", className)}
      {...props}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
        {children}
      </span>
      {hint && <span className="text-[10.5px] text-faint">{hint}</span>}
    </label>
  );
}

const fieldBase =
  "w-full rounded-[4px] border border-line bg-[#14141A] px-3.5 py-2.5 text-[13.5px] text-parchment transition-colors duration-200 placeholder:text-faint hover:border-line-strong focus:border-[#5C4A45] focus:bg-[#16161C] focus:outline-none focus:ring-0 disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />;
  }
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, "resize-y leading-relaxed", className)} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          fieldBase,
          "h-10 appearance-none pr-9 [&>option]:bg-[#19191F] [&>option]:text-parchment",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-faint"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </div>
  );
});

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {label && <Label hint={hint}>{label}</Label>}
      {children}
      {error && <p className="pt-1.5 text-[11.5px] text-[#D98A8A]">{error}</p>}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-full border transition-colors duration-200",
        checked ? "border-accent bg-accent/80" : "border-line bg-surface-2"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-[15px] w-[15px] -translate-y-1/2 rounded-full bg-parchment transition-all duration-200",
          checked ? "left-[19px]" : "left-[3px] opacity-70"
        )}
      />
    </button>
  );
}
