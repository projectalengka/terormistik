"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full animate-[fade-up_0.28s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-t-[8px] border border-line bg-[#15151B] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] sm:rounded-[6px]",
          widths[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-serif text-[20px] leading-tight text-parchment">{title}</h3>
            {description && <p className="mt-1 text-[12.5px] text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-[3px] p-1 text-faint transition-colors hover:bg-white/5 hover:text-parchment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white/[0.015] px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Hapus",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="h-9 rounded-[4px] border border-line px-3.5 text-[13px] text-muted transition-colors hover:text-parchment"
          >
            Batal
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } finally {
                setBusy(false);
              }
            }}
            className={cn(
              "h-9 rounded-[4px] px-3.5 text-[13px] font-medium transition-colors disabled:opacity-50",
              danger
                ? "bg-[#8E2626] text-[#F6EBDD] hover:bg-[#A83232]"
                : "bg-surface-2 text-parchment hover:bg-surface-3"
            )}
          >
            {busy ? "Memproses…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[13.5px] leading-relaxed text-muted">{message}</p>
    </Modal>
  );
}
