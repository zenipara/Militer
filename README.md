# 🪖 KARYO OS
- [Struktur Proyek](#struktur-proyek)
- [Setup & Deploy via Terminal (Codespace)](#setup--deploy-via-terminal-codespace)
- [Konfigurasi Supabase](#konfigurasi-supabase)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Kontribusi](#kontribusi)
## Tentang Sistem

**Karyo OS** adalah sistem manajemen operasional berbasis web yang dirancang untuk unit militer Indonesia. Sistem ini memungkinkan pengelolaan personel, tugas, kehadiran, dan komunikasi antar hierarki secara digital.

Sistem menggunakan autentikasi berbasis **NRP (Nomor Registrasi Pokok)** dan **PIN 6 digit** — tanpa email, tanpa password kompleks — sesuai kebutuhan lapangan militer.

### Mengapa Karyo OS?

### Gate Pass & QR Scanner

KARYO OS menggunakan alur Gate Pass dengan pengajuan otomatis disetujui, lalu verifikasi keluar dan kembali lewat scan QR statis di Pos Jaga. Pastikan dependensi berikut terpasang:

```
npm install qrcode.react html5-qrcode
```

| Masalah Konvensional | Solusi Karyo OS |
|---|---|
| Absensi manual rawan manipulasi | Sistem check-in/out digital tercatat real-time |
| Distribusi tugas via lisan/kertas | Task management terpusat dengan tracking status |
| Pelaporan lambat & tidak terstruktur | Laporan digital langsung ke komandan |
| Data personel tersebar | Satu database terpusat dengan RBAC ketat |

---

## Tech Stack

| Teknologi | Versi | Kegunaan |
|---|---|---|
| **React** | 19.x | UI Framework |
| **Vite** | 6.x | Build Tool & Dev Server |
| **TypeScript** | 5.x | Type Safety |
| **Supabase** | latest | Database, Auth, Realtime |
| **Zustand** | 5.x | State Management |
| **Tailwind CSS** | 4.x | Styling |
| **React Router** | 6.x | Client-side Routing |
| **GitHub Pages** | — | Hosting & Deployment |

---

## Pengujian

Semua pengujian sekarang ditempatkan di folder terpusat `src/tests`.

Gunakan perintah berikut untuk menjalankan tes:

```bash
npm test
```

Untuk menjalankan unit test saja:

```bash
npm run test:unit
```

Untuk menjalankan test halaman / e2e:

```bash
npm run test:e2e
```

Untuk menjalankan report cakupan:

```bash
npm run test:coverage
```

Untuk menjalankan smoke test ke environment production (Playwright):

```bash
E2E_BASE_URL=https://yuniamagsila.github.io/v/ npm run test:smoke:prod
```

Workflow GitHub Actions manual juga tersedia di `.github/workflows/production-smoke.yml`.
Gunakan menu **Actions → Production Smoke → Run workflow**, lalu isi `base_url` jika ingin menguji URL lain.

Hasil cakupan dibuat di folder `coverage/`, dan konfigurasi pengujian sudah mengabaikan direktori internal (`src/tests`) serta file entry app (`src/main.tsx`).

---

## Fitur Utama

### 🔐 Autentikasi
- Login tunggal via NRP + PIN 6 digit
- Redirect otomatis ke dashboard sesuai role
- Session management dengan Supabase
- Proteksi route berbasis role (RBAC)

### 🖥️ Dashboard Admin
- Manajemen user (CRUD, reset PIN massal)
- Audit log seluruh aktivitas sistem
- Monitoring status online/offline user
- Import & export data personel (CSV)
- Manajemen logistik & arsip dokumen
- Broadcast pengumuman ke semua user
- Pengaturan shift & jadwal global
- Rekap kehadiran global
- Monitoring Gate Pass keluar, kembali, dan overdue
- Backup & restore database
- Kalender global satuan

### 👨‍✈️ Dashboard Komandan
- Monitoring anggota unit secara real-time
- Assign, kelola & approval tugas
- Laporan harian unit
- Tracking kehadiran per anggota
- Grafik kinerja & perbandingan performa
- Catatan evaluasi & disiplin personel
- Permintaan logistik ke admin
- Broadcast instruksi ke unit
- Ringkasan status Gate Pass operasional unit

### 🪖 Dashboard Prajurit
- Lihat & kerjakan tugas harian
- Absensi check-in / check-out
- Kirim laporan tugas ke komandan
- Permintaan izin (cuti/sakit)
- Pengajuan Gate Pass dengan auto-approve lalu scan Pos Jaga
- Inbox pesan & notifikasi perintah
- Download dokumen
- Statistik & riwayat pribadi
- Mode gelap

---

## Hierarki & Role

```
┌─────────────────┐
│      ADMIN      │  → Pengatur sistem & pengambil keputusan tertinggi
└────────┬────────┘
         │
┌────────▼────────┐
│   KOMANDAN      │  → Pengatur operasional & pemimpin unit
└────────┬────────┘
         │
┌────────▼────────┐
│    PRAJURIT     │  → Pelaksana tugas & pengguna utama sistem
└─────────────────┘
```

| Role | Kode | Akses |
|---|---|---|
| `admin` | AD | Full system control |
| `komandan` | KMD | Unit management |
| `prajurit` | PRJ | Personal tasks & attendance |
| `guard` | GRD | Gate pass scanning & verification |

---

## Alur Login

```
[Halaman Login]
      │
      ▼
Masukkan NRP + PIN
      │
      ▼
Validasi ke Supabase DB
      │
   ┌──┴──┐
 Gagal   Berhasil
   │        │
   ▼        ▼
Error   Baca role dari DB
        │
   ┌────┴─────────┐
   │              │              │
   ▼              ▼              ▼
/admin       /komandan      /prajurit
```

> Satu halaman login (`/login`) — redirect otomatis berdasarkan field `role` di tabel `users`.

---

## Struktur Proyek

```
karyo-os/
├── .github/workflows/       # CI, deploy, smoke test production
├── e2e/                     # Playwright end-to-end tests
├── public/                  # Aset statis (404 fallback, service worker, favicon)
├── scripts/                 # setup.sh dan deploy.sh
├── src/
│   ├── components/          # Komponen UI, layout, guard, gatepass
│   ├── hooks/               # Custom hooks domain aplikasi
│   ├── lib/                 # API client, cache, metrics, Supabase helper
│   ├── pages/               # Halaman per role: admin, komandan, prajurit, guard
│   ├── router/              # Definisi route + proteksi role
│   ├── store/               # Zustand store global
│   ├── tests/               # Unit/integration tests (Vitest)
│   ├── types/               # TypeScript types + declaration file
│   ├── utils/               # Utility umum
│   └── main.tsx             # Entry point aplikasi
├── supabase/migrations/     # SQL migration schema + RLS + function
├── .env.example
├── package.json
└── vite.config.js
```

---

## Setup & Deploy via Terminal (Codespace)

> **Cara tercepat** — jalankan dari terminal GitHub Codespaces atau Linux.

### Prasyarat

- Node.js >= 20.x
- Akun [Supabase](https://supabase.com) + project yang sudah dibuat
- Akun GitHub dengan GitHub Pages aktif

### 1. Clone & Setup Pertama Kali

```bash
git clone https://github.com/username/karyo-os.git
cd karyo-os

# Satu perintah untuk semua: install CLI, setup env, migrasi DB, build
bash scripts/setup.sh
```

Script `setup.sh` akan secara interaktif:
- Install Supabase CLI
- Membuat `.env.local` (prompt masukkan URL + anon key Supabase)
- Login & link ke project Supabase
- Menjalankan semua migration database
- Build production

### 2. Jalankan Dev Server

```bash
npm run dev
```

Akses di `http://localhost:5173`

### 3. Deploy ke Supabase + GitHub Pages

```bash
bash scripts/deploy.sh
```

Script `deploy.sh` akan otomatis:
- Menerapkan migration terbaru ke Supabase
- Build production (`npm run build`)
- Menyiapkan artefak frontend untuk GitHub Pages
- GitHub Actions yang mendorong deployment production

Untuk deploy ulang frontend, push ke branch `main` atau jalankan workflow GitHub Actions deploy production.

---

## Konfigurasi Supabase

### Cara Mendapatkan Credentials

1. Buka [supabase.com](https://supabase.com) → pilih project
2. **Settings** → **API** → catat:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
3. **Settings** → **General** → catat **Reference ID** (digunakan saat `supabase link`)

### Migration Database

Migration dijalankan otomatis via `bash scripts/setup.sh`. Untuk menjalankan manual:

```bash
npm run sync:supabase
```

Perintah di atas membaca `SUPABASE_ACCESS_TOKEN` dan `SUPABASE_PROJECT_REF` (atau menurunkan project ref dari `VITE_SUPABASE_URL`) lalu menjalankan link + `db push` secara non-interaktif.
Script juga otomatis mendukung nama secret alternatif: `SUPABASE_TOKEN` dan `SUPABASE_PROJECT_ID`.

File migration tersedia di `supabase/migrations/` dengan urutan:
- `001_initial_schema.sql` — Tabel, RPC, trigger, RLS dev
- `002_seed_data.sql` — Data sample (opsional, development)
- `003_server_functions.sql` — Fungsi server-side tambahan
- `004_production_rls.sql` — Policy RLS production (wajib sebelum go-live)

> RLS diaktifkan pada semua tabel. Policy sudah termasuk dalam migration file.

---

## Environment Variables

File `.env.local` dibuat otomatis oleh `bash scripts/setup.sh`. Format:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase CLI Sync (opsional)
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx
SUPABASE_PROJECT_REF=xxxxxxxxxxxx
# Alternatif naming secret juga didukung:
SUPABASE_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx
SUPABASE_PROJECT_ID=xxxxxxxxxxxx

# App Config
VITE_APP_NAME=Karyo OS
VITE_APP_VERSION=1.2.1
```

> **Penting:** Semua env variable frontend React **wajib** diawali `VITE_`. File `.env.local` tidak boleh di-commit ke Git (sudah ada di `.gitignore`).

Untuk production, simpan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di GitHub repository secrets atau variables yang dipakai workflow. Secara lokal, `.env.local` tetap dipakai oleh `bash scripts/deploy.sh`. Contoh format:

```bash
VITE_SUPABASE_URL="https://xxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGci..."
```

Jika ingin workflow GitHub Actions juga menjalankan migration database saat deploy, tambahkan secrets atau variables berikut:

```bash
SUPABASE_ACCESS_TOKEN="<personal access token>"
SUPABASE_PROJECT_REF="<reference id project>"
SUPABASE_DB_PASSWORD="<password database postgres>"
```

Workflow deploy produksi sekarang hanya membangun frontend dan mengirim artefak ke GitHub Pages. Migrasi Supabase dijalankan terpisah lewat CLI sebelum deploy jika memang diperlukan.
> Penting: pastikan migration `019_request_context_from_headers.sql` ikut terpasang di Supabase production. Tanpa migration ini, login bisa sukses tetapi fungsi dashboard akan gagal karena konteks RLS tidak dikirim di setiap request.

### Rekomendasi Migrasi Hosting (disarankan)

Karena aplikasi memakai Supabase + sinkronisasi realtime lintas dashboard, GitHub Pages sering menjadi bottleneck saat membutuhkan endpoint server-side tambahan (webhook, cron, signed operation, fallback auth flow). Disarankan migrasi ke:

- **Cloudflare Pages + Functions** (latensi global rendah, edge runtime, mudah untuk webhook ringan), atau
- **Railway** (runtime Node penuh, mudah untuk worker/background jobs dan API internal).

Arsitektur target yang direkomendasikan:

1. Frontend tetap build Vite, deploy ke Cloudflare Pages / Railway static output.
2. Tambahkan layer function server-side untuk operasi yang tidak ideal dijalankan di client.
3. Simpan semua secret hanya di environment platform deploy (bukan di browser).
4. Pertahankan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` untuk frontend, dan gunakan key server-side terpisah hanya di functions.
5. Aktifkan health check + log terpusat agar issue sinkronisasi realtime lebih cepat didiagnosis.

---

## Database Schema

Berikut ringkasan tabel utama. Migration lengkap ada di `supabase/migrations/001_init.sql`.

### Tabel `users`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid | Primary key |
| `nrp` | varchar(20) | Nomor Registrasi Pokok (unique) |
| `pin_hash` | text | PIN 6 digit (bcrypt hash) |
| `nama` | varchar(100) | Nama lengkap |
| `role` | enum | `admin` / `komandan` / `prajurit` |
| `satuan` | varchar(100) | Satuan/unit militer |
| `pangkat` | varchar(50) | Pangkat militer |
| `is_active` | boolean | Status aktif akun |
| `last_login` | timestamptz | Waktu login terakhir |
| `created_at` | timestamptz | Waktu dibuat |

### Tabel `tasks`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid | Primary key |
| `judul` | varchar(200) | Judul tugas |
| `deskripsi` | text | Detail tugas |
| `assigned_to` | uuid → users | Prajurit penerima tugas |
| `assigned_by` | uuid → users | Komandan pemberi tugas |
| `status` | enum | `pending` / `in_progress` / `done` / `approved` |
| `deadline` | timestamptz | Batas waktu |
| `created_at` | timestamptz | Waktu dibuat |

### Tabel `attendance`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid → users | Prajurit |
| `check_in` | timestamptz | Waktu masuk |
| `check_out` | timestamptz | Waktu keluar |
| `status` | enum | `hadir` / `izin` / `sakit` / `alpa` |
| `tanggal` | date | Tanggal kehadiran |

### Tabel `audit_logs`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid → users | Pelaku aksi |
| `action` | varchar(100) | Jenis aksi |
| `detail` | jsonb | Detail aksi |
| `ip_address` | inet | IP address |
| `created_at` | timestamptz | Waktu kejadian |

---

## Scripts NPM

```bash
npm run dev          # Jalankan dev server
npm run build        # Build production
npm run preview      # Preview build lokal
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

---

## Kontribusi

1. Fork repositori ini
2. Buat branch baru: `git checkout -b feat/nama-fitur`
3. Commit perubahan: `git commit -m "feat: tambah fitur X"`
4. Push ke branch: `git push origin feat/nama-fitur`
5. Buat Pull Request

### Konvensi Commit

```
feat:     Fitur baru
fix:      Perbaikan bug
docs:     Perubahan dokumentasi
style:    Format kode (tanpa logic change)
refactor: Refactoring kode
test:     Tambah/ubah test
chore:    Maintenance
```

---

## Lisensi

Copyright © 2026 Nafal Faturizki. All rights reserved.

---

<div align="center">
  <strong>KARYO OS</strong> — Dibangun untuk efisiensi operasional satuan militer Indonesia 🇮🇩
</div>
