# 🪖 KARYO OS
- [Struktur Proyek](#struktur-proyek)
- [Konfigurasi Supabase](#konfigurasi-supabase)
- [Deploy ke Netlify](#deploy-ke-netlify)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Kontribusi](#kontribusi)
## Tentang Sistem

**Karyo OS** adalah sistem manajemen operasional berbasis web yang dirancang untuk unit militer Indonesia. Sistem ini memungkinkan pengelolaan personel, tugas, kehadiran, dan komunikasi antar hierarki secara digital.

Sistem menggunakan autentikasi berbasis **NRP (Nomor Registrasi Pokok)** dan **PIN 6 digit** — tanpa email, tanpa password kompleks — sesuai kebutuhan lapangan militer.

### Mengapa Karyo OS?

### Gate Pass & QR Scanner

KARYO OS menggunakan fitur QR untuk gate pass dan pemeriksaan keluar/masuk. Pastikan dependensi berikut terpasang:

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
| **Netlify** | — | Hosting & Deployment |

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

### 🪖 Dashboard Prajurit
- Lihat & kerjakan tugas harian
- Absensi check-in / check-out
- Kirim laporan tugas ke komandan
- Permintaan izin (cuti/sakit)
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
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/          # Button, Input, Modal, Badge, dll
│   │   ├── layout/          # Sidebar, Navbar, BottomTabBar
│   │   └── ui/              # Card, Table, Chart, dll
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useUsers.ts
│   │   └── useTasks.ts
│   ├── lib/
│   │   └── supabase.ts      # Supabase client
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   ├── AuditLog.tsx
│   │   │   ├── Logistics.tsx
│   │   │   └── Settings.tsx
│   │   ├── komandan/
│   │   │   ├── KomandanDashboard.tsx
│   │   │   ├── TaskManagement.tsx
│   │   │   ├── Personnel.tsx
│   │   │   └── Reports.tsx
│   │   └── prajurit/
│   │       ├── PrajuritDashboard.tsx
│   │       ├── MyTasks.tsx
│   │       ├── Attendance.tsx
│   │       └── Profile.tsx
│   ├── router/
│   │   ├── index.tsx        # Route definitions
│   │   ├── ProtectedRoute.tsx
│   │   └── RoleGuard.tsx
│   ├── store/
│   │   ├── authStore.ts     # Zustand auth state
│   │   └── uiStore.ts       # UI state (dark mode, dll)
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces
│   ├── utils/
│   │   └── helpers.ts
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── migrations/
│       └── 001_init.sql     # Initial schema
├── .env.example
├── .gitignore
├── index.html
├── netlify.toml
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Setup Development

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x atau pnpm >= 8.x
- Akun [Supabase](https://supabase.com)
- Akun [Netlify](https://netlify.com)

### 1. Clone Repositori

```bash
git clone https://github.com/username/karyo-os.git
cd karyo-os
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env.local
```

Isi `.env.local` dengan nilai dari dashboard Supabase kamu (lihat bagian [Environment Variables](#environment-variables)).

### 4. Setup Database

Jalankan migration di Supabase SQL Editor (lihat bagian [Database Schema](#database-schema)).

### 5. Jalankan Dev Server

```bash
npm run dev
```

Akses di `http://localhost:5173`

### 6. Build untuk Production

```bash
npm run build
```

---

## Konfigurasi Supabase

### 1. Buat Project Baru

- Buka [supabase.com](https://supabase.com) → New Project
- Catat `Project URL` dan `anon key` dari **Settings → API**

### 2. Jalankan SQL Migration

Di Supabase Dashboard → **SQL Editor**, jalankan file `supabase/migrations/001_init.sql`.

### 3. Konfigurasi Row Level Security (RLS)

RLS diaktifkan pada semua tabel. Policy sudah termasuk dalam migration file.

### 4. Seed Data Awal (Opsional)

```sql
-- Contoh insert user admin pertama
INSERT INTO users (nrp, pin_hash, nama, role, satuan)
VALUES ('100001', crypt('123456', gen_salt('bf')), 'Administrator', 'admin', 'MABES');
```

> Gunakan ekstensi `pgcrypto` untuk hashing PIN. Sudah diaktifkan di migration.

---

## Deploy ke Netlify

### Metode 1: Via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Init project
netlify init

# Deploy
netlify deploy --prod
```

### Metode 2: Via Netlify Dashboard (Recommended)

1. Push kode ke GitHub
2. Buka [netlify.com](https://netlify.com) → **Add new site → Import an existing project**
3. Hubungkan ke repositori GitHub
4. Konfigurasi build:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Tambahkan environment variables (lihat bagian [Environment Variables](#environment-variables))
6. Klik **Deploy site**

### Konfigurasi `netlify.toml`

File ini sudah ada di root proyek:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

> **Penting:** Redirect `/*` ke `index.html` wajib ada agar React Router berfungsi di Netlify.

---

## Environment Variables

Buat file `.env.local` (development) atau set di Netlify Dashboard (production):

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Config
VITE_APP_NAME=Karyo OS
VITE_APP_VERSION=1.0.0
```

> **Penting:** Semua env variable yang diakses dari frontend React **wajib** diawali dengan `VITE_`.

### Cara Mendapatkan Nilai Supabase

1. Buka Supabase Dashboard → Pilih project kamu
2. Klik **Settings** (ikon gear) → **API**
3. Salin nilai **Project URL** → `VITE_SUPABASE_URL`
4. Salin nilai **anon public** → `VITE_SUPABASE_ANON_KEY`

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
