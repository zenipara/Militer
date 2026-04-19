# Changelog — KARYO OS

Semua perubahan signifikan pada proyek ini didokumentasikan di sini.  
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), versi mengikuti [Semantic Versioning](https://semver.org/).

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

*Untuk panduan upgrade atau rollback, lihat [DEPLOYMENT_SETUP.md](./DEPLOYMENT_SETUP.md).*
