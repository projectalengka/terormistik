"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { GENRES, SOURCES } from "@/lib/constants";
import { useRepo } from "@/components/providers/data-provider";
import { useToast } from "@/components/ui/toast";
import type { Story, StoryGenre, StorySource } from "@/lib/types";

export function NewStoryDialog({
  open,
  onClose,
  onCreated,
  redirect = true,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (story: Story) => void;
  redirect?: boolean;
}) {
  const repo = useRepo();
  const router = useRouter();
  const toast = useToast();

  const [title, setTitle] = React.useState("");
  const [genre, setGenre] = React.useState<StoryGenre>("horor");
  const [source, setSource] = React.useState<StorySource>("lisan");
  const [synopsis, setSynopsis] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle("");
      setGenre("horor");
      setSource("lisan");
      setSynopsis("");
      setError(null);
    }
  }, [open]);

  async function handleCreate() {
    if (!title.trim()) {
      setError("Judul cerita belum diisi.");
      return;
    }
    setBusy(true);
    try {
      const story = await repo.createStory({
        title: title.trim(),
        genre,
        source,
        synopsis: synopsis.trim(),
      });
      toast.success("Cerita baru dibuat. Mulai menulis.");
      onCreated?.(story);
      onClose();
      if (redirect) router.push(`/studio/${story.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal membuat cerita.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerita Baru"
      description="Beri nama dulu. Semua detail lain bisa diubah kapan saja."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleCreate} loading={busy}>
            Buat &amp; Mulai Menulis <ArrowRight className="h-4 w-4" />
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Judul" error={error ?? undefined}>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Misalnya: Rumah di Ujung Gang"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kategori">
            <Select value={genre} onChange={(e) => setGenre(e.target.value as StoryGenre)}>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sumber Cerita">
            <Select value={source} onChange={(e) => setSource(e.target.value as StorySource)}>
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Sinopsis" hint="opsional">
          <Textarea
            rows={3}
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="Satu atau dua kalimat tentang cerita ini…"
          />
        </Field>
      </div>
    </Modal>
  );
}
