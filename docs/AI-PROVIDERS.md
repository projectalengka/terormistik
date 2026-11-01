# Provider AI

TEROR MISTIK tidak terikat pada satu penyedia. Tiga peran berbeda diisi oleh tiga provider yang
dapat dikombinasikan sesuai kebutuhan.

| Peran | Provider | Dipakai untuk |
| --- | --- | --- |
| Teks utama | OpenRouter | 8 aksi Writing Studio |
| Multimodal / fallback | Google Gemini | Analisis video, transkripsi alternatif, fallback teks |
| Transkripsi | Groq Whisper | Audio → teks |

Semua permintaan melewati backend. Kunci tidak pernah dikirim ke peramban.

---

## 1. OpenRouter

**Dapatkan kunci:** <https://openrouter.ai/keys>

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openrouter/auto
```

### Memilih model

`openrouter/auto` membiarkan OpenRouter memilih model yang tersedia dan sesuai biaya. Untuk hasil
yang konsisten, pilih model eksplisit:

| Model | Karakter | Cocok untuk |
| --- | --- | --- |
| `anthropic/claude-sonnet-4.5` | Panjang, nuansa, dialog kuat | Dramatisasi, pengembangan cerita |
| `anthropic/claude-3.7-sonnet` | Seimbang, hemat | Semua aksi |
| `openai/gpt-4.1` | Rapi, instruksi ketat | Rapikan tulisan, konsistensi |
| `google/gemini-2.5-pro` | Konteks panjang | Naskah panjang, banyak bab |
| `deepseek/deepseek-chat` | Murah | Eksperimen, draf awal |

Nama model dapat berubah. Periksa katalog di <https://openrouter.ai/models> dan tulis nama persis
seperti yang tertera. Kolom model di AI Settings menerima nama apa pun.

### Batas praktis

- Input dipotong pada 30.000 karakter per permintaan (sekitar 7.000 kata). Jika naskah lebih
  panjang, proses per bab — editor memang dirancang begitu.
- `max_tokens` 4.096 untuk sebagian besar aksi, 8.000 untuk *Kembangkan Cerita* dan *Susun
  Menjadi Bab*.
- Biaya mengikuti model. Untuk pemakaian pribadi, satu bab biasanya jauh di bawah satu sen.

---

## 2. Google Gemini

**Dapatkan kunci:** <https://aistudio.google.com/apikey>

```env
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
```

### Peran

1. **Video → Teks.** Wajib. Gemini menonton video dan menghasilkan ringkasan, poin penting,
   atmosfer visual, serta bahan cerita orisinal.
2. **Fallback teks.** Jika OpenRouter gagal (kuota, kunci, gangguan), permintaan otomatis diulang
   ke Gemini bila `AI_FALLBACK_PROVIDER=gemini`.
3. **Transkripsi alternatif.** Bila Groq tidak tersedia, audio dapat dikirim ke Gemini.

### Cara video diproses

| Sumber | Perlakuan |
| --- | --- |
| YouTube publik | Dikirim langsung sebagai `file_data.file_uri` |
| URL langsung ke berkas video | Diunduh server (maks 120 MB), diunggah ke Gemini File API, diproses |
| Unggahan berkas | Diunggah ke Gemini File API |

Server menunggu status berkas `ACTIVE` sebelum meminta analisis. Jika URL tidak dapat diakses,
respons yang dikembalikan adalah pesan kesalahan yang jelas — bukan klaim berhasil.

**Yang tidak didukung:** tautan yang memerlukan login, halaman streaming (bukan berkas), dan DRM.
Untuk kasus itu, unduh videonya sendiri lalu unggah sebagai berkas.

### Batas

- Video maksimal 120 MB (dapat diubah di `src/lib/constants.ts`).
- Model `gemini-2.5-flash` cukup untuk analisis; `gemini-2.5-pro` lebih teliti tetapi lebih lambat
  dan mahal.
- Kuota gratis Gemini dibatasi per menit dan per hari.

---

## 3. Groq Whisper

**Dapatkan kunci:** <https://console.groq.com/keys>

```env
GROQ_API_KEY=gsk_...
GROQ_WHISPER_MODEL=whisper-large-v3
```

### Model

| Model | Catatan |
| --- | --- |
| `whisper-large-v3` | Akurasi terbaik untuk Bahasa Indonesia |
| `whisper-large-v3-turbo` | Lebih cepat, sedikit kurang akurat |
| `distil-whisper-large-v3-en` | Hanya bahasa Inggris |

### Batas

- Berkas maksimal **25 MB** per permintaan (batas Groq).
- Format: MP3, WAV, M4A, WebM, OGG, FLAC, AAC.
- Untuk rekaman lebih panjang, potong menjadi beberapa bagian (mis. dengan Audacity) lalu
  transkripsi terpisah.
- `response_format=verbose_json` dipakai agar durasi dan bahasa ikut dikembalikan.

### Tip kualitas

- Rekam di ruangan tanpa gema; mikrofon dekat mulut.
- Untuk cerita lisan berbahasa daerah, isi `language=id` — Whisper akan menormalkan ke ejaan
  Indonesia tanpa menghilangkan diksi.
- Transkrip selalu dapat diedit sebelum disimpan. Lakukan koreksi nama orang dan tempat; itulah
  bagian yang paling sering salah.

---

## Perutean & fallback

```env
AI_PRIMARY_PROVIDER=openrouter
AI_FALLBACK_PROVIDER=gemini
```

Alur di `src/app/api/ai/route.ts`:

1. Provider yang diminta (dari klien) atau `AI_PRIMARY_PROVIDER`.
2. Jika kunci tidak ada atau permintaan gagal → coba `AI_FALLBACK_PROVIDER` (jika berbeda dan bukan
   Groq, karena Groq tidak melayani teks).
3. Jika semua gagal → HTTP 502 dengan pesan gabungan.
4. Jika tidak ada kunci sama sekali → HTTP 412 dengan `needsConfiguration: true`, yang memunculkan
   tautan ke AI Settings di antarmuka.

Respons menyertakan `provider`, `model`, dan `fallbackUsed` agar Anda tahu siapa yang menjawab.

---

## Penyimpanan kunci

Dua jalur, keduanya di server:

**A. Environment variable** (disarankan untuk produksi)

Dibaca saat proses start. Tidak dapat diubah dari UI.

**B. Antarmuka AI Settings** (nyaman untuk lokal/VPS)

- Ditulis ke `.data/keys.json`.
- Dienkripsi AES-256-GCM; kunci enkripsi dari `TEROR_SECRET_KEY` atau `.data/.cipher-key`.
- Berkas dibuat dengan mode `0600`.
- Hanya tersedia bila sistem berkas dapat ditulis. Di Vercel, tombol simpan akan mengembalikan
  pesan bahwa penyimpanan tidak tersedia.

Prioritas: environment variable menang atas kunci tersimpan. UI menandai sumbernya (`ENV` atau
`Tersimpan`), dan tombol hapus hanya muncul untuk kunci tersimpan.

---

## Menambah provider baru

Arsitektur sengaja dibuat terbuka:

1. Tambahkan id provider di `src/lib/server/secrets.ts` (`ProviderId`, `ENV_KEYS`).
2. Tambahkan implementasi panggilan di `src/lib/server/ai.ts`.
3. Daftarkan di `src/lib/server/registry.ts` (`PROVIDER_META`).
4. Perluas `providerEnum` di `src/app/api/providers/route.ts`.

UI akan otomatis menampilkan kartu provider baru karena daftar berasal dari `/api/providers`.

Provider lokal (Ollama, LM Studio, vLLM) dapat ditambahkan dengan pola yang sama — cukup arahkan
`fetch` ke `http://localhost:11434/v1/chat/completions` dan set model sesuai yang tersedia.
