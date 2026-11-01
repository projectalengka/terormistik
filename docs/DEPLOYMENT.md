# Deployment

Aplikasi ini adalah Next.js App Router dengan dua Route Handler yang butuh Node runtime
(`/api/export/docx`, `/api/transcribe`, `/api/video`). Tidak ada dependency native di luar Node.

---

## Vercel (disarankan)

### 1. Push repositori

```bash
git init
git add .
git commit -m "TEROR MISTIK"
git remote add origin <repo-url>
git push -u origin main
```

Pastikan `.env.local` dan `.data/` tidak ikut ter-commit (sudah ada di `.gitignore`).

### 2. Import ke Vercel

1. <https://vercel.com/new> → pilih repositori.
2. Framework preset: **Next.js** (otomatis).
3. Tambahkan environment variable:

| Nama | Nilai |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://nama-app.vercel.app` |
| `OPENROUTER_API_KEY` | kunci OpenRouter |
| `GEMINI_API_KEY` | kunci Gemini |
| `GROQ_API_KEY` | kunci Groq |
| `AI_PRIMARY_PROVIDER` | `openrouter` |
| `AI_FALLBACK_PROVIDER` | `gemini` |
| `TEROR_SECRET_KEY` | string acak 32+ karakter |

4. Deploy.

### 3. Catatan penting untuk Vercel

- **Sistem berkas read-only.** Kunci yang disimpan lewat UI akan gagal (`EPERM`). Gunakan
  environment variable — UI sudah menampilkan peringatan bila penyimpanan tidak tersedia.
- **Batas durasi fungsi.** Route AI memakai `maxDuration = 120`, transkripsi dan video `300`.
  Pada paket Hobby, durasi maksimum 60 detik — transkripsi audio panjang atau video besar bisa
  terputus. Naikkan paket, atau jalankan di VPS.
- **Batas body request.** Vercel membatasi body 4.5 MB untuk paket Hobby/Pro. Unggahan audio
  hingga 25 MB dan video 120 MB **tidak akan lewat**. Untuk file besar, gunakan VPS/self-host,
  atau ubah alur menjadi unggah langsung ke Supabase Storage lalu kirim path ke server.

### 4. Domain & keamanan

- Set `NEXT_PUBLIC_SITE_URL` agar header `HTTP-Referer` OpenRouter benar.
- Aktifkan **Deployment Protection** bila ingin menambah lapisan akses.
- Tambahkan URL produksi ke **Supabase → Authentication → URL Configuration** (Site URL dan
  Redirect URLs) agar tautan pemulihan kata sandi bekerja.

---

## VPS / self-host (Node)

Cocok bila Anda ingin unggahan besar dan penyimpanan kunci lewat UI.

### 1. Siapkan server

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Deploy

```bash
git clone <repo-url> /var/www/teror-mistik
cd /var/www/teror-mistik
npm ci
cp .env.example .env.local
nano .env.local          # isi kredensial
npm run build
```

### 3. Jalankan sebagai service

`/etc/systemd/system/teror-mistik.service`:

```ini
[Unit]
Description=TEROR MISTIK
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/teror-mistik
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now teror-mistik
sudo systemctl status teror-mistik
```

### 4. Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name arsip.domainanda.com;

    client_max_body_size 150M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

`client_max_body_size` dan `proxy_read_timeout` penting untuk unggahan media dan transkripsi.

### 5. HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d arsip.domainanda.com
```

### 6. Izin folder data

Kunci yang disimpan lewat UI ditulis ke `.data/`:

```bash
sudo mkdir -p /var/www/teror-mistik/.data
sudo chown -R www-data:www-data /var/www/teror-mistik/.data
sudo chmod 700 /var/www/teror-mistik/.data
```

Isi `TEROR_SECRET_KEY` di `.env.local` agar kunci tidak bergantung pada berkas lokal.

### 7. Backup terjadwal

```bash
# /etc/cron.daily/teror-mistik-backup
cd /var/www/teror-mistik
tar -czf /var/backups/teror-mistik-$(date +%F).tar.gz .data
```

Backup naskah dilakukan dari dalam aplikasi (**Archive & Backup → Unduh Backup**) atau langsung
dari Supabase (Database → Backups).

---

## Docker (opsional)

`Dockerfile`:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t teror-mistik .
docker run -d --name teror-mistik -p 3000:3000 --env-file .env.local \
  -v $(pwd)/.data:/app/.data teror-mistik
```

Mount `.data` agar kunci yang disimpan lewat UI tetap ada setelah container dibuat ulang.

---

## Checklist sebelum dipakai serius

- [ ] `supabase/schema.sql` sudah dijalankan, RLS aktif.
- [ ] User owner sudah dibuat dan dikonfirmasi.
- [ ] `NEXT_PUBLIC_SITE_URL` sesuai domain produksi.
- [ ] `TEROR_SECRET_KEY` diisi nilai acak.
- [ ] Minimal satu provider AI terhubung dan lolos **Uji Koneksi**.
- [ ] Bucket `media` bersifat privat (bukan public).
- [ ] Backup pertama sudah diunduh dan disimpan di luar server.
- [ ] `robots.txt`/meta noindex tetap aktif (bawaan aplikasi).
- [ ] Uji unggah audio kecil dan transkripsi berhasil.
- [ ] Uji mode baca di ponsel, termasuk progress yang tersimpan.

---

## Pemantauan

`GET /api/health` mengembalikan status tanpa membocorkan kunci:

```json
{
  "ok": true,
  "backend": "supabase",
  "ai": {
    "primary": "openrouter",
    "fallback": "gemini",
    "providers": [
      { "id": "openrouter", "configured": true, "source": "env" },
      { "id": "gemini", "configured": true, "source": "env" },
      { "id": "groq", "configured": false, "source": null }
    ]
  }
}
```

Gunakan endpoint ini untuk uptime monitor. Jangan menambahkan detail kunci ke respons.
