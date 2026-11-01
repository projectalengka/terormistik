"use client";

import * as React from "react";
import { Download, ImagePlus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/components/providers/data-provider";
import { useAsync } from "@/lib/hooks";
import { COVER_TEMPLATES, GENRES, genreLabel, type CoverTemplateId } from "@/lib/constants";
import { COVER_HEIGHT, COVER_WIDTH, renderCover, type CoverOptions } from "@/lib/cover";
import { cn, downloadBlob } from "@/lib/utils";

const PRESETS: Record<CoverTemplateId, { bg: string; accent: string; text: string }> = {
  gothic: { bg: "#14100F", accent: "#A83232", text: "#E8DCC8" },
  supernatural: { bg: "#0F1720", accent: "#7A9BA8", text: "#E4E9E8" },
  psychological: { bg: "#0B0B0D", accent: "#C0392B", text: "#F0E8DC" },
  folklore: { bg: "#241B14", accent: "#C08A3E", text: "#E8D6B8" },
  minimal: { bg: "#16161A", accent: "#A83232", text: "#E8DCC8" },
};

export default function CoverGeneratorPage() {
  const { repo, profile } = useData();
  const toast = useToast();

  const [title, setTitle] = React.useState("Rumah di Ujung Gang");
  const [author, setAuthor] = React.useState(profile?.pen_name || "Tanpa Nama");
  const [genre, setGenre] = React.useState<string>("horor");
  const [template, setTemplate] = React.useState<CoverTemplateId>("gothic");
  const [bgColor, setBgColor] = React.useState(PRESETS.gothic.bg);
  const [accentColor, setAccentColor] = React.useState(PRESETS.gothic.accent);
  const [textColor, setTextColor] = React.useState(PRESETS.gothic.text);
  const [fontFamily, setFontFamily] = React.useState<"serif" | "sans">("serif");
  const [titleScale, setTitleScale] = React.useState(1);
  const [tracking, setTracking] = React.useState(1);
  const [align, setAlign] = React.useState<"left" | "center">("center");
  const [titleY, setTitleY] = React.useState(0.66);
  const [imageOpacity, setImageOpacity] = React.useState(0.55);
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  const [storyId, setStoryId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const { data: stories } = useAsync(() => repo.listStories(), [repo]);

  React.useEffect(() => {
    if (profile?.pen_name) setAuthor(profile.pen_name);
  }, [profile?.pen_name]);

  const options: CoverOptions = React.useMemo(
    () => ({
      template,
      title,
      author,
      genre: genreLabel(genre),
      bgColor,
      accentColor,
      textColor,
      fontFamily,
      titleScale,
      tracking,
      align,
      titleY,
      image,
      imageOpacity,
    }),
    [
      template,
      title,
      author,
      genre,
      bgColor,
      accentColor,
      textColor,
      fontFamily,
      titleScale,
      tracking,
      align,
      titleY,
      image,
      imageOpacity,
    ]
  );

  React.useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled || !canvasRef.current) return;
      renderCover(canvasRef.current, options);
    };
    if (document.fonts?.ready) {
      void document.fonts.ready.then(draw);
    } else {
      draw();
    }
    draw();
    return () => {
      cancelled = true;
    };
  }, [options]);

  function applyTemplate(id: CoverTemplateId) {
    setTemplate(id);
    setBgColor(PRESETS[id].bg);
    setAccentColor(PRESETS[id].accent);
    setTextColor(PRESETS[id].text);
    if (id === "psychological") {
      setAlign("left");
      setTitleY(0.42);
    } else if (id === "minimal") {
      setAlign("left");
      setTitleY(0.8);
    } else {
      setAlign("center");
      setTitleY(0.66);
    }
  }

  function handleImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Berkas harus berupa gambar.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `${(title || "cover").replace(/[^\w\s-]/g, "").trim() || "cover"}.png`);
    }, "image/png");
  }

  async function saveToStory() {
    if (!storyId) {
      toast.error("Pilih cerita tujuan terlebih dahulu.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const small = document.createElement("canvas");
      small.width = 800;
      small.height = 1200;
      const ctx = small.getContext("2d");
      if (!ctx) throw new Error("Kanvas tidak tersedia.");
      ctx.drawImage(canvas, 0, 0, small.width, small.height);
      const dataUrl = small.toDataURL("image/jpeg", 0.82);
      await repo.updateStory(storyId, { cover_url: dataUrl });
      toast.success("Cover diterapkan pada cerita.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan cover.");
    } finally {
      setSaving(false);
    }
  }

  const Slider = ({
    label,
    value,
    min,
    max,
    step,
    onChange,
    format,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    format?: (v: number) => string;
  }) => (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</span>
        <span className="text-[10px] text-faint">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Cover Generator"
        title={
          <>
            Wajah pertama <span className="italic text-[#C7B9A3]">sebuah cerita.</span>
          </>
        }
        description="Susun cover portrait 2:3 dengan tipografi dan atmosfer yang tepat. Unduh sebagai PNG atau terapkan langsung ke cerita Anda."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_370px]">
        {/* Preview */}
        <div>
          <div className="mx-auto max-w-[420px]">
            <div className="overflow-hidden rounded-[4px] border border-line shadow-[0_40px_100px_-50px_rgba(0,0,0,0.95)]">
              <canvas ref={canvasRef} className="block h-auto w-full" style={{ aspectRatio: "2 / 3" }} />
            </div>
            <p className="mt-2.5 text-center text-[10px] uppercase tracking-[0.16em] text-faint">
              Portrait 2:3 · {COVER_WIDTH} × {COVER_HEIGHT} px
            </p>
          </div>

          <div className="mx-auto mt-6 flex max-w-[420px] flex-col gap-2">
            <Button variant="primary" onClick={() => void download()}>
              <Download className="h-4 w-4" /> Unduh Cover (PNG)
            </Button>
            <div className="flex gap-2">
              <Select value={storyId} onChange={(e) => setStoryId(e.target.value)} className="flex-1">
                <option value="">Pilih cerita tujuan…</option>
                {(stories ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </Select>
              <Button variant="secondary" onClick={() => void saveToStory()} loading={saving}>
                <Save className="h-4 w-4" /> Terapkan
              </Button>
            </div>
            <p className="text-center text-[10.5px] leading-relaxed text-faint">
              Cover disimpan sebagai gambar terkompresi pada data cerita.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-5">
          <div className="rounded-[5px] border border-line bg-[#15151B] p-4">
            <p className="eyebrow mb-3">Teks</p>
            <div className="space-y-3">
              <Field label="Judul">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
              </Field>
              <Field label="Nama Penulis">
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={48} />
              </Field>
              <Field label="Kategori">
                <Select value={genre} onChange={(e) => setGenre(e.target.value)}>
                  {GENRES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div className="rounded-[5px] border border-line bg-[#15151B] p-4">
            <p className="eyebrow mb-3">Template</p>
            <div className="grid grid-cols-2 gap-1.5">
              {COVER_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t.id)}
                  className={cn(
                    "rounded-[3px] border px-2.5 py-2 text-left transition-colors",
                    template === t.id
                      ? "border-[#5A2B2B] bg-accent/10 text-parchment"
                      : "border-line text-muted hover:border-line-strong hover:text-parchment"
                  )}
                >
                  <span className="block text-[11.5px]">{t.label}</span>
                  <span className="mt-0.5 block text-[9.5px] leading-tight opacity-60">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[5px] border border-line bg-[#15151B] p-4">
            <p className="eyebrow mb-3">Warna</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { label: "Latar", value: bgColor, set: setBgColor },
                  { label: "Aksen", value: accentColor, set: setAccentColor },
                  { label: "Teks", value: textColor, set: setTextColor },
                ] as const
              ).map((item) => (
                <div key={item.label}>
                  <p className="mb-1.5 text-[9.5px] uppercase tracking-[0.14em] text-faint">
                    {item.label}
                  </p>
                  <label className="relative block h-9 cursor-pointer overflow-hidden rounded-[3px] border border-line">
                    <span className="absolute inset-0" style={{ backgroundColor: item.value }} />
                    <input
                      type="color"
                      value={item.value}
                      onChange={(e) => item.set(e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-[5px] border border-line bg-[#15151B] p-4">
            <p className="eyebrow">Tipografi &amp; tata letak</p>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "serif", label: "Serif" },
                  { id: "sans", label: "Sans" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontFamily(f.id)}
                  className={cn(
                    "rounded-[3px] border py-2 text-[12px] transition-colors",
                    fontFamily === f.id
                      ? "border-[#5A2B2B] bg-accent/10 text-parchment"
                      : "border-line text-faint hover:text-muted"
                  )}
                >
                  <span style={{ fontFamily: f.id === "serif" ? "var(--font-serif)" : "var(--font-sans)" }}>
                    {f.label}
                  </span>
                </button>
              ))}
            </div>

            <Slider
              label="Ukuran judul"
              value={titleScale}
              min={0.6}
              max={1.6}
              step={0.05}
              onChange={setTitleScale}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Slider
              label="Spasi huruf"
              value={tracking}
              min={-2}
              max={14}
              step={0.5}
              onChange={setTracking}
              format={(v) => `${v}px`}
            />
            <Slider
              label="Posisi vertikal"
              value={titleY}
              min={0.2}
              max={0.86}
              step={0.01}
              onChange={setTitleY}
              format={(v) => `${Math.round(v * 100)}%`}
            />

            <div className="flex gap-1 rounded-[4px] border border-line bg-[#111116] p-0.5">
              {(
                [
                  { id: "left", label: "Kiri" },
                  { id: "center", label: "Tengah" },
                ] as const
              ).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAlign(a.id)}
                  className={cn(
                    "flex-1 rounded-[3px] py-1.5 text-[11px] transition-colors",
                    align === a.id ? "bg-white/[0.06] text-parchment" : "text-faint"
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[5px] border border-line bg-[#15151B] p-4">
            <p className="eyebrow mb-3">Gambar latar</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImage(e.target.files?.[0])}
            />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-3.5 w-3.5" /> {image ? "Ganti Gambar" : "Unggah Gambar"}
              </Button>
              {image && (
                <Button variant="ghost" size="sm" onClick={() => setImage(null)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {image && (
              <div className="mt-4">
                <Slider
                  label="Opasitas gambar"
                  value={imageOpacity}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onChange={setImageOpacity}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </div>
            )}
            <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
              Gunakan gambar milik sendiri atau yang berlisensi bebas.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
