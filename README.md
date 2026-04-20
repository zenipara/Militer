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

### 🖥️ Dashboard Super Admin (`admin`)
- Konfigurasi sistem (branding, feature flags, pengaturan platform)
- Manajemen akun & reset PIN
- Audit log seluruh aktivitas sistem
- Backup & restore database
- Monitoring kesehatan sistem

### 👨‍✈️ Dashboard Komandan
- Monitoring anggota unit secara real-time
- Assign, kelola & approval tugas
- Laporan harian unit
- Tracking kehadiran per anggota
- Grafik kinerja & perbandingan performa
- Catatan evaluasi & disiplin personel
- Permintaan logistik ke Staf S-4
- Broadcast instruksi ke unit
- Ringkasan status Gate Pass operasional unit

### 🧭 Dashboard Staf (`staf`)
- **S-1 (Pers):** input/kelola absensi & permohonan izin
- **S-3 (Ops):** input/kelola tugas, jadwal shift, dan monitoring pos jaga
- **S-4 (Log):** input/kelola data logistik
- Dashboard otomatis memetakan bidang dari `jabatan` (`S-1`/`S-3`/`S-4`)

### 🚧 Petugas Jaga / Provost (`guard`)
- Validasi Gate Pass di pos jaga
- Pemindaian QR keluar/masuk
- Akses baca catatan disiplin (`discipline_notes`) untuk pemantauan personel

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
┌────────────────────────────┐
│ SUPER ADMIN (`admin`)      │ → Konfigurasi sistem & audit
└───────────────┬────────────┘
                │
┌───────────────▼────────────┐
│ KOMANDAN (`komandan`)      │ → Tier: BATALION/KOMPI/PELETON
└───────────────┬────────────┘
                │
┌───────────────▼────────────┐
│ STAF (`staf`)              │ → Bidang: S-1 / S-3 / S-4
└───────────────┬────────────┘
                │
┌───────────────▼────────────┐
│ PRAJURIT (`prajurit`)      │ → Operasional personal
└────────────────────────────┘
```

| Role | Kode | Akses |
|---|---|---|
| `admin` | SAD | Super Admin: konfigurasi sistem & audit |
| `komandan` | KMD | Komando bertingkat (BATALION/KOMPI/PELETON) |
| `staf` | STF | Input operasional sesuai bidang (S-1/S-3/S-4) |
| `prajurit` | PRJ | Personal tasks & attendance |
| `guard` | PJP | Petugas Jaga / Provost: scan gate pass + cek disiplin |

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
   ┌─────────┬─────────┬─────────┬─────────┐
   ▼         ▼         ▼         ▼         ▼
/admin   /komandan  /staf   /guard   /prajurit
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
│   ├── pages/               # Halaman per role: admin, komandan, staf, guard, prajurit
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

## Setup & Deploy

> **Panduan lengkap** tersedia di [DEPLOYMENT.md](./DEPLOYMENT.md).

### Quick Start

```bash
# Clone repo
git clone https://github.com/KARYO-OS/v.git
cd v

# Setup otomatis: install, env, migrasi DB, build
bash scripts/setup.sh

# Dev server
npm run dev
```

Akses di `http://localhost:5173`

```bash
# Deploy ke GitHub Pages
git push origin main
```

---

## Konfigurasi Supabase

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk panduan lengkap mendapatkan credentials dan menjalankan migrasi database.

---

## Environment Variables

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk format lengkap dan cara setup secrets GitHub Actions.

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
| `role` | enum | `admin` / `komandan` / `staf` / `guard` / `prajurit` |
| `level_komando` | enum | `BATALION` / `KOMPI` / `PELETON` (khusus `komandan`) |
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
