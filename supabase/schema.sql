-- ============================================================
-- TEROR MISTIK — Supabase schema
-- Jalankan seluruh berkas ini di Supabase SQL Editor.
-- Aman dijalankan berulang (idempotent).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Helper: updated_at
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Penulis',
  pen_name text not null default 'Tanpa Nama',
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- categories (metadata genre, hanya-baca untuk owner)
-- ------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

insert into public.categories (slug, name, description) values
  ('horor', 'Horor', 'Ketakutan langsung, ancaman yang nyata.'),
  ('misteri', 'Misteri', 'Teka-teki yang menuntut jawaban.'),
  ('supernatural', 'Supernatural', 'Sesuatu di luar hukum alam.'),
  ('thriller', 'Thriller', 'Ketegangan yang bergerak cepat.'),
  ('psychological', 'Psychological Horror', 'Ketakutan yang tumbuh dari dalam pikiran.'),
  ('urban-legend', 'Urban Legend', 'Cerita yang dipercaya tumbuh di antara kita.'),
  ('folklore', 'Folklore', 'Warisan cerita rakyat dan kepercayaan lama.'),
  ('cosmic', 'Cosmic Horror', 'Kengerian yang melampaui pemahaman manusia.'),
  ('true-horror', 'True Horror', 'Berakar pada peristiwa yang diyakini nyata.'),
  ('dark-fantasy', 'Dark Fantasy', 'Dunia lain dengan harga yang gelap.')
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- stories
-- ------------------------------------------------------------
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Tanpa Judul',
  synopsis text not null default '',
  cover_url text,
  genre text not null default 'horor',
  status text not null default 'draft'
    check (status in ('draft', 'in_progress', 'completed', 'archived')),
  source text not null default 'lisan'
    check (source in ('lisan', 'pengalaman', 'riset', 'media', 'imajinasi', 'lainnya')),
  word_count integer not null default 0,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stories_owner_updated_idx on public.stories (owner_id, updated_at desc);
create index if not exists stories_genre_idx on public.stories (owner_id, genre);

drop trigger if exists stories_updated_at on public.stories;
create trigger stories_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- chapters
-- content disimpan sebagai teks JSON TipTap agar konsisten
-- dengan mode lokal.
-- ------------------------------------------------------------
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  title text not null default 'Bab 1',
  content text not null default '{"type":"doc","content":[{"type":"paragraph"}]}',
  order_index integer not null default 0,
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chapters_story_order_idx on public.chapters (story_id, order_index);

drop trigger if exists chapters_updated_at on public.chapters;
create trigger chapters_updated_at
  before update on public.chapters
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- media_sources
-- ------------------------------------------------------------
create table if not exists public.media_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'audio' check (kind in ('audio', 'video')),
  file_name text not null default 'media',
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  storage_path text,
  source_url text,
  duration_seconds numeric,
  transcript text not null default '',
  transcript_status text not null default 'pending'
    check (transcript_status in ('pending', 'processing', 'done', 'error')),
  summary text not null default '',
  key_points text[] not null default '{}',
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_owner_idx on public.media_sources (owner_id, created_at desc);

drop trigger if exists media_updated_at on public.media_sources;
create trigger media_updated_at
  before update on public.media_sources
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- notes
-- ------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Catatan Tanpa Judul',
  body text not null default '',
  method text not null default 'manual'
    check (method in ('manual', 'voice', 'speech', 'audio', 'video')),
  status text not null default 'raw'
    check (status in ('raw', 'processed', 'converted')),
  media_id uuid references public.media_sources(id) on delete set null,
  story_id uuid references public.stories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_owner_idx on public.notes (owner_id, updated_at desc);

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- story_versions
-- ------------------------------------------------------------
create table if not exists public.story_versions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  label text not null default 'Versi',
  content text not null default '',
  word_count integer not null default 0,
  source text not null default 'manual' check (source in ('manual', 'ai')),
  action text,
  created_at timestamptz not null default now()
);

create index if not exists versions_story_idx on public.story_versions (story_id, created_at desc);

