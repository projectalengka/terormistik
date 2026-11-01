# TEROR MISTIK — project memory

## What this is
Personal (single-owner) AI horror writing studio. Indonesian UI. Next.js 15 App Router,
React 19, TypeScript, Tailwind v4, TipTap 2, Supabase, OpenRouter/Gemini/Groq.

## Conventions
- All user-facing copy in Bahasa Indonesia, calm editorial tone. No emojis.
- Palette tokens live in `src/app/globals.css` `@theme`: base `#101014`, surface `#19191F`,
  surface-2 `#222229`, accent `#A83232`, parchment `#E8DCC8`, muted `#A69A8B`, line `#333039`.
- Fonts: Cormorant Garamond (headings), Inter (UI), Lora (reading/editor prose).
- Radii stay small (3–6px). Avoid large rounded cards; use hairline borders and wide spacing.
- Every overlay (modal, sheet, drawer) must be portaled to `document.body`. Never animate the
  page wrapper with `transform` — it becomes the containing block for `fixed` children.

## Architecture rules
- UI never talks to Supabase directly except through `Repository` (`src/lib/data/repository.ts`).
  Two drivers: `local.ts` (IndexedDB) and `supabase.ts` (RLS-backed).
- API keys only on the server: env vars or `.data/keys.json` (AES-256-GCM). Never localStorage.
- AI output never overwrites the manuscript automatically; results become a new version with
  compare / accept / reject / save.
- `chapters.content` is TipTap JSON stored as **text** in Postgres (kept identical to local mode).
- When Supabase is not configured the app must remain fully usable in local mode and must show
  "belum terhubung" states instead of pretending integrations work.

## Run
- Reliable in this environment: `npm run build && npm start`.
- `npm run dev` is blocked by the CLI safe-delete shim when cleaning `.next`.
- `next build` needs `.next` to already exist (`mkdir .next`) on this machine.
