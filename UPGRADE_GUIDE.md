# 📦 Panduan Upgrade KARYO OS — v1.0.1 → v1.2.1

Dokumen ini ditujukan untuk tim **dev, ops, dan admin** yang melakukan atau memverifikasi upgrade dari versi 1.0.1 ke 1.2.1.

---

## Daftar Isi

1. [Ringkasan Perubahan](#1-ringkasan-perubahan)
2. [Breaking Changes](#2-breaking-changes)
3. [Pra-Upgrade: Checklist Persiapan](#3-pra-upgrade-checklist-persiapan)
4. [Prosedur Upgrade (Dev)](#4-prosedur-upgrade-dev)
5. [Prosedur Deploy (Ops)](#5-prosedur-deploy-ops)
6. [Checklist Verifikasi Pasca Deploy](#6-checklist-verifikasi-pasca-deploy)
7. [Rollback ke v1.0.1](#7-rollback-ke-v101)
8. [Perubahan Dependensi](#8-perubahan-dependensi)
9. [Catatan Operasional untuk Admin](#9-catatan-operasional-untuk-admin)

---

## 1. Ringkasan Perubahan

| Domain | Ringkasan |
|--------|-----------|
| **Versi** | `1.0.1` → `1.2.1` |
| **Gate Pass & QR** | Alur lengkap: pengajuan prajurit, scan pos jaga, monitoring admin/komandan |
| **Guard Dashboard** | Halaman baru role `guard` untuk verifikasi gate pass |
| **Feature Flags** | Admin dapat nonaktifkan modul tanpa rebuild aplikasi |
| **Backup & Restore** | Format backup dinaikkan ke `v1.2`; file backup `v1.0` tetap bisa di-restore |
| **Service Worker** | Cache version berubah dari timestamp ke `v1.2.1` statis |
| **CI/CD** | Tambahan workflow `release.yml` untuk release gate otomatis |
| **Dependensi** | Patch/minor upgrade: supabase-js, autoprefixer, postcss, typescript-eslint, vitest |

---

## 2. Breaking Changes

### ⚠️ Tidak ada breaking change di level UI/UX atau API

Upgrade ini sepenuhnya **backward compatible** bagi end-user. Tidak ada perubahan struktur database, alur autentikasi, atau format request/response API.

### Format Backup (Admin hanya)

- File backup yang di-ekspor sekarang menggunakan format `v1.2`
- File backup lama format `v1.0` **tetap bisa di-restore** (backward compatible)
- File backup dari versi yang tidak dikenal akan **diblokir** dengan pesan error eksplisit

### Service Worker Cache

- Setelah deploy, browser pengguna akan otomatis membersihkan cache lama karena cache key berubah dari timestamp ke `v1.2.1`
- **Aksi pengguna:** tidak diperlukan; cache baru diterima otomatis di kunjungan berikutnya

---

## 3. Pra-Upgrade: Checklist Persiapan

### Untuk Tim Dev

- [ ] Pastikan branch utama (`main`) dalam kondisi hijau (semua CI pass)
- [ ] Jalankan baseline test lokal: `npm run lint && npm run type-check && npm test`
- [ ] Backup snapshot database production sebelum deploy (gunakan fitur Export di halaman Pengaturan)
- [ ] Review `CHANGELOG.md` bagian `[1.2.1]` untuk semua perubahan

### Untuk Tim Ops

- [ ] Catat versi saat ini: `1.0.1` (untuk referensi rollback)
- [ ] Pastikan GitHub Secrets masih valid: `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`
- [ ] Cek tidak ada workflow CI yang sedang berjalan sebelum trigger deploy
- [ ] Siapkan akses ke GitHub Actions untuk monitoring

### Untuk Admin (Siaga)

- [ ] Lakukan export backup data dari halaman **Pengaturan → Ekspor Data** sebelum upgrade
- [ ] Catat nama file backup beserta tanggal export
- [ ] Siapkan akun admin aktif untuk verifikasi pasca deploy

---

## 4. Prosedur Upgrade (Dev)

### 4.1 Pull perubahan terbaru

```bash
git checkout main
git pull origin main
```

### 4.2 Install dependensi yang sudah diperbarui

```bash
npm ci
```

### 4.3 Validasi lokal penuh

```bash
npm run lint        # ESLint — harus 0 warning
npm run type-check  # TypeScript — harus 0 error
npm test            # 342 unit tests — harus semua pass
npm run build       # Production build — harus berhasil
```

### 4.4 Tag rilis

Versi di `package.json` **harus sama** dengan tag sebelum push:

```bash
git tag v1.2.1
git push origin v1.2.1
```

Workflow `release.yml` akan otomatis:
1. Validasi tag cocok dengan `package.json`
2. Jalankan CI penuh (lint, type-check, test, build, audit)
3. Buat GitHub Release dengan isi changelog

---

## 5. Prosedur Deploy (Ops)

### 5.1 Deploy via GitHub Actions (Rekomendasi)

Push ke `main` akan otomatis trigger workflow `deploy-production.yml`:

```
GitHub → yuniamagsila/v → Actions → "Deploy Production" → Run workflow
```

Atau push commit/tag ke `main`:
```bash
git push origin main
```

### 5.2 Verifikasi Workflow

```
GitHub → Actions → "Deploy Production" → Cek status setiap step
```

Semua step wajib hijau sebelum dinyatakan deploy berhasil:
- ✅ Checkout
- ✅ Setup Node.js
- ✅ Install dependencies
- ✅ Build production bundle
- ✅ Deploy to GitHub Pages

### 5.3 Smoke Test Post-Deploy

Jalankan smoke test production secara manual jika diperlukan:

```
GitHub → Actions → "Production Smoke" → Run workflow
  base_url: https://yuniamagsila.github.io/v/
  mode: extended
```

---

## 6. Checklist Verifikasi Pasca Deploy

### Verifikasi Teknis (Ops)

- [ ] Halaman login terbuka tanpa error di `https://yuniamagsila.github.io/v/`
- [ ] Versi aplikasi tampil `1.2.1` di footer atau header aplikasi (jika tersedia)
- [ ] Console browser tidak ada error JavaScript kritis
- [ ] Service worker terdaftar dan cache version = `v1.2.1`

### Verifikasi Alur Utama (Admin/QA)

- [ ] **Login**: masuk sebagai admin, komandan, prajurit, guard — semua berhasil
- [ ] **Dashboard Admin**: data tampil, statistik muat, realtime sync berjalan
- [ ] **Dashboard Komandan**: data anggota, tugas, laporan tampil
- [ ] **Dashboard Prajurit**: tugas harian, absensi, pesan tampil
- [ ] **Gate Pass**: prajurit bisa mengajukan; komandan bisa approve/tolak; guard bisa scan
- [ ] **Scan Pos Jaga**: QR code terbaca, status check-in/check-out tercatat
- [ ] **Monitoring Gate Pass**: admin dan komandan bisa melihat log real-time
- [ ] **Feature Flags**: admin bisa toggle fitur on/off dari Pengaturan
- [ ] **Backup Export**: file JSON berhasil diunduh, field `version` = `1.2`
- [ ] **Backup Restore**: file backup v1.0 lama berhasil di-restore; file v1.2 berhasil di-restore
- [ ] **Audit Log**: riwayat aktivitas tampil; cleanup berdasar rentang berjalan

### Verifikasi Performa

- [ ] Waktu load halaman pertama < 3 detik (koneksi normal)
- [ ] Tidak ada request yang stuck/timeout di tab Network DevTools

---

## 7. Rollback ke v1.0.1

Jika terjadi masalah kritis pasca deploy, ikuti langkah berikut:

### 7.1 Rollback Frontend (GitHub Pages)

```
GitHub → Actions → "Deploy Production"
→ Cari run dari tag/commit v1.0.1 yang terakhir berhasil
→ Klik "Re-run jobs"
```

Atau trigger ulang secara manual dari commit lama:

```bash
git checkout v1.0.1
git push origin HEAD:main --force-with-lease
```

> ⚠️ **Hati-hati:** `--force-with-lease` hanya digunakan dalam kondisi darurat. Koordinasikan dengan seluruh tim sebelum dilakukan.

### 7.2 Tidak Ada Rollback Database yang Diperlukan

Upgrade v1.2.1 **tidak mengubah skema database**. Rollback frontend ke v1.0.1 tidak memerlukan rollback database.

### 7.3 Restore Data dari Backup (Jika Diperlukan)

Jika ada korupsi data (sangat tidak mungkin, tapi sebagai langkah darurat):

1. Login sebagai admin
2. Buka **Pengaturan → Pulihkan Data**
3. Upload file backup `.json` yang dibuat sebelum upgrade
4. Konfirmasi restore

> File backup format `v1.0` (dari v1.0.1) dapat di-restore di versi apapun (v1.0.1 maupun v1.2.1).

### 7.4 Indikator Kesehatan Sistem

Monitor metrik berikut selama 24 jam pertama setelah deploy:

| Indikator | Threshold Normal | Aksi jika Melebihi |
|-----------|-----------------|---------------------|
| Error rate login | < 1% | Cek Supabase, rollback jika > 5% |
| Gagal muat dashboard | < 2% | Periksa CDN/GitHub Pages |
| Timeout Gate Pass scan | < 0.5% | Cek koneksi Supabase Realtime |
| Build CI gagal | 0 | Jangan deploy; investigasi |

---

## 8. Perubahan Dependensi

### Diupgrade (patch/minor — aman, sudah divalidasi)

| Paket | Sebelum | Sesudah | Alasan |
|-------|---------|---------|--------|
| `@supabase/supabase-js` | ^2.49.4 | ^2.103.0 | Security patches + performa |
| `autoprefixer` | ^10.4.21 | ^10.5.0 | Minor bug fix |
| `postcss` | ^8.5.3 | ^10.5.10 | Minor bug fix |
| `typescript-eslint` | ^8.30.1 | ^8.58.0 | Bug fix linting rules |
| `@vitest/coverage-v8` | ^3.1.1 | ^3.2.0 | Align dengan vitest versi yang terinstal |

### Ditahan (major jump — terlalu besar untuk rilis ini)

| Paket | Saat Ini | Latest | Alasan Ditahan |
|-------|----------|--------|----------------|
| `react-router-dom` | v6 | v7 | Breaking API (loader, clientAction) |
| `vite` | v6 | v8 | Breaking config API |
| `vitest` | v3 | v4 | Breaking config changes |
| `typescript` | v5 | v6 | Breaking type strictness |
| `eslint` | v9 | v10 | Breaking flat config changes |
| `jsdom` | v26 | v29 | Potential browser API parity changes |

> **Catatan:** Paket-paket di atas dijadwalkan untuk dievaluasi pada **v1.3.x** setelah ada roadmap yang lebih jelas dan suite test e2e yang lebih lengkap.

---

## 9. Catatan Operasional untuk Admin

### Fitur Baru yang Perlu Dikonfigurasi

Setelah upgrade, verifikasi dan konfigurasikan fitur baru berikut di **Pengaturan Sistem**:

#### 9.1 Feature Flags
- Buka **Pengaturan → Manajemen Fitur**
- Verifikasi semua fitur yang seharusnya aktif sudah `ON`
- Fitur yang tidak relevan bisa dinonaktifkan tanpa mempengaruhi fitur lain

#### 9.2 Gate Pass
- Pastikan semua **Pos Jaga** sudah didaftarkan di **Pengaturan → Pos Jaga**
- QR Code tiap pos jaga dapat diprint dari halaman pos jaga
- Role `guard` perlu dibuat jika belum ada (via **Manajemen User**)

#### 9.3 Auto-Refresh Dashboard
- Default: refresh setiap **5 menit**
- Dapat diubah di **Pengaturan → Tampilan → Interval Refresh**
- Nonaktifkan jika bandwidth terbatas

#### 9.4 Backup Rutin (Rekomendasi)
- Lakukan export backup mingguan dari **Pengaturan → Ekspor Data**
- Simpan file di lokasi yang aman di luar server
- Verifikasi file bisa di-restore ke environment staging sebelum disimpan

---

*Dokumen ini diperbarui untuk rilis v1.2.1 — April 2026.*  
*Untuk pertanyaan teknis, hubungi tim dev atau buka issue di repository.*
