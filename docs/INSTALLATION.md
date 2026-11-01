# Instalasi

Panduan lengkap dari nol hingga aplikasi berjalan.

---

## 1. Kebutuhan

| Perangkat | Versi |
| --- | --- |
| Node.js | 20 LTS atau lebih baru (disarankan 22) |
| npm | 10+ |
| Peramban | Chrome, Edge, atau Safari terbaru |

Tidak ada dependensi database lokal. Mode lokal memakai IndexedDB.

---

## 2. Pasang & jalankan

```bash
npm install
npm run dev
```

Buka <http://localhost:3000>. Aplikasi langsung berjalan dalam **Mode Lokal**.

Pada tahap ini yang sudah berfungsi penuh:

- Dashboard, navigasi, layout responsif.
- Quick Capture (catatan manual, rekaman suara, voice-to-text).
- Editor dengan bab, autosave, word count, preview.
- Perpustakaan, pencarian, filter, favorit, arsip.
- Reading mode dengan pengaturan tipografi.
- Cover generator + unduh PNG.
- Ekspor TXT / Markdown / HTML / JSON.
- Backup dan restore.

Yang menampilkan "belum terhubung": aksi AI, transkripsi audio, analisis video, ekspor DOCX
(memerlukan server, tetapi tetap berjalan di `npm run dev`).

---

## 3. Konfigurasi environment

```bash
cp .env.example .env.local
```

Isi minimal satu provider AI agar fitur AI aktif.

### 3.1 OpenRouter (teks)

1. Masuk ke <https://openrouter.ai/keys>.
2. Buat key baru, salin (`sk-or-v1-...`).
3. Isi:

   ```env
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
   OPENROUTER_MODEL=openrouter/auto
   ```

`openrouter/auto` membiarkan OpenRouter memilih model terbaik yang tersedia. Untuk kontrol penuh,
ganti dengan model spesifik, misalnya `anthropic/claude-sonnet-4.5` atau `openai/gpt-4.1`.

### 3.2 Google Gemini (video, fallback teks)

1. Buka <https://aistudio.google.com/apikey>.
2. Buat API key.
3. Isi:

   ```env
   GEMINI_API_KEY=AIza...
   GEMINI_MODEL=gemini-2.5-flash
   ```

Gemini wajib untuk **Video → Teks**. Tanpa Gemini, tab video akan menampilkan status belum
terhubung dan tidak akan mengklaim berhasil.

### 3.3 Groq Whisper (transkripsi audio)

1. Buka <https://console.groq.com/keys>.
2. Buat API key.
3. Isi:

   ```env
   GROQ_API_KEY=gsk_...
   GROQ_WHISPER_MODEL=whisper-large-v3
   ```

Batas unggah Groq adalah 25 MB per berkas. Untuk rekaman lebih panjang, potong menjadi beberapa
bagian.

### 3.4 Perutean provider

```env
AI_PRIMARY_PROVIDER=openrouter   # openrouter | gemini
AI_FALLBACK_PROVIDER=gemini      # openrouter | gemini | none
```

Jika provider utama gagal (kuota habis, kunci ditolak, gangguan), server otomatis mencoba
fallback dan menandai respons dengan `fallbackUsed: true`.

---

## 4. Supabase (opsional, disarankan)

### 4.1 Buat proyek

1. Daftar di <https://supabase.com>, buat proyek baru.
2. Tunggu hingga database siap (± 2 menit).

### 4.2 Jalankan skema

1. Buka **SQL Editor** → **New query**.
2. Salin seluruh isi `supabase/schema.sql`.
3. Tekan **Run**.

Skrip membuat:

- 10 tabel (`profiles`, `categories`, `stories`, `chapters`, `notes`, `media_sources`,
  `ai_history`, `story_versions`, `reading_progress`, `favorites`).
- Indeks, foreign key, dan trigger `updated_at`.
- Trigger `handle_new_user` (profil otomatis).
- Trigger `sync_favorite` (tabel favorites mengikuti `stories.is_favorite`).
- Row Level Security + policy untuk setiap tabel.
- Bucket storage privat `media` + policy per-folder pemilik.

Skrip idempotent — aman dijalankan ulang.

### 4.3 Ambil kredensial

