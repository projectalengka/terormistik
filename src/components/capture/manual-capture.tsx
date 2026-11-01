"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { useRepo } from "@/components/providers/data-provider";
import { useToast } from "@/components/ui/toast";
import { countWords, formatNumber } from "@/lib/utils";
import type { Note } from "@/lib/types";

export function ManualCapture({ onSaved }: { onSaved: (note: Note) => void }) {
  const repo = useRepo();
  const router = useRouter();
  const toast = useToast();

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState<"save" | "studio" | null>(null);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);

  const words = countWords(body);

  async function save(openStudio = false) {
    if (!body.trim()) {
      toast.error("Tulis sesuatu terlebih dahulu.");
      return;
    }
    setBusy(openStudio ? "studio" : "save");
    try {
      const note = await repo.createNote({
        title: title.trim() || `Catatan ${new Date().toLocaleDateString("id-ID")}`,
        body: body.trim(),
        method: "manual",
        status: openStudio ? "converted" : "raw",
      });
      onSaved(note);

      if (openStudio) {
        const story = await repo.createStory({
          title: title.trim() || "Cerita Baru",
          source: "lisan",
          synopsis: "",
        });
        const chapters = await repo.listChapters(story.id);
        if (chapters[0]) {
          await repo.updateChapter(chapters[0].id, {
            content: JSON.stringify({
              type: "doc",
              content: body
                .split(/\n{2,}/)
                .filter((p) => p.trim())
                .map((p) => ({ type: "paragraph", content: [{ type: "text", text: p.trim() }] })),
            }),
            word_count: words,
          });
        }
        await repo.updateNote(note.id, { story_id: story.id });
        toast.success("Catatan diubah menjadi cerita.");
        router.push(`/studio/${story.id}`);
        return;
      }

      setBody("");
      setTitle("");
      setSavedAt(new Date());
      toast.success("Catatan mentah tersimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan catatan.");
    } finally {
      setBusy(null);
    }
  }

  React.useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 4000);
    return () => clearTimeout(t);
  }, [savedAt]);

  return (
    <div className="rounded-[5px] border border-line bg-[#15151B] p-4 sm:p-6">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Judul catatan (opsional)"
        className="mb-3 border-0 border-b border-line bg-transparent px-0 text-[15px] focus:border-[#5C4A45] focus:bg-transparent"
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={10}
        placeholder="Tulis ide, potongan dialog, atau cerita yang baru saja Anda dengar…"
        className="min-h-[180px] resize-y border-0 bg-transparent px-0 text-[14.5px] leading-[1.85] focus:bg-transparent sm:min-h-[220px]"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex items-center gap-4 text-[11px] text-faint">
          <span>{formatNumber(words)} kata</span>
          {savedAt && (
            <span className="flex items-center gap-1 text-[#9FC7A9]">
              <Check className="h-3 w-3" /> Tersimpan
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void save(false)} loading={busy === "save"}>
            <Save className="h-3.5 w-3.5" /> Simpan Catatan
          </Button>
          <Button variant="primary" size="sm" onClick={() => void save(true)} loading={busy === "studio"}>
            <Sparkles className="h-3.5 w-3.5" /> Simpan &amp; Buka di Studio
          </Button>
        </div>
      </div>
    </div>
  );
}
