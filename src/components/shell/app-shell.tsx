"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  AudioLines,
  Cpu,
  Image as ImageIcon,
  LayoutDashboard,
  Library,
  LogOut,
  Mic,
  MoreHorizontal,
  PenLine,
  Plus,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";
import { Wordmark, Sigil } from "./sigil";
import { Badge } from "@/components/ui/feedback";

const GROUPS = [
  {
    label: "Ruang Kerja",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/capture", label: "Quick Capture", icon: Mic },
      { href: "/studio", label: "AI Writing Studio", icon: PenLine },
      { href: "/transcription", label: "Transcription Center", icon: AudioLines },
    ],
  },
  {
    label: "Perpustakaan",
    items: [
      { href: "/library", label: "My Library", icon: Library },
      { href: "/cover", label: "Cover Generator", icon: ImageIcon },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/settings/ai", label: "AI Settings", icon: Cpu },
      { href: "/backup", label: "Archive & Backup", icon: Archive },
      { href: "/settings/account", label: "Account", icon: User },
    ],
  },
];

const MOBILE_PRIMARY = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/capture", label: "Capture", icon: Mic },
  { href: "/studio", label: "Studio", icon: PenLine },
  { href: "/library", label: "Library", icon: Library },
];

const MOBILE_MORE = [
  { href: "/transcription", label: "Transcription Center", icon: AudioLines },
  { href: "/cover", label: "Cover Generator", icon: ImageIcon },
  { href: "/settings/ai", label: "AI Settings", icon: Cpu },
  { href: "/backup", label: "Archive & Backup", icon: Archive },
  { href: "/settings/account", label: "Account Settings", icon: User },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/capture": "Quick Capture",
  "/studio": "AI Writing Studio",
  "/transcription": "Transcription Center",
  "/library": "My Library",
  "/cover": "Cover Generator",
  "/settings/ai": "AI Settings",
  "/settings/account": "Account Settings",
  "/backup": "Archive & Backup",
};

function useSectionTitle(pathname: string) {
  if (pathname.startsWith("/studio/")) return "Story Editor";
  if (pathname.startsWith("/library/")) return "Reading Mode";
  return TITLES[pathname] ?? "TEROR MISTIK";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, mode, signOut } = useData();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const title = useSectionTitle(pathname);

  React.useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  const displayName = profile?.pen_name?.trim() || profile?.display_name?.trim() || "Penulis";

  return (
    <div className="min-h-screen bg-base">
      {/* ——— Desktop sidebar ——— */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-line bg-[#0D0D11] lg:flex">
        <div className="px-6 pb-6 pt-7">
          <Link href="/dashboard" className="block">
            <Wordmark />
          </Link>
          <p className="mt-4 text-[10px] uppercase tracking-[0.24em] text-faint">
            Horror Writing Studio
          </p>
        </div>

        <div className="mx-6 h-px bg-line/70" />

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="px-3 pb-2 text-[9.5px] font-medium uppercase tracking-[0.24em] text-[#6B6357]">
                {group.label}
              </p>
              <ul className="space-y-[2px]">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-[3px] px-3 py-[9px] text-[13px] transition-colors duration-200",
                          active
                            ? "bg-white/[0.045] text-parchment"
                            : "text-[#8F8678] hover:bg-white/[0.025] hover:text-[#C9BFAF]"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent transition-opacity",
                            active ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <item.icon
                          className={cn(
                            "h-[15px] w-[15px] shrink-0 transition-colors",
                            active ? "text-accent-soft" : "text-[#6B6458] group-hover:text-[#A79C8C]"
                          )}
                          strokeWidth={1.6}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-4">
          <Link
            href="/studio"
            className="mb-4 flex h-10 items-center justify-center gap-2 rounded-[3px] border border-[#4A2626] bg-[#1C1416] text-[12.5px] text-[#D8A9A9] transition-colors hover:border-accent hover:bg-[#241619] hover:text-[#EFCACA]"
          >
            <Plus className="h-3.5 w-3.5" />
            Cerita Baru
          </Link>

          <div className="flex items-center gap-3 px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface font-serif text-[13px] text-parchment">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] text-parchment">{displayName}</p>
              <p className="truncate text-[10px] uppercase tracking-[0.14em] text-faint">
                {mode === "supabase" ? "Supabase · Private" : "Mode Lokal"}
              </p>
            </div>
            {mode === "supabase" && (
              <button
                onClick={() => void signOut()}
                aria-label="Keluar"
                title="Keluar"
                className="rounded-[3px] p-1.5 text-faint transition-colors hover:bg-white/5 hover:text-[#D98A8A]"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ——— Mobile header ——— */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-base/90 px-4 backdrop-blur-md lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Sigil className="h-[18px] w-[18px] text-accent-soft" />
          <span className="font-serif text-[13px] tracking-[0.24em] text-parchment">
            {title.toUpperCase()}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              mode === "supabase" ? "bg-[#6FA37F]" : "bg-[#8A7B4F]"
            )}
            title={mode === "supabase" ? "Terhubung Supabase" : "Mode lokal"}
          />
          <Link
            href="/capture"
            aria-label="Quick Capture"
            className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-line text-muted"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* ——— Content ——— */}
      <main className="lg:pl-[264px]">
        <div
          key={pathname}
          className="mx-auto w-full max-w-[1180px] animate-[page-fade_0.4s_ease-out_both] px-4 pb-[92px] pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pb-16 lg:pt-10"
        >
          {children}
        </div>
      </main>

      {/* ——— Mobile bottom navigation ——— */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#0D0D11]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
        <ul className="grid h-[62px] grid-cols-5">
          {MOBILE_PRIMARY.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1.5 transition-colors",
                    active ? "text-parchment" : "text-[#6E675B]"
                  )}
                >
                  <item.icon
                    className={cn("h-[18px] w-[18px]", active && "text-accent-soft")}
                    strokeWidth={1.6}
                  />
                  <span className="text-[9.5px] uppercase tracking-[0.1em]">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-1.5 transition-colors",
                moreOpen ? "text-parchment" : "text-[#6E675B]"
              )}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.6} />
              <span className="text-[9.5px] uppercase tracking-[0.1em]">Lainnya</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* ——— Mobile "more" sheet ——— */}
      {moreOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 animate-[fade-up_0.28s_cubic-bezier(0.16,1,0.3,1)_both] rounded-t-[10px] border-t border-line bg-[#14141A] pb-[calc(72px+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="eyebrow">Menu</p>
                <p className="mt-1 font-serif text-lg text-parchment">{displayName}</p>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Tutup menu"
                className="p-2 text-faint"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="px-2 py-3">
              {MOBILE_MORE.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-[3px] px-4 py-3 text-[13.5px] text-[#C9BFAF] transition-colors hover:bg-white/[0.04]"
                  >
                    <item.icon className="h-4 w-4 text-[#6B6458]" strokeWidth={1.6} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-line px-5 py-3">
              <Badge tone={mode === "supabase" ? "success" : "warn"}>
                {mode === "supabase" ? "Supabase" : "Mode Lokal"}
              </Badge>
              {mode === "supabase" && (
                <button
                  onClick={() => void signOut()}
                  className="flex items-center gap-2 text-[12px] text-[#D98A8A]"
                >
                  <LogOut className="h-3.5 w-3.5" /> Keluar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