-- ------------------------------------------------------------
-- ai_history
-- ------------------------------------------------------------
create table if not exists public.ai_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  note_id uuid references public.notes(id) on delete set null,
  action text not null,
  provider text not null default '',
  model text not null default '',
  mode text check (mode in ('natural', 'professional')),
  input_excerpt text not null default '',
  output text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists ai_history_owner_idx on public.ai_history (owner_id, created_at desc);

-- ------------------------------------------------------------
-- reading_progress
-- ------------------------------------------------------------
create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null unique references public.stories(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  percent integer not null default 0 check (percent between 0 and 100),
  updated_at timestamptz not null default now()
);

drop trigger if exists progress_updated_at on public.reading_progress;
create trigger progress_updated_at
  before update on public.reading_progress
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- favorites (cermin dari stories.is_favorite)
-- ------------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null unique references public.stories(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.sync_favorite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_favorite and not coalesce(old.is_favorite, false) then
    insert into public.favorites (owner_id, story_id)
    values (new.owner_id, new.id)
    on conflict (story_id) do nothing;
  elsif not new.is_favorite and coalesce(old.is_favorite, false) then
    delete from public.favorites where story_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists stories_sync_favorite on public.stories;
create trigger stories_sync_favorite
  after update of is_favorite on public.stories
  for each row execute function public.sync_favorite();

-- ------------------------------------------------------------
-- Profil otomatis saat user dibuat
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, pen_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(split_part(new.email, '@', 1), 'Penulis'),
    'Tanpa Nama'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.stories enable row level security;
alter table public.chapters enable row level security;
alter table public.notes enable row level security;
alter table public.media_sources enable row level security;
alter table public.story_versions enable row level security;
alter table public.ai_history enable row level security;
alter table public.reading_progress enable row level security;
alter table public.favorites enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- categories: hanya user terautentikasi yang dapat membaca
drop policy if exists "categories_read_auth" on public.categories;
create policy "categories_read_auth" on public.categories
  for select to authenticated using (true);

-- stories
drop policy if exists "stories_owner_all" on public.stories;
create policy "stories_owner_all" on public.stories
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- chapters (melalui kepemilikan cerita)
drop policy if exists "chapters_owner_all" on public.chapters;
create policy "chapters_owner_all" on public.chapters
  for all using (
    exists (
      select 1 from public.stories s
      where s.id = chapters.story_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.stories s
      where s.id = chapters.story_id and s.owner_id = auth.uid()
    )
  );

-- notes
drop policy if exists "notes_owner_all" on public.notes;
create policy "notes_owner_all" on public.notes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- media
drop policy if exists "media_owner_all" on public.media_sources;
create policy "media_owner_all" on public.media_sources
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- versions
drop policy if exists "versions_owner_all" on public.story_versions;
create policy "versions_owner_all" on public.story_versions
  for all using (
    exists (
      select 1 from public.stories s
      where s.id = story_versions.story_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.stories s
      where s.id = story_versions.story_id and s.owner_id = auth.uid()
    )
  );

-- ai history
drop policy if exists "ai_history_owner_all" on public.ai_history;
create policy "ai_history_owner_all" on public.ai_history
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- reading progress
drop policy if exists "progress_owner_all" on public.reading_progress;
create policy "progress_owner_all" on public.reading_progress
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- favorites
drop policy if exists "favorites_owner_all" on public.favorites;
create policy "favorites_owner_all" on public.favorites
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ============================================================
-- STORAGE
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  262144000,
  array[
    'audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/m4a',
    'audio/webm','audio/ogg','audio/flac','audio/aac','audio/opus',
    'video/mp4','video/quicktime','video/webm','video/x-matroska','video/x-m4v',
    'image/jpeg','image/png','image/webp'
  ]
)
on conflict (id) do nothing;

drop policy if exists "media_objects_select_own" on storage.objects;
create policy "media_objects_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media_objects_insert_own" on storage.objects;
create policy "media_objects_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media_objects_delete_own" on storage.objects;
create policy "media_objects_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- SELESAI
-- Langkah berikutnya:
-- 1. Authentication → Users → Add user (email + password) untuk owner.
-- 2. Salin Project URL dan anon key ke .env.local.
-- ============================================================
