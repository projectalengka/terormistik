# Panduan API Key AI Gratis untuk TEROR MISTIK

> Dokumen ini menjelaskan cara mendapatkan API key AI **gratis** yang powerful untuk website TEROR MISTIK Anda.

---

## Ringkasan Provider Gratis

| Provider | Fungsi | Tier Gratis | Limitasi |
|---|---|---|---|
| **Google Gemini** | Teks, video, gambar | ✅ Gratis | ~15 RPM, 1 juta TPM/hari |
| **Groq Whisper** | Transkripsi audio | ✅ Gratis | 20 RPM, 28.800 detik audio/hari |
| OpenRouter | Model bahasa premium | ❌ Berbayar | Perlu kredit |

**Rekomendasi untuk mulai:**
1. **Gemini** sebagai primary (teks + video)
2. **Groq** untuk transkripsi audio
3. OpenRouter sebagai opsional nanti jika butuh model premium

---

## 1. Google Gemini API Key (Gratis)

### Langkah-langkah:

1. **Buka** https://aistudio.google.com/apikey
2. **Login** dengan akun Google Anda (bisa pakai `projectalengka@gmail.com` atau akun lain)
3. Klik tombol **"Create API key"**
4. Pilih project (atau buat project baru dengan nama "TEROR MISTIK")
5. **Copy API key** yang muncul — formatnya seperti `AIzaSy...` (panjang ~39 karakter)

### Cek limit gratis Anda:
- Buka https://aistudio.google.com/rate-limit
- Tier "Free" menunjukkan limit aktual Anda
- Biasanya: **15 requests/minute**, **1 juta tokens/minute**, **1.500 requests/hari**

### Model yang tersedia di tier gratis:
- `gemini-2.5-flash` ← **Rekomendasi** (cepat, cukup powerful)
- `gemini-2.0-flash` ← Alternatif lebih hemat
- `gemini-2.5-pro` ← Tersedia tapi limit lebih ketat

---

## 2. Groq API Key (Gratis)

### Langkah-langkah:

1. **Buka** https://console.groq.com/login
2. **Daftar** dengan email (bisa pakai Google login)
3. Masuk ke dashboard, klik menu **"API Keys"** di sidebar
4. Klik **"Create API Key"**
5. Beri nama (contoh: "TEROR MISTIK")
6. **Copy API key** — formatnya seperti `gsk_...` (panjang ~56 karakter)

### Cek limit gratis Anda:
- Buka https://console.groq.com/settings/limits
- **Whisper Large V3**: 20 RPM, 2.000 RPD, 7.200 detik audio/jam, 28.800 detik audio/hari
- **Whisper Large V3 Turbo**: limit sama tapi 2× lebih cepat

---

## 3. Cara Memasukkan Key ke TEROR MISTIK

### Opsi A: Lewat Website (Paling Mudah)

1. Login ke https://terormistik.vercel.app
2. Buka menu **"AI Settings"** (ikon gear di sidebar)
3. Masukkan key di form yang tersedia:
   - **Google Gemini**: paste key `AIzaSy...`
   - **Groq Whisper**: paste key `gsk_...`
4. Klik **"Simpan & Tes Koneksi"**
5. Jika muncul ✓ hijau, berarti terhubung!

Key akan disimpan terenkripsi (AES-256-GCM) di server.

### Opsi B: Lewat Environment Variable Vercel (Untuk Owner)

Jika Anda ingin key tersedia untuk semua pengguna secara default:

1. Buka https://vercel.com/alengkas-projects/terormistik/settings/environment-variables
2. Tambahkan variable:
   - `GEMINI_API_KEY` = key Gemini Anda
   - `GROQ_API_KEY` = key Groq Anda
   - `AI_PRIMARY_PROVIDER` = `gemini` (supaya Gemini jadi default)
3. **Redeploy** website

---

## 4. Tips Menghemat Kuota Gratis

### Gemini:
- **Potong teks panjang** sebelum kirim — semakin pendek input, semakin sedikit token
- **Gunakan `gemini-2.5-flash`** sebagai primary (lebih hemat dari Pro)
- Hindari mengirim video berdurasi sangat panjang (>10 menit)

### Groq:
- **Kompres audio** ke bitrate lebih rendah sebelum upload (mono 16kHz cukup untuk transkripsi)
- **Potong audio** yang hanya berisi kebisingan di awal/akhir
- Gunakan **Whisper Large V3 Turbo** (lebih cepat, limit sama)

### Umum:
- Fitur AI Writing Studio memiliki **rate limit 20 permintaan/menit** di aplikasi
- Jika muncul "Batas permintaan tercapai", tunggu 1-2 menit lalu coba lagi
- Aplikasi akan **retry otomatis** (2 kali) jika mendapat error 429 dari provider

---

## 5. Troubleshooting

### "Kunci Gemini tidak valid"
- Pastikan key diawali `AIzaSy`
- Coba buat key baru — key lama mungkin sudah expire
- Pastikan project di Google AI Studio aktif

### "Kuota Gemini tercapai"
- Anda sudah melebihi limit harian (biasanya 1.500 request/hari)
- Tunggu reset harian (midnight Pacific Time)
- Atau upgrade ke tier berbayar di Google AI Studio

### "Kunci Groq ditolak"
- Pastikan key diawali `gsk_`
- Groq kadang memerlukan verifikasi email setelah pendaftaran — cek inbox

### "Batas permintaan OpenRouter tercapai"
- OpenRouter bukan gratis — ini muncul jika Anda mencoba pakai OpenRouter tanpa kredit
- Ganti primary provider ke Gemini di AI Settings

---

## 6. Alternatif Gratis Lain (Opsional)

Jika butuh lebih banyak quota, provider gratis lain yang bisa ditambahkan:

| Provider | Cara Daftar | Limit |
|---|---|---|
| **Together AI** | together.ai | $5 kredit trial gratis |
| **Fireworks AI** | fireworks.ai | Trial 7 hari |
| **Cohere** | cohere.com | Trial gratis |

Namun, **Gemini + Groq sudah cukup** untuk kebutuhan penulisan harian.

---

## Ringkasan Perintah untuk Deploy

Setelah Anda mendapatkan key, beri tahu saya dan saya akan:

1. Masukkan key ke Vercel environment variables
2. Update `.env.local` untuk development
3. Redeploy website
4. Verifikasi koneksi ke semua provider

**Format yang saya butuhkan:**
```
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
```

---

*Dibuat: 1 November 2026*
*Untuk: TEROR MISTIK Horror Writing Studio*
