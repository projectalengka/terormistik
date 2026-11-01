import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateShortFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFmt.format(d);
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateShortFmt.format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${dateShortFmt.format(d)} · ${d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Date.now() - d;
  const min = Math.round(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.round(months / 12)} tahun lalu`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function countWords(text: string): number {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return 0;
  return clean.split(" ").length;
}

export function readingTime(words: number): string {
  const minutes = Math.max(1, Math.round(words / 220));
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} jam ${m} menit` : `${h} jam`;
}

export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ————————————————————————————————————————————————
   TipTap document helpers (no server dependency)
   ———————————————————————————————————————————————— */

export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export function emptyDoc(): TipTapNode {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function docFromText(text: string): TipTapNode {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  return {
    type: "doc",
    content:
      paragraphs.length > 0
        ? paragraphs.map((p) => ({
            type: "paragraph",
            content: [{ type: "text", text: p.trim() }],
          }))
        : [{ type: "paragraph" }],
  };
}

export function parseDoc(content: string | null | undefined): TipTapNode {
  if (!content) return emptyDoc();
  try {
    const parsed = JSON.parse(content) as TipTapNode;
    if (parsed && parsed.type === "doc") return parsed;
    return emptyDoc();
  } catch {
    return docFromText(content);
  }
}

export function tiptapToText(node: TipTapNode | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const children = node.content ?? [];
  const inner = children.map(tiptapToText).join("");
  switch (node.type) {
    case "doc":
      return children.map(tiptapToText).join("\n\n");
    case "paragraph":
    case "heading":
      return inner;
    case "blockquote":
      return inner
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
    case "listItem":
      return inner;
    case "bulletList":
      return children.map((c) => `• ${tiptapToText(c)}`).join("\n");
    case "orderedList":
      return children.map((c, i) => `${i + 1}. ${tiptapToText(c)}`).join("\n");
    case "horizontalRule":
      return "* * *";
    case "codeBlock":
      return inner;
    default:
      return inner;
  }
}

function renderMarks(text: string, node: TipTapNode): string {
  let html = escapeHtml(text);
  const marks = node.marks ?? [];
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        html = `<strong>${html}</strong>`;
        break;
      case "italic":
        html = `<em>${html}</em>`;
        break;
      case "underline":
        html = `<u>${html}</u>`;
        break;
      case "strike":
        html = `<s>${html}</s>`;
        break;
      case "highlight":
        html = `<mark>${html}</mark>`;
        break;
      case "link": {
        const href = escapeHtml(String(mark.attrs?.href ?? "#"));
        html = `<a href="${href}" rel="noopener noreferrer" target="_blank">${html}</a>`;
        break;
      }
      default:
        break;
    }
  }
  return html;
}

export function tiptapToHtml(node: TipTapNode | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return renderMarks(node.text ?? "", node);
  if (node.type === "hardBreak") return "<br/>";

  const children = node.content ?? [];
  const inner = children.map(tiptapToHtml).join("");

  switch (node.type) {
    case "doc":
      return inner;
    case "paragraph":
      return `<p>${inner || "<br/>"}</p>`;
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const tag = level >= 1 && level <= 3 ? `h${level}` : "h2";
      return `<${tag}>${inner}</${tag}>`;
    }
    case "blockquote":
      return `<blockquote>${inner}</blockquote>`;
    case "bulletList":
      return `<ul>${inner}</ul>`;
    case "orderedList":
      return `<ol>${inner}</ol>`;
    case "listItem":
      return `<li>${inner}</li>`;
    case "horizontalRule":
      return `<hr/>`;
    case "codeBlock":
      return `<pre><code>${inner}</code></pre>`;
    default:
      return inner;
  }
}

/* ————————————————————————————————————————————————
   Word-level diff (LCS) for AI version comparison
   ———————————————————————————————————————————————— */

export type DiffPart = { type: "same" | "add" | "remove"; value: string };

const MAX_DIFF_CELLS = 3_500_000;

export function diffWords(oldText: string, newText: string): DiffPart[] {
  const a = oldText.split(/(\s+)/).filter((t) => t.length > 0);
  const b = newText.split(/(\s+)/).filter((t) => t.length > 0);

  if (a.length * b.length > MAX_DIFF_CELLS) {
    return [
      { type: "remove", value: oldText },
      { type: "add", value: newText },
    ];
  }

  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  const push = (type: DiffPart["type"], value: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.value += value;
    else parts.push({ type, value });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("remove", a[i]);
      i++;
    } else {
      push("add", b[j]);
      j++;
    }
  }
  while (i < n) push("remove", a[i++]);
  while (j < m) push("add", b[j++]);

  return parts;
}

export function diffStats(parts: DiffPart[]) {
  let added = 0;
  let removed = 0;
  for (const p of parts) {
    const words = countWords(p.value);
    if (p.type === "add") added += words;
    if (p.type === "remove") removed += words;
  }
  return { added, removed };
}

/* ————————————————————————————————————————————————
   Media helpers
   ———————————————————————————————————————————————— */

export function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || /\.(mp3|wav|m4a|webm|ogg|flac|aac|opus)$/i.test(file.name);
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(file.name);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(text: string, filename: string, mime = "text/plain;charset=utf-8") {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 90);
}
