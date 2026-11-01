"use client";

import * as React from "react";
import { cn, diffStats, diffWords } from "@/lib/utils";

export function DiffView({
  original,
  revised,
  view = "side",
}: {
  original: string;
  revised: string;
  view?: "side" | "inline";
}) {
  const parts = React.useMemo(() => diffWords(original, revised), [original, revised]);
  const stats = React.useMemo(() => diffStats(parts), [parts]);

  if (view === "inline") {
    return (
      <div>
        <DiffLegend added={stats.added} removed={stats.removed} />
        <div className="max-h-[52vh] overflow-y-auto rounded-[4px] border border-line bg-[#111116] p-4 text-[13.5px] leading-[1.9]">
          {parts.map((part, i) => (
            <span
              key={i}
              className={cn(
                "whitespace-pre-wrap",
                part.type === "add" && "bg-[#1F3A2B]/70 text-[#B7D8BF]",
                part.type === "remove" && "bg-[#3A1F22]/80 text-[#E0A8A8] line-through decoration-[#7A3A3A]"
              )}
            >
              {part.value}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const left = parts.filter((p) => p.type !== "add");
  const right = parts.filter((p) => p.type !== "remove");

  return (
    <div>
      <DiffLegend added={stats.added} removed={stats.removed} />
      <div className="grid max-h-[52vh] grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
        <div className="rounded-[4px] border border-line bg-[#111116] p-4">
          <p className="eyebrow mb-2.5">Naskah asli</p>
          <div className="text-[13px] leading-[1.9] text-[#B9AE9D]">
            {left.map((part, i) => (
              <span
                key={i}
                className={cn(
                  "whitespace-pre-wrap",
                  part.type === "remove" && "bg-[#3A1F22]/80 text-[#E0A8A8] line-through decoration-[#7A3A3A]"
                )}
              >
                {part.value}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-[4px] border border-line bg-[#111116] p-4">
          <p className="eyebrow mb-2.5">Versi baru</p>
          <div className="text-[13px] leading-[1.9] text-[#D6C9B4]">
            {right.map((part, i) => (
              <span
                key={i}
                className={cn(
                  "whitespace-pre-wrap",
                  part.type === "add" && "bg-[#1F3A2B]/70 text-[#B7D8BF]"
                )}
              >
                {part.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DiffLegend({ added, removed }: { added: number; removed: number }) {
  return (
    <div className="mb-2.5 flex items-center gap-4 text-[10.5px] text-faint">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-[1px] bg-[#2F5A40]" /> {added} kata ditambahkan
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-[1px] bg-[#6B3034]" /> {removed} kata dihapus
      </span>
    </div>
  );
}
