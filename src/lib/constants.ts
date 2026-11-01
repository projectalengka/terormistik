import type {
  AiActionId,
  NoteMethod,
  StoryGenre,
  StorySource,
  StoryStatus,
} from "./types";

export const APP_NAME = "TEROR MISTIK";
export const APP_TAGLINE =
  "Setiap cerita layak diabadikan. Bahkan cerita yang paling gelap sekalipun.";

export const GENRES: { value: StoryGenre; label: string; short: string }[] = [
  { value: "horor", label: "Horor", short: "HOR" },
  { value: "misteri", label: "Misteri", short: "MIS" },
  { value: "supernatural", label: "Supernatural", short: "SUP" },
  { value: "thriller", label: "Thriller", short: "THR" },
  { value: "psychological", label: "Psychological Horror", short: "PSY" },
  { value: "urban-legend", label: "Urban Legend", short: "URB" },
  { value: "folklore", label: "Folklore", short: "FOL" },
  { value: "cosmic", label: "Cosmic Horror", short: "COS" },
  { value: "true-horror", label: "True Horror", short: "TRU" },
  { value: "dark-fantasy", label: "Dark Fantasy", short: "DRK" },
];

export const STATUSES: { value: StoryStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "in_progress", label: "Sedang Ditulis" },
  { value: "completed", label: "Selesai" },
  { value: "archived", label: "Diarsipkan" },
];

export const SOURCES: { value: StorySource; label: string }[] = [
  { value: "lisan", label: "Cerita Lisan" },
  { value: "pengalaman", label: "Pengalaman Pribadi" },
  { value: "riset", label: "Riset" },
  { value: "media", label: "Dari Media" },
  { value: "imajinasi", label: "Imajinasi" },
  { value: "lainnya", label: "Lainnya" },
];

export const NOTE_METHODS: Record<NoteMethod, string> = {
  manual: "Catatan Manual",
  voice: "Rekaman Suara",
  speech: "Voice-to-Text",
  audio: "Transkripsi Audio",
  video: "Transkripsi Video",
};

export function genreLabel(value: string): string {
  return GENRES.find((g) => g.value === value)?.label ?? value;
}

export function statusLabel(value: string): string {
  return STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function sourceLabel(value: string): string {
  return SOURCES.find((s) => s.value === value)?.label ?? value;
}

export const AI_ACTIONS: {
  id: AiActionId;
  label: string;
  description: string;
  mode: "natural" | "professional";
  icon: string;
}[] = [
  {
    id: "clean",
    label: "Rapikan Tulisan",
    description: "Ejaan, tanda baca, dan struktur kalimat dirapikan tanpa mengubah gaya asli.",
    mode: "natural",
    icon: "sparkles",
  },
  {
    id: "narrate",
    label: "Ubah Menjadi Narasi",
    description: "Ucapan lisan diubah menjadi narasi mengalir dengan suara penutur tetap terjaga.",
    mode: "natural",
    icon: "quote",
  },
  {
    id: "dramatize",
    label: "Dramatisasi Horror",
    description: "Suasana diperkuat, ketegangan dibangun, tanpa menambah peristiwa baru.",
    mode: "professional",
    icon: "flame",
  },
  {
    id: "develop",
    label: "Kembangkan Cerita",
    description: "Karakter, latar, dan konflik dikembangkan menjadi naskah yang lebih utuh.",
    mode: "professional",
    icon: "git-branch",
  },
  {
    id: "chapters",
    label: "Susun Menjadi Bab",
    description: "Naskah panjang dibagi menjadi bab dengan judul dan pembuka yang tepat.",
    mode: "professional",
    icon: "list",
  },
  {
    id: "synopsis",
    label: "Buat Sinopsis",
    description: "Sinopsis padat untuk arsip, cover belakang, atau catatan pribadi.",
    mode: "natural",
    icon: "align-left",
  },
  {
    id: "title",
    label: "Buat Judul",
    description: "Sepuluh alternatif judul beserta alasan singkat pemilihannya.",
    mode: "natural",
    icon: "type",
  },
  {
    id: "consistency",
    label: "Periksa Konsistensi",
    description: "Menemukan kontradiksi nama, waktu, latar, dan alur dalam naskah.",
    mode: "natural",
    icon: "shield-check",
  },
];

export const AI_MODELS: Record<string, string[]> = {
  openrouter: [
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-3.7-sonnet",
    "openai/gpt-4.1",
    "openai/gpt-4o",
    "google/gemini-2.5-pro",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
  ],
  gemini: [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
  ],
  groq: ["whisper-large-v3", "whisper-large-v3-turbo", "distil-whisper-large-v3-en"],
};

export const READING_TIME_WPM = 220;

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 120 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const COVER_TEMPLATES = [
  { id: "gothic", label: "Gothic", description: "Serif tinggi, garis tipis, kesan klasik." },
  { id: "supernatural", label: "Supernatural", description: "Kabut, cahaya samar, ruang kosong." },
  { id: "psychological", label: "Psychological", description: "Kontras tajam, tipografi tertekan." },
  { id: "folklore", label: "Folklore", description: "Tekstur tua, bingkai etnik, warna bumi." },
  { id: "minimal", label: "Dark Minimalist", description: "Satu warna, satu kata, satu tanda." },
] as const;

export type CoverTemplateId = (typeof COVER_TEMPLATES)[number]["id"];

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "layout" },
  { href: "/capture", label: "Quick Capture", icon: "mic" },
  { href: "/studio", label: "AI Studio", icon: "pen" },
  { href: "/library", label: "My Library", icon: "library" },
  { href: "/transcription", label: "Transcription", icon: "audio-lines" },
  { href: "/cover", label: "Cover Generator", icon: "image" },
  { href: "/settings/ai", label: "AI Settings", icon: "cpu" },
  { href: "/backup", label: "Archive & Backup", icon: "archive" },
  { href: "/settings/account", label: "Account", icon: "user" },
] as const;