**Project Settings → API**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

Gunakan **anon key**, bukan service role key. Service role melewati RLS dan tidak boleh dipakai di
aplikasi klien.

### 4.4 Buat akun owner

**Authentication → Users → Add user → Create new user**

- Isi email dan kata sandi.
- Centang **Auto Confirm User** agar bisa langsung masuk.

Tidak ada halaman registrasi publik — ini memang disengaja. Satu instalasi, satu pemilik.

### 4.5 Mulai ulang

```bash
npm run dev
```

Sekarang `/dashboard` akan mengarahkan ke `/login`. Setelah masuk, data tersimpan di PostgreSQL
dan media di Supabase Storage.

### 4.6 Verifikasi

```bash
curl http://localhost:3000/api/health
```

Respons menampilkan `"backend": "supabase"` dan status tiap provider AI.

---

## 5. Struktur penyimpanan

### Mode lokal (IndexedDB)

Database `teror-mistik`, object store:

`stories`, `chapters`, `notes`, `media`, `versions`, `ai_history`, `progress`, `profile`, `blobs`.

Blob media disimpan langsung di IndexedDB. Kuota mengikuti peramban (biasanya 60% ruang disk).

### Mode Supabase

| Data | Lokasi |
| --- | --- |
| Naskah & metadata | PostgreSQL (`public.*`) |
| Audio, video, gambar | Storage bucket `media`, path `{user_id}/{kind}/{file}` |
| Cover | Kolom `stories.cover_url` (data URL terkompresi) |

Bucket bersifat privat. Akses melalui signed URL berumur 1 jam yang dibuat saat dibutuhkan.

---

## 6. Kunci API lewat antarmuka

Jika sistem berkas dapat ditulis (lokal, VPS), Anda bisa menyimpan kunci dari **AI Settings**
tanpa menyentuh `.env.local`.

- Kunci dienkripsi AES-256-GCM di `.data/keys.json`.
- Kunci enkripsi berasal dari `TEROR_SECRET_KEY`, atau dibuat otomatis di `.data/.cipher-key`.
- Folder `.data/` masuk `.gitignore`.

**Untuk produksi**, isi `TEROR_SECRET_KEY` dengan string acak 32+ karakter agar kunci tidak
bergantung pada berkas lokal:

```bash
openssl rand -hex 32
```

Di Vercel, sistem berkas read-only — gunakan environment variable.

---

## 7. Pemecahan masalah

| Gejala | Penyebab & solusi |
| --- | --- |
| Semua halaman kosong, "Menyiapkan arsip" terus | Kredensial Supabase salah. Periksa URL/anon key, lalu cek konsol peramban. |
| Login gagal "Email atau kata sandi tidak sesuai" | User belum dikonfirmasi. Aktifkan **Auto Confirm** atau konfirmasi manual. |
| Tabel tidak ditemukan (`relation does not exist`) | `schema.sql` belum dijalankan. Jalankan ulang di SQL Editor. |
| AI 412 "Belum ada provider terhubung" | Tidak ada kunci. Isi `.env.local` atau AI Settings, lalu mulai ulang server. |
| AI 401 | Kunci salah atau kedaluwarsa. Uji lewat tombol **Uji Koneksi**. |
| Transkripsi 413 | Berkas > 25 MB. Potong audio. |
| Video "URL tidak dapat diakses" | Tautan privat, butuh login, atau bukan berkas video langsung. |
| Voice-to-text tidak muncul | Peramban tidak mendukung Web Speech API. Gunakan perekam suara. |
| Rekaman tidak berbunyi | Izin mikrofon ditolak. Aktifkan di pengaturan situs. |
| Data hilang setelah ganti peramban | Mode lokal terikat perangkat. Ekspor backup, atau hubungkan Supabase. |

---

## 8. Reset

### Mode lokal

**Account Settings → Hapus Semua Data Lokal**, atau dari DevTools:

```js
indexedDB.deleteDatabase("teror-mistik");
```

### Mode Supabase

Hapus baris di SQL Editor (RLS tidak berlaku untuk service role di dashboard):

```sql
truncate table public.ai_history, public.story_versions, public.reading_progress,
  public.favorites, public.notes, public.media_sources, public.chapters, public.stories
  cascade;
```
