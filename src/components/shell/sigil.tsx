import { cn } from "@/lib/utils";

export function Sigil({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-5 w-5", className)}
      aria-hidden
    >
      <path
        d="M2.4 12C5.6 6.9 9 5 12 5s6.4 1.9 9.6 7c-3.2 5.1-6.6 7-9.6 7s-6.4-1.9-9.6-7Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M12 8.6v6.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-line bg-white/[0.02] text-parchment">
        <Sigil />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-serif text-[15px] tracking-[0.26em] text-parchment">
            TEROR
          </span>
          <span className="mt-[3px] block font-serif text-[15px] tracking-[0.26em] text-accent-soft">
            MISTIK
          </span>
        </span>
      )}
    </div>
  );
}
