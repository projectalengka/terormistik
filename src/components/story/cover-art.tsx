import { cn } from "@/lib/utils";
import type { StoryGenre } from "@/lib/types";
import { Sigil } from "@/components/shell/sigil";

const TINTS: Record<StoryGenre, string> = {
  horor: "#6B2323",
  misteri: "#34344F",
  supernatural: "#2C4348",
  thriller: "#4A3320",
  psychological: "#3C2E42",
  "urban-legend": "#43402A",
  folklore: "#3E3324",
  cosmic: "#22303F",
  "true-horror": "#4A2A24",
  "dark-fantasy": "#2F2A44",
};

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function CoverArt({
  title,
  genre,
  coverUrl,
  className,
  compact = false,
}: {
  title: string;
  genre: StoryGenre;
  coverUrl?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const tint = TINTS[genre] ?? "#3A3038";
  const seed = hash(title || "tanpa-judul");
  const angle = 120 + (seed % 60);

  if (coverUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-void", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt={title} className="h-full w-full object-cover" loading="lazy" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden border border-line/70 bg-void", className)}
      style={{
        backgroundImage: `radial-gradient(115% 78% at ${18 + (seed % 52)}% ${12 + (seed % 42)}%, ${tint} 0%, rgba(16,16,20,0.97) 64%), linear-gradient(${angle}deg, rgba(255,255,255,0.03), transparent 55%)`,
      }}
    >
      <div className="pointer-events-none absolute inset-[7px] border border-white/[0.06]" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <Sigil
          className={cn("text-white/[0.16]", compact ? "h-4 w-4" : "h-8 w-8")}
        />
        {!compact && <span className="h-[1px] w-6 bg-accent/50" />}
      </div>

      <span className="absolute bottom-3 left-1/2 h-[1px] w-4 -translate-x-1/2 bg-white/10" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
