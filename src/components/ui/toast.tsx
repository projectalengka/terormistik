"use client";

import * as React from "react";
import { Check, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const push = React.useCallback((tone: ToastTone, message: string) => {
    const id = ++counter.current;
    setItems((prev) => [...prev.slice(-2), { id, tone, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 4600);
  }, []);

  const api = React.useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[86px] z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[5px] border px-4 py-3 text-[13px] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] animate-[fade-up_0.25s_ease-out_both]",
              item.tone === "success" && "border-[#2F4E3B] bg-[#182219] text-[#C6DCC9]",
              item.tone === "error" && "border-[#5A2B2B] bg-[#221618] text-[#E7BFBF]",
              item.tone === "info" && "border-line bg-[#1A1A21] text-parchment"
            )}
          >
            <span className="mt-[1px] shrink-0">
              {item.tone === "success" && <Check className="h-4 w-4" />}
              {item.tone === "error" && <TriangleAlert className="h-4 w-4" />}
              {item.tone === "info" && <Info className="h-4 w-4" />}
            </span>
            <p className="flex-1 leading-relaxed">{item.message}</p>
            <button
              onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
              className="shrink-0 opacity-50 transition-opacity hover:opacity-100"
              aria-label="Tutup notifikasi"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      success: (m) => console.log(m),
      error: (m) => console.error(m),
      info: (m) => console.log(m),
    };
  }
  return ctx;
}
