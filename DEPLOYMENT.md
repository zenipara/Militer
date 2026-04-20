# 🚀 Panduan Deployment KARYO OS

Panduan lengkap untuk setup, konfigurasi, dan deploy **KARYO OS** ke Supabase + GitHub Pages.

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Setup Pertama Kali](#2-setup-pertama-kali)
3. [Environment Variables](#3-environment-variables)
4. [GitHub Secrets untuk CI/CD](#4-github-secrets-untuk-cicd)
5. [Migrasi Database](#5-migrasi-database)
6. [Deploy ke GitHub Pages](#6-deploy-ke-github-pages)
7. [Seed Data Sample](#7-seed-data-sample)
8. [Verifikasi Deploy](#8-verifikasi-deploy)
9. [Referensi Perintah CLI](#9-referensi-perintah-cli)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| **Node.js >= 20.x** | Tersedia di Codespaces atau install di lokal |
| **Akun Supabase** | Daftar gratis di [supabase.com](https://supabase.com) |
| **Supabase Project** | Buat project baru, catat **Project URL**, **anon key**, dan **Reference ID** |
| **Akun GitHub** | Repository dideploy ke GitHub Pages via GitHub Actions |

### Cara mendapatkan Supabase credentials

1. Buka [supabase.com](https://supabase.com) → pilih project
2. **Settings → API** → catat:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
3. **Settings → General** → catat **Reference ID** → untuk `SUPABASE_PROJECT_REF`

> ⚠️ Gunakan hanya `anon public` key di frontend. Jangan gunakan `service_role` key.

---

## 2. Setup Pertama Kali

Jalankan satu perintah ini dari terminal GitHub Codespaces atau Linux:

```bash
bash scripts/setup.sh
```

Script ini otomatis akan:

| Langkah | Deskripsi |
|---|---|
| ✅ Cek Node.js | Memastikan versi >= 20 |
| ✅ Install dependensi | `npm ci` |
| ✅ Buat `.env.local` | Interaktif — masukkan URL + anon key Supabase |
| ✅ Login Supabase | `supabase login` |
| ✅ Link project | `supabase link --project-ref <ID>` |
| ✅ Jalankan migrasi | `supabase db push` — semua file di `supabase/migrations/` |
| ✅ Build production | `npm run build` |

### Jalankan dev server

```bash
npm run dev
```

Akses di `http://localhost:5173`

---

## 3. Environment Variables

File `.env.local` dibuat otomatis oleh `bash scripts/setup.sh`. Format:

```env
# Supabase (wajib)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase CLI Sync (untuk db push dari CLI)
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx
SUPABASE_PROJECT_REF=xxxxxxxxxxxx

# Alternatif naming (juga didukung)
SUPABASE_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx
SUPABASE_PROJECT_ID=xxxxxxxxxxxx

# App Config (opsional)
VITE_APP_NAME=Karyo OS
VITE_APP_VERSION=1.5.0
```

> **Penting:** Semua env variable frontend React **wajib** diawali `VITE_`. File `.env.local` tidak boleh di-commit ke Git (sudah ada di `.gitignore`).

---

## 4. GitHub Secrets untuk CI/CD

GitHub Actions memerlukan env vars untuk build production. Tambahkan secrets berikut di:

```
Settings → Secrets and variables → Actions
```

### Secrets wajib (build frontend)

| Secret | Nilai |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anon public key dari Supabase |

### Secrets tambahan (jika migrasi dijalankan via workflow)

| Secret | Nilai |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Personal access token Supabase |
| `SUPABASE_PROJECT_REF` | Reference ID project |
| `SUPABASE_DB_PASSWORD` | Password database PostgreSQL |

> Workflow deploy produksi saat ini hanya membangun frontend. Migrasi Supabase dijalankan terpisah via CLI sebelum deploy.

---

## 5. Migrasi Database

Migrasi dijalankan otomatis via `bash scripts/setup.sh`. Untuk menjalankan manual:

```bash
npm run sync:supabase
```

File migration tersedia di `supabase/migrations/` dan dijalankan secara berurutan. Untuk push ulang:

```bash
supabase db push
```

Untuk verifikasi status migration:

```bash
supabase migration list
```

> **Penting:** Pastikan migration `019_request_context_from_headers.sql` sudah terpasang di Supabase production. Tanpa migration ini, login bisa sukses tetapi fungsi dashboard akan gagal karena konteks RLS tidak dikirim di setiap request.

---

## 6. Deploy ke GitHub Pages

### Via git push (otomatis)

```bash
git push origin main
```

Workflow `.github/workflows/deploy-production.yml` akan otomatis:
1. Build production bundle dengan `VITE_BASE_PATH=/v/`
2. Deploy ke GitHub Pages
3. Tersedia di: `https://yuniamagsila.github.io/v/`

### Via GitHub Actions (manual)

```
GitHub → Actions → "Deploy Production" → Run workflow → Branch: main
```

---

## 7. Seed Data Sample

> **Opsional** — hanya untuk development atau demo pertama kali.

```bash
# Data sample sudah termasuk di migration 002_seed_data.sql
# Jika belum dijalankan, push ulang:
supabase db push
```

Atau buat akun admin pertama secara manual:

```bash
supabase db execute --sql "SELECT public.create_user_with_pin('1000001','123456','Admin Karyo','admin','Batalyon 1','Letnan Kolonel','Komandan Batalyon');"
```

Data sample (PIN default: **123456**):

| NRP | Nama | Role | Satuan |
|---|---|---|---|
| `1000001` | Admin Karyo | `admin` | Batalyon 1 |
| `2000001` | Budi Santoso | `komandan` | Batalyon 1 |
| `3000001` | Agus Pratama | `prajurit` | Batalyon 1 |

> ⚠️ **Production:** Ganti PIN default segera setelah login pertama.

---

## 8. Verifikasi Deploy

### Checklist teknis

- [ ] GitHub Secrets sudah diset (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`)
- [ ] `npm run build` berhasil di lokal
- [ ] Migrations sudah di-push ke Supabase
- [ ] Halaman login terbuka di `https://yuniamagsila.github.io/v/`
- [ ] Console browser tidak ada error JavaScript kritis
- [ ] Service worker terdaftar

### Checklist alur utama

- [ ] Login sebagai admin, komandan, prajurit, guard — semua berhasil
- [ ] Dashboard Admin: data tampil, statistik muat, realtime sync berjalan
- [ ] Dashboard Komandan: data anggota, tugas, laporan tampil
- [ ] Dashboard Prajurit: tugas harian, absensi, pesan tampil
- [ ] Gate Pass: prajurit bisa mengajukan; guard bisa scan
- [ ] Feature Flags: admin bisa toggle fitur on/off dari Pengaturan

### Smoke test production (Playwright)

```bash
E2E_USE_WEBSERVER=false playwright test smoke-prod.spec.ts --project=chromium --reporter=line
```

Atau via workflow GitHub Actions:

```
GitHub → Actions → "Production Smoke" → Run workflow
  base_url: https://yuniamagsila.github.io/v/
```

### Cek konektivitas Supabase

```bash
# Cek status project
supabase status

# Cek tabel yang terbuat
supabase db execute --sql "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
"
```

---

## 9. Referensi Perintah CLI

### Supabase CLI

```bash
supabase login                        # Login ke Supabase
supabase projects list                # Daftar semua project
supabase link --project-ref <ID>      # Hubungkan ke project
supabase db push                      # Terapkan semua migration
supabase migration list               # Lihat daftar migration
supabase db execute --sql "<SQL>"     # Jalankan SQL langsung
supabase db execute --file <file.sql> # Jalankan file SQL
supabase status                       # Status project
supabase studio                       # Buka Supabase Studio di browser
```

### Script proyek

```bash
bash scripts/setup.sh    # Setup lengkap (sekali jalan)
bash scripts/deploy.sh   # Deploy migrasi Supabase + build frontend
npm run dev              # Dev server lokal
npm run build            # Build production
npm run lint             # ESLint
npm run type-check       # TypeScript check
npm test                 # Jalankan semua unit test (Vitest)
npm run test:coverage    # Coverage report
```

---

## 10. Troubleshooting

### ❌ `supabase: command not found`

```bash
npm install -g supabase
# atau
npx supabase --version
```

### ❌ `Error: project not linked`

```bash
supabase link --project-ref <PROJECT_REF_ID>
```

### ❌ `Function not found in schema cache`

```bash
supabase db execute --sql "select pg_notify('pgrst', 'reload schema');"
```

### ❌ Login berhasil, tapi semua aksi dashboard ditolak

Pastikan migration `019_request_context_from_headers.sql` sudah dijalankan di Supabase production. Migration ini membuat setiap request membawa header konteks RLS user.

### ❌ Build GitHub Pages gagal — env variable tidak terdeteksi

1. Buka Settings → Secrets and variables → Actions
2. Pastikan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sudah ada
3. Rerun workflow

### ❌ VITE_SUPABASE_URL / ANON_KEY salah target project

```bash
printenv | grep -E 'SUPABASE|VITE_SUPABASE'
# Bersihkan override
unset SUPABASE_PROJECT_ID VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY
```

### ⚡ Project Supabase "Paused" (Free Plan)

```bash
supabase projects list  # cek status project
# Buka https://supabase.com/dashboard → Restore project
```

### Rollback Frontend (kondisi darurat)

```
GitHub → Actions → "Deploy Production"
→ Cari run dari commit/tag yang terakhir berhasil
→ Klik "Re-run jobs"
```

---

### Rekomendasi Hosting Lanjutan

Karena aplikasi memakai Supabase + sinkronisasi realtime, GitHub Pages bisa menjadi bottleneck untuk kebutuhan server-side tambahan. Alternatif yang direkomendasikan:

- **Cloudflare Pages + Functions** — latensi global rendah, edge runtime
- **Railway** — runtime Node penuh, mudah untuk worker/background jobs

---

**Last Updated:** 2026-04-20  
**Status:** ✅ Ready for Deployment

<div align="center">
  <strong>KARYO OS</strong> — Setup & Deploy via Terminal 🇮🇩
</div>
