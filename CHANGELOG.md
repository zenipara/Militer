# Changelog — KARYO OS

Semua perubahan signifikan pada proyek ini didokumentasikan di sini.  
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), versi mengikuti [Semantic Versioning](https://semver.org/).

---

## [1.5.0] - 2026-04-21

### 🐛 Perbaikan Bug Kritis
- **Gate Pass Auto-Approve**: Tambahkan tombol "Setujui Semua" untuk komandan bulk approve pending gate pass dengan konfirmasi dialog
- **CSV Import**: Fix session context validation - komandan dapat mengimpor data anggota dari file CSV di super admin tanpa error authentication
- **Barcode Print**: Perbaiki window.open() handling dengan proper null check dan user-friendly error message untuk popup yang terblokir
- **Real-time Sync**: Verify useGlobalRealtimeSync() aktif di semua dashboard untuk update data real-time
- **Role System**: Pastikan semua 5 role berfungsi dengan baik (admin, komandan, staf, guard, prajurit)
- **UI/UX Glitches**: Perbaiki component error handling dan missing prop validations

### 🔧 Config Update
- Update `.env` dengan Supabase production credentials
- Create `.env.production` untuk optimasi build
- Database endpoint: `https://upvrcaivdzuxozdwzvdq.supabase.co`

### ✅ Testing
- Semua role dapat login dan akses dashboard yang sesuai
- CSV import memproses file dengan proper error reporting
- Barcode print tidak mengalami error dengan popup yang terblokir
- Real-time data sync working untuk gate pass, tasks, announcements, messages
- Gate pass approval dengan bulk action berfungsi sempurna

---

## [Unreleased]

### Diubah
- Dokumentasi role diperbarui agar konsisten dengan struktur terbaru: **Super Admin**, **Komandan Tier (BATALION/KOMPI/PELETON)**, **Staf Bidang (S-1/S-3/S-4)**, **Petugas Jaga/Provost**, dan **Prajurit**.
- Terminologi `guard` pada dokumentasi diselaraskan menjadi **Petugas Jaga / Provost**.
- Penjelasan akses admin diperjelas: fokus pada konfigurasi sistem dan audit, bukan input operasional harian.
- **Logistics** — tombol "Tambah Item" dan "Tinjau" permintaan logistik kini hanya tampil untuk admin dan staf S-4; staf bidang lain mendapat label read-only.
- **AttendanceReport** — tambah tombol "Tambah Entri" untuk staf S-1 dan admin; buka modal input manual (personel, tanggal, status, check-in/out, keterangan). Tambah filter **per satuan** (dropdown semua satuan aktif).
- **Analytics** — tambah filter **per satuan** sehingga chart distribusi kehadiran dan personel dapat disaring per unit.
- **Settings** — tambah panel "Integrasi Cuaca (OpenWeatherMap)" untuk mengkonfigurasi API key dan nama kota; pratinjau widget langsung dari halaman pengaturan.

### Ditambahkan
- Fondasi implementasi database untuk penajaman akses per bidang staf (S-1/S-3/S-4), akses discipline notes untuk guard/provost, dan pembatasan akses operasional admin.
- Prompt instalasi PWA dari menu profil agar aplikasi dapat dipasang langsung ke perangkat saat browser mendukung `beforeinstallprompt`.
- **Halaman Analytics** (`/admin/analytics`): dashboard analitik lanjutan dengan chart distribusi status tugas, tingkat kehadiran harian, aktivitas tugas mingguan, distribusi role personel, gate pass bulan ini, dan leaderboard top-5 personel paling aktif.
- **Backup Otomatis Terjadwal**: pengaturan baru di Settings untuk mengaktifkan pencadangan data otomatis dengan interval yang dapat dikonfigurasi (1/3/7/14/30 hari) dan indikator kapan backup terakhir/berikutnya.
- Ikon baru ditambahkan: `TrendingUp`, `PieChart`, `Activity`, `Clock`.
- **`src/lib/rolePermissions.ts`**: utility RBAC lengkap — `canWrite(user, module)`, `getBidangFromJabatan`, `getKomandanScope`, `getKomandanScopeLabel`, `getKomandanScopeDescription`, `getOperationalRoleLabel`, `canReadDisciplineNotes`.
- **Hierarki Komandan** ditampilkan di dashboard & halaman personel: level BATALION/KOMPI/PELETON tampil di subtitle dan banner informasi cakupan akses data.
- **Guard: Catatan Disiplin** (`/guard/discipline`): halaman baru read-only untuk Petugas Jaga / Provost membaca catatan disiplin personel satuan, sesuai SPESIFIKASI §3.3.
- **Staf bidang write-guard** di TaskManagement, ShiftSchedule, Logistics, dan AttendanceReport: tombol buat/hapus hanya tampil jika staf memiliki bidang yang sesuai (S-3 untuk tugas & shift; S-4 untuk logistik; S-1 untuk absensi).
- **Halaman Izin Personel** (`/staf/leave-review`): staf S-1 dapat melihat dan memproses (setujui/tolak) permohonan izin dari personel satuan. Staf bidang lain hanya dapat membaca.
- Navigasi staf diperluas dengan item **Izin Personel** di Sidebar dan BottomTabBar.
- Navigasi guard diperluas dengan tab **Catatan Disiplin** di Sidebar dan BottomTabBar.
- Feature flag `leave_requests` mencakup path `/staf/leave-review`.
- Feature flag `reports` mencakup path `/guard/discipline`.

---

## [1.5.0] — 2026-04-20

### Ditambahkan
- **Role Staf Operasional**: role ke-5 (`staf`) untuk Pasi dan Bamin di bidang S-1, S-3, dan S-4.
- **StafDashboard**: halaman dasbor khusus `/staf/dashboard` dengan deteksi bidang otomatis (pers/log/ops) berdasarkan field `jabatan`, menampilkan statistik personel, kehadiran, tugas aktif, dan logistik pending.
- **Akses Modul Staf**: role `staf` mendapat akses ke Manajemen Personel, Rekap Absensi, Jadwal Shift, Logistik, Manajemen Tugas, Pos Jaga, dan Pesan — sesuai wewenang Staf Operasional.
- **Pesan untuk Staf**: rute `/staf/messages` untuk inbox dan kirim pesan antar personel.
- **RBAC lengkap 5 role**: Admin (Super Admin), Komandan, Staf Operasional, Guard (Personel Jaga), dan Prajurit — sesuai hierarki satuan TNI.

### Diubah
- `RoleBadge` menambahkan tampilan badge untuk role `staf` (warna warning/amber).
- Sidebar, BottomTabBar, dan Navbar diperbarui untuk mendukung navigasi role `staf`.
- Dropdown filter dan form buat user di UserManagement kini menyertakan pilihan role `staf` dan `guard`.
- ProtectedRoute, Login, dan GlobalSearch diperbarui dengan path default dan fallback untuk role `staf`.
- Feature flag `messages` mencakup path `/staf/messages`.
- Roadmap `SPESIFIKASI.md` diperbarui: Phase 2 (v1.5) ditandai selesai.

### Diperbaiki
- Karakter escape tidak perlu (`\/`) pada template HTML di `PosJagaQRCode.tsx` (lint error `no-useless-escape`).

---

## [1.2.1] — 2026-04-19

### Ditambahkan
- **Gate Pass & QR Scanner**: alur pengajuan oleh prajurit, auto-approve, verifikasi keluar/kembali via scan QR di Pos Jaga, monitoring real-time oleh admin dan komandan.
- **Guard Dashboard**: halaman khusus role `guard` untuk scan & verifikasi Gate Pass di pos jaga.
- **Feature Flags**: admin dapat mengaktifkan/menonaktifkan fitur per modul secara real-time via database tanpa rebuild.
- **Platform Branding**: konfigurasi nama satuan, tagline, dan logo yang tersimpan di database.
- **Backup & Restore**: ekspor seluruh data utama ke JSON terversi (`format v1.2`); restore via upsert dengan validasi versi dan kompatibilitas mundur ke `v1.0`.
- **Service Worker**: cache management statis berbasis nomor versi (`v1.2.1`) untuk GitHub Pages SPA — menggantikan cache berbasis timestamp yang tidak deterministik.
- **Auto-refresh Dashboard**: interval refresh otomatis yang dapat dikonfigurasi admin.
- **Display Density**: pilihan kerapatan tampilan (`comfortable` / `compact`) per preferensi pengguna.
- **Audit Log Cleanup**: penghapusan riwayat audit berdasar rentang waktu (7 hari, 30 hari, 90 hari, atau semua).
- **Global Realtime Sync**: sinkronisasi lintas tab/perangkat via Supabase Realtime subscription di semua dashboard.
- **Unit & E2E Tests**: suite pengujian lengkap dengan Vitest (unit/integration) dan Playwright (e2e + smoke production).
- **CI/CD Pipeline**: workflow otomatis lint, type-check, unit test, build, security scan (npm audit + Gitleaks), dan smoke production.
- **Workflow Rilis**: workflow GitHub Actions baru (`release.yml`) untuk validasi versi tag dan pembuatan GitHub Release otomatis via `softprops/action-gh-release@v2`.
- **Panduan Upgrade**: dokumen `UPGRADE_GUIDE.md` dengan prosedur lengkap untuk dev/ops/admin termasuk checklist rollback ke v1.0.1.
- **Request Coalescer & Cache TTL**: lapisan optimasi performa untuk mengurangi query redundan ke Supabase.
- **Metrics & Error Handling**: pengukuran page load, error boundary global, dan penanganan error terpusat.

### Diubah
- Backup format version dinaikkan dari `1.0` ke `1.2`; backup lama `v1.0` tetap dapat di-restore (backward compatible).
- Roadmap `SPESIFIKASI.md` diperbarui: Phase 1 & 1.5 ditandai selesai.
- Service Worker beralih dari cache berbasis timestamp ke cache berbasis versi aplikasi statis untuk konsistensi deployment.

### Dependensi Diperbarui

| Paket | Sebelum | Sesudah |
|-------|---------|---------|
| `@supabase/supabase-js` | ^2.49.4 | ^2.103.0 |
| `autoprefixer` | ^10.4.21 | ^10.5.0 |
| `postcss` | ^8.5.3 | ^8.5.10 |
| `typescript-eslint` | ^8.30.1 | ^8.58.0 |
| `@vitest/coverage-v8` | ^3.1.1 | ^3.2.0 |

> Major upgrade (`react-router-dom` v7, `vite` v8, `vitest` v4, `typescript` v6) ditahan untuk evaluasi di v1.3.x.

### Diperbaiki
- Proteksi route role-based kini mengevaluasi feature flags sebelum memberikan akses, mencegah akses ke modul yang dinonaktifkan.
- Reset input file restore sehingga file yang sama dapat dipilih ulang.

---

## [1.0.1] — 2026-04-01

### Ditambahkan
- Dashboard Admin: manajemen user, audit log, logistik, dokumen, pengumuman, jadwal shift, laporan kehadiran, pengaturan sistem.
- Dashboard Komandan: monitoring anggota, manajemen tugas, laporan, evaluasi, kehadiran, permintaan logistik.
- Dashboard Prajurit: tugas harian, absensi check-in/out, pesan, permohonan izin, profil.
- Autentikasi berbasis NRP + PIN 6 digit tanpa email.
- RBAC empat role: `admin`, `komandan`, `prajurit`, `guard`.
- Routing berbasis hash (`createHashRouter`) untuk kompatibilitas GitHub Pages.
- Lazy loading semua halaman dengan `React.lazy` + `Suspense`.
- Dark mode dan state global via Zustand.
- Supabase sebagai backend: PostgreSQL, Realtime, RLS.
- Migrations SQL bertahap (`001` s.d. `004`) termasuk RLS production.
- Deploy otomatis ke GitHub Pages via GitHub Actions.

---

## [1.0.0] — 2026-03-15

### Ditambahkan
- MVP awal: setup project (Vite + React 19 + TypeScript + Tailwind CSS 4).
- Skema database Supabase awal dan Row Level Security dasar.
- Halaman login dengan validasi NRP + PIN.
- Routing RBAC sederhana ke dashboard per role.

---

*Untuk panduan upgrade atau rollback, lihat [DEPLOYMENT.md](./DEPLOYMENT.md).*
