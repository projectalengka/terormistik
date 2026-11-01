import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "muted" | "outline" | "success" | "warn";
  className?: string;
}) {
  const tones = {
    neutral: "bg-white/[0.045] text-[#C9BFAF] border-line",
    accent: "bg-accent/15 text-[#E2A3A3] border-[#5A2B2B]",
    muted: "bg-transparent text-faint border-line",
    outline: "bg-transparent text-muted border-line",
    success: "bg-[#1F3A2B]/60 text-[#9FC7A9] border-[#2F4E3B]",
    warn: "bg-[#3A2F1F]/60 text-[#D6B98A] border-[#4E3F2A]",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.13em]",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent",
        className
      )}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[4px] bg-white/[0.035]", className)}>
      <div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent"
        style={{ animation: "shimmer 1.8s infinite" }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[5px] border border-dashed border-line px-6 py-14 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-white/[0.02] text-muted">
          {icon}
        </div>
      )}
      <p className="font-serif text-xl text-parchment">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="font-serif text-[26px] leading-tight text-parchment sm:text-[30px]">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  tone = "accent",
}: {
  value: number;
  className?: string;
  tone?: "accent" | "muted";
}) {
  return (
    <div className={cn("h-[2px] w-full overflow-hidden rounded-full bg-white/[0.07]", className)}>
      <div
        className={cn(
          "h-full transition-[width] duration-300 ease-out",
          tone === "accent" ? "bg-accent" : "bg-[#8A8073]"
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("hairline my-6", className)} />;
}
