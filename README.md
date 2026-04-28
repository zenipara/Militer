# 🪖 KARYO OS - Sistem Manajemen Operasional Militer

**Karyo OS** adalah platform web terintegrasi untuk manajemen operasional unit militer dengan fokus pada **efisiensi**, **keamanan**, dan **skalabilitas**.

![Status](https://img.shields.io/badge/Status-Production%20Ready-green)
![Version](https://img.shields.io/badge/Version-1.5.0-blue)

---

## 🎯 Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| **🔐 Autentikasi NRP+PIN** | Login sederhana tanpa email/password kompleks |
| **👥 Manajemen Personel** | CRUD personel, role-based access, audit log |
| **✅ Manajemen Tugas** | Assign, track, dan report tugas real-time |
| **📋 Gate Pass & QR Scanner** | Sistem keluar-masuk digital dengan validasi auto |
| **📊 Dashboard Real-time** | Monitoring per-role dengan statistik live |
| **📱 Responsive Mobile-First** | Optimal di semua device, mode offline siap |
| **🚀 Scalable 600+ Users** | Optimized untuk 600+ personil concurrent |

---

## ⚡ Quick Start

### Prasyarat
- Node.js 18+
- Git
- Akun Supabase

### 1. Setup Lokal (2 menit)
```bash
git clone https://github.com/zenipara/Militer.git
cd Militer
npm install
cp .env.example .env.local
# Edit .env.local dengan Supabase credentials
npm run dev
```

### 2. Produktif (Codespace)
```bash
# Automatic setup
bash scripts/setup.sh

# Run dev server
npm run dev

# Akses http://localhost:5173
```

### 3. Build & Deploy
```bash
npm run build          # Build production
npm run test:e2e       # Test end-to-end
npm run deploy         # Deploy ke production
```

👉 **Panduan lengkap:** [GETTING_STARTED.md](./GETTING_STARTED.md)

---

## 📚 Dokumentasi

| Dokumen | Tujuan |
|---------|--------|
| [GETTING_STARTED.md](./GETTING_STARTED.md) | Setup pertama & development workflow |
| [FEATURES.md](./FEATURES.md) | Daftar lengkap fitur per-role |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deploy ke production, optimize 600+ users |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues & solusi |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Kontribusi & development guidelines |
| [CHANGELOG.md](./CHANGELOG.md) | Release notes & update history |
| [`/docs`](./docs) | Advanced docs (architecture, API, optimization) |

---

## 🏗️ Tech Stack

| Layer | Tech | Versi |
|-------|------|-------|
| **Frontend** | React + TypeScript + Tailwind | 19.x + 5.x + 4.x |
| **Build** | Vite | 6.x |
| **State** | Zustand | 5.x |
| **Database** | Supabase (PostgreSQL) | Latest |
| **Routing** | React Router | 6.x |
| **Testing** | Vitest + Playwright | Latest |

---

## 👥 Hierarki & Role

```
SUPER ADMIN
    ├─ KOMANDAN (Tier: Batalion/Kompi/Peleton)
    │   ├─ STAF (Bidang: S-1/S-3/S-4)
    │   └─ PRAJURIT (Operasional personal)
    └─ GUARD (Jaga di Pos)
```

Setiap role punya dashboard & permission terpisah. [Lihat detail fitur →](./FEATURES.md#role-permissions)

---

## 📊 Stats

- **Code**: 1,500+ TypeScript components
- **Database**: 82 migrations, 20+ RPC functions
- **Tests**: 50+ e2e tests via Playwright
- **Docs**: 7,000+ lines comprehensive documentation
- **Performance**: < 2s p95 latency @ 600 concurrent users

---

## 🚀 Deployment

### Production-Ready
- ✅ GitHub Actions CI/CD
- ✅ Supabase managed database
- ✅ GitHub Pages hosting
- ✅ Smoke tests automated
- ✅ Performance monitoring

👉 **Setup deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🤝 Kontribusi

Kami welcome contribution! Lihat [CONTRIBUTING.md](./CONTRIBUTING.md) untuk:
- Code standards & linting
- Testing requirements
- PR review process
- Setup development environment

---

## 📜 Lisensi

MIT License - Lihat file [LICENSE](./LICENSE)

---

## 📞 Kontak & Support

- 📧 Issues: [GitHub Issues](https://github.com/zenipara/Militer/issues)
- 📖 Docs: Complete guides di folder `/docs`
- 🐛 Bug Reports: Gunakan template issue GitHub

---

**Last Updated**: April 28, 2026 | **Maintained by**: zenipara  
[⬆ Back to Top](#-karyo-os---sistem-manajemen-operasional-militer)
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

# Verifikasi koneksi frontend -> Supabase
npm run check:supabase
```

Akses di `http://localhost:5173`

```bash
# Deploy ke GitHub Pages
git push origin main
```

---

## Konfigurasi Supabase

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk panduan lengkap mendapatkan credentials dan menjalankan migrasi database.

Untuk memastikan frontend benar-benar terhubung ke project Supabase yang benar:

```bash
npm run check:supabase
```

Jika ingin simulasi mode tanpa backend (offline/local UI only), gunakan:

```bash
npm run dev:offline
```

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
