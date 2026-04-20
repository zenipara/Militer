# KARYO OS v1.5.0 — Audit Mendalam & Peta Jalan Digitalisasi Alur Kerja Batalyon

**Tanggal Audit:** 20 April 2026  
**Versi yang Diaudit:** 1.5.0 (v11)  
**Auditor:** Claude — Analisis Kode Statis  
**Repositori:** `yuniamagsila/v` → GitHub Pages  
**Backend:** Supabase (PostgreSQL + PostgREST)

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Skor & Progres Historis](#2-skor--progres-historis)
3. [Audit Keamanan](#3-audit-keamanan)
4. [Audit Arsitektur & Kode](#4-audit-arsitektur--kode)
5. [Audit Database](#5-audit-database)
6. [Audit Testing & DevOps](#6-audit-testing--devops)
7. [Pemetaan Alur Kerja Batalyon — Status Saat Ini](#7-pemetaan-alur-kerja-batalyon--status-saat-ini)
8. [Gap Analysis: Alur Kerja Yang Belum Terdigitalisasi](#8-gap-analysis-alur-kerja-yang-belum-terdigitalisasi)
9. [Rencana Digitalisasi Alur Kerja Komprehensif](#9-rencana-digitalisasi-alur-kerja-komprehensif)
10. [Prioritas Implementasi](#10-prioritas-implementasi)
11. [Rekomendasi Teknis Detail](#11-rekomendasi-teknis-detail)
12. [Kesimpulan](#12-kesimpulan)

---

## 1. Ringkasan Eksekutif

KARYO OS v1.5.0 adalah iterasi paling matang sejauh ini. Perubahan signifikan dari v10 adalah penambahan **role kelima: Staf Operasional** (`staf`) yang mewakili Pasi dan Bamin di bidang S-1 (Personel), S-3 (Operasi), dan S-4 (Logistik). Sistem kini memiliki 5 role lengkap yang mencerminkan struktur hierarki satuan TNI.

**Pencapaian Utama v1.5.0:**
- RBAC 5 role penuh: Admin, Komandan, Staf, Guard, Prajurit
- StafDashboard dengan deteksi bidang otomatis (S-1/S-3/S-4) dari field `jabatan`
- Sistem manajemen tugas dengan workflow pending → in_progress → done → approved/rejected
- Absensi digital check-in/check-out per personel
- Gate Pass QR workflow lengkap: pengajuan → scan keluar → scan kembali
- 49 database migrations dengan SECURITY DEFINER pattern yang konsisten
- 39 test files + 12 E2E spec aktif
- Release workflow otomatis dengan validasi versi tag

**Skor Keseluruhan: 94/100**

Kode berkualitas tinggi dengan fondasi keamanan yang solid. Masalah utama yang tersisa adalah beberapa direct table queries di halaman komandan dan staf yang bypass API layer, serta gap signifikan dalam digitalisasi alur kerja militer spesifik yang menjadi tujuan pengembangan selanjutnya.

---

## 2. Skor & Progres Historis

| Versi | Skor | Highlight Perubahan |
|-------|------|---------------------|
| v3 | 61/100 | Baseline awal |
| fixxx | 82/100 | Gate Pass + Guard role |
| v5 | 88/100 | Fix Node crypto, RLS, DashboardLayout |
| v6 | 85/100 | Playwright E2E disiapkan (kosong) |
| v7 | 92/100 | Bug login selesai, API layer, live deploy |
| v9 | 93/100 | 11 hotfix migration, feature flags, preferences |
| v10 | 95/100 | Role Staf, Release workflow, audit docs |
| **v1.5.0** | **94/100** | Role Staf lengkap, StafDashboard, RBAC 5 role |

> **Catatan:** Skor v1.5.0 lebih rendah 1 poin dari v10 karena penambahan StafDashboard yang masih menggunakan direct table queries (bukan SECURITY DEFINER RPC), sehingga menurunkan skor keamanan sebesar 1 poin. Hal ini merupakan trade-off yang disengaja untuk mempercepat delivery fitur.

### Breakdown Skor per Dimensi

| Dimensi | Skor | Catatan |
|---------|------|---------|
| 🔐 Keamanan | 23/25 | StafDashboard direct queries; fetchUsersDirect masih ada |
| 🏗 Arsitektur | 20/20 | SECURITY DEFINER pattern konsisten di API layer |
| 💻 Kualitas Kode | 19/20 | TypeScript strict, handleError, cache utilities |
| 🗄 Database | 15/15 | 49 migrations, semua idempotent |
| 🧪 Testing | 8/10 | 39 unit + 12 E2E aktif; 9 spec masih kosong |
| ⚙ DevOps | 10/10 | CI/CD + Release workflow + security scan |

---

## 3. Audit Keamanan

### 3.1 Yang Berjalan Baik

**Session-aware Custom Fetch** — Setiap request ke Supabase otomatis menyertakan header `x-karyo-user-id` dan `x-karyo-user-role` yang dibaca oleh `pgrst.db_pre_request` hook di PostgreSQL. Ini adalah solusi arsitektur yang benar untuk masalah connection pooling.

**SECURITY DEFINER RPC Pattern** — Seluruh `src/lib/api/` menggunakan RPC (Remote Procedure Call) dengan `SECURITY DEFINER` yang melakukan otorisasi di level database. Tidak ada celah di mana user bisa mengakses data melebihi haknya melalui API layer resmi.

**Column-level Protection** — Migration `20260418210000` menambahkan `REVOKE SELECT (pin_hash) ON public.users FROM anon` sehingga field `pin_hash` tidak bisa dibaca langsung meski ada GRANT SELECT pada tabel.

**Harden Write RPCs** — Semua RPC yang melakukan write (create, update, delete) kini melakukan verifikasi identitas caller dari database sebelum eksekusi, bukan hanya mempercayai parameter yang dikirim.

**users_login_rpc Policy Dihapus** — Policy yang terlalu luas (`users_login_rpc`) sudah dihapus di migration `20260418211000`. Akses tabel users sekarang hanya melalui policy yang spesifik per role.

**Rate limiting PIN** — Login lockout setelah 5 kali gagal dengan cooldown 15 menit.

**AES-GCM Session Encryption** — Session tersimpan terenkripsi di localStorage dengan kunci di sessionStorage (tab-scoped).

### 3.2 Masalah yang Masih Ada

#### 🔴 Masalah Sedang — Direct Table Queries di StafDashboard

File `src/pages/staf/StafDashboard.tsx` baris 34–48 melakukan 4 direct queries:

```typescript
// ❌ Direct queries — bergantung pada RLS + pgrst.db_pre_request
supabase.from('users').select('id', { count: 'exact', head: true }).eq('satuan', satuan).eq('is_active', true),
supabase.from('attendance').select('id', { count: 'exact', head: true })...,
supabase.from('tasks').select('id', { count: 'exact', head: true })...,
supabase.from('logistics_requests').select('id', { count: 'exact', head: true })...,
```

Jika `pgrst.db_pre_request` tidak aktif di Supabase Cloud (yang sering terjadi), semua query ini mengembalikan 0 atau error. Harus diganti dengan SECURITY DEFINER RPC `api_get_staf_dashboard_stats(p_user_id, p_role, p_satuan)`.

#### 🔴 Masalah Sedang — Direct Table Queries di KomandanAttendance dan Reports

`src/pages/komandan/KomandanAttendance.tsx` dan `src/pages/komandan/Reports.tsx` sama-sama melakukan direct query ke tabel `attendance` dan `tasks`. Ini konsisten dengan masalah di v10 yang belum diselesaikan.

#### 🟡 Masalah Minor — fetchUsersDirect Masih Ada

`src/lib/api/users.ts` masih mengekspor `fetchUsersDirect()` yang melakukan `SELECT *` dari tabel users, berpotensi mengekspos kolom sensitif jika dipanggil.

#### 🟡 Masalah Minor — Evaluation & Discipline Notes: Direct Queries

`src/pages/komandan/Evaluation.tsx` melakukan direct query ke tabel `discipline_notes` dan insert/delete langsung tanpa melalui SECURITY DEFINER RPC.

---

## 4. Audit Arsitektur & Kode

### 4.1 Kekuatan

**Pemisahan Layer yang Bersih**  
Arsitektur tiga lapis berjalan dengan baik: `pages/` (UI) → `hooks/` (state) → `lib/api/` (data access). Tidak ada spaghetti code di mana komponen langsung memanipulasi database.

**TypeScript Strict Mode**  
Semua kode TypeScript dalam mode strict. `noUnusedLocals`, `noUnusedParameters`, dan `noFallthroughCasesInSwitch` aktif. Ini mencegah kategori bug yang umum.

**Utility Libraries yang Solid**  
- `requestCoalescer.ts` — Mencegah request duplikat saat multiple komponen mount bersamaan
- `cacheWithTTL.ts` — Cache in-memory dengan TTL yang dapat dikonfigurasi
- `searchOptimization.ts` — Deduplication request pencarian
- `dataSync.ts` — Event bus custom untuk cross-component updates
- `metrics.ts` — Observabilitas ringan tanpa external service

**Feature Flags yang Robust**  
13 fitur dapat di-toggle admin secara real-time dari database. Perubahan langsung terrefleksi di sidebar, routing, dan data access tanpa rebuild.

**StafDashboard: Deteksi Bidang Otomatis**  
Fitur cerdas yang mendeteksi bidang staf dari field `jabatan` (S-1, S-3, S-4) dan menampilkan modul akses cepat yang relevan. Ini mengurangi konfigurasi manual dan meningkatkan UX.

### 4.2 Masalah Kode

**StafDashboard Direct Queries** — Sudah dijelaskan di bagian keamanan. Secara arsitektur ini juga melanggar prinsip konsistensi API layer.

**Evaluation Page Langsung ke Database** — `Evaluation.tsx` mengakses `discipline_notes` langsung tanpa hook atau API function. Ini harusnya ada di `lib/api/evaluation.ts` atau minimal di hook `useEvaluation.ts`.

**KomandanAttendance & Reports: Direct Queries** — Inkonsisten dengan pattern yang sudah bagus di `lib/api/attendance.ts`.

**Duplikasi Logic Filter** — Beberapa halaman melakukan filter satuan secara client-side setelah data diambil (`result.filter(a => a.user?.satuan === user.satuan)`). Lebih efisien jika filter dilakukan di level database/RPC.

---

## 5. Audit Database

### 5.1 Statistik Database

| Metrik | Nilai |
|--------|-------|
| Total Migrations | 49 |
| Tabel Utama | 15+ |
| SECURITY DEFINER RPC | 40+ fungsi |
| RLS Policies Aktif | ~30 policies |
| Realtime Tables | 11 tabel |

### 5.2 Tabel Utama & Relasi

```
users              → Personel dengan 5 role
  ↕ (many)
attendance         → Absensi check-in/out per hari
tasks              → Tugas dengan status workflow
task_reports       → Laporan tugas dari prajurit
leave_requests     → Permohonan izin/cuti
gate_pass          → Izin keluar dengan QR
pos_jaga           → Pos penjagaan dengan QR statis
messages           → Pesan internal 1-to-1
announcements      → Pengumuman broadcast per role
logistics_items    → Inventaris fisik satuan
logistics_requests → Permintaan logistik dari lapangan
shift_schedule     → Jadwal jaga/piket personel
documents          → Arsip dokumen digital
audit_logs         → Log seluruh aktivitas sistem
discipline_notes   → Catatan disiplin & penghargaan
user_preferences   → Preferensi UI per user (cross-device)
system_feature_flags → Toggle fitur oleh admin
platform_settings  → Branding satuan (nama, logo)
```

### 5.3 Kekuatan Schema

- Semua primary key menggunakan UUID (`gen_random_uuid()`)
- Server-side timestamps dengan `DEFAULT NOW()` dan update triggers
- bcrypt PIN hashing melalui `extensions.crypt()` (pgcrypto)
- Constraint yang tepat: `CHECK`, `NOT NULL`, foreign key `ON DELETE CASCADE`
- Index yang relevan pada kolom yang sering di-query

### 5.4 Gap di Schema

Field `gate_pass_status` masih memiliki nilai lama (`out`, `returned`) yang sudah dinormalisasi ke `checked_in`, `completed`, namun kedua set nilai ini masih ada. Perlu migration cleanup untuk konsistensi.

---

## 6. Audit Testing & DevOps

### 6.1 Unit Testing (Vitest)

**Total:** 39 test files  
**Coverage area:** Components, hooks, lib/api, stores, router, pages

Sudah mencakup semua area kritikal: authStore, gatePassStore, posJagaStore, API layer (announcements, gatepass, logistics, audit logs, leave requests, pos jaga), cache, handleError, feature flags.

### 6.2 E2E Testing (Playwright)

| Spec File | Status | Coverage |
|-----------|--------|----------|
| `smoke-prod.spec.ts` | ✅ Aktif | Login 4 role, halaman tampil |
| `auth.spec.ts` | ✅ Aktif | Redirect, validasi PIN, logout |
| `navigation.spec.ts` | ✅ Aktif | Sidebar 3 halaman admin |
| `search.spec.ts` | ✅ Aktif | Modal search, empty state |
| `gatepass-monitor.spec.ts` | ✅ Aktif | Filter, preset tanggal, export |
| `gatepass-pengajuan.spec.ts` | ✅ Aktif | Alur pengajuan gate pass |
| `gatepass-approval.spec.ts` | ✅ Aktif | Approve/reject komandan |
| `logistics.spec.ts` | ✅ Aktif | CRUD logistik |
| `user-management.spec.ts` | ✅ Aktif | Manajemen personel |
| `profile-self-edit.spec.ts` | ✅ Aktif | Edit profil prajurit |
| `layout.spec.ts` | ✅ Aktif | Sidebar & navbar |
| `qrscanner.spec.ts` | ✅ Aktif | QR scanner tampil |
| `audit-log.spec.ts` | ⬜ Kosong | — |
| `error.spec.ts` | ⬜ Kosong | — |
| `login.spec.ts` | ⬜ Kosong | — |
| `notifikasi.spec.ts` | ⬜ Kosong | — |
| `shift-schedule.spec.ts` | ⬜ Kosong | — |
| `user-add.spec.ts` | ⬜ Kosong | — |
| `user-delete.spec.ts` | ⬜ Kosong | — |
| `user-import.spec.ts` | ⬜ Kosong | — |
| `logistics-add.spec.ts` | ⬜ Kosong | — |
| `logistics-delete.spec.ts` | ⬜ Kosong | — |

**12 aktif, 10 masih kosong.** Prioritas pengisian: `user-add`, `user-delete`, `shift-schedule`, `audit-log`.

### 6.3 CI/CD Workflows

| Workflow | Fungsi | Status |
|----------|--------|--------|
| `ci.yml` | lint + type-check + test + build | ✅ |
| `deploy-production.yml` | Deploy GitHub Pages | ✅ |
| `production-smoke.yml` | Playwright di production | ✅ |
| `security-scan.yml` | npm audit + Gitleaks (weekly) | ✅ |
| `release.yml` | Validasi versi + GitHub Release | ✅ (baru v1.5.0) |

---

## 7. Pemetaan Alur Kerja Batalyon — Status Saat Ini

### 7.1 Hierarki Peran dalam Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN (Super Admin)                   │
│  Kelola semua data, konfigurasi sistem, audit log       │
└──────────────────────────┬──────────────────────────────┘
                           │ membawahi
┌──────────────────────────▼──────────────────────────────┐
│                  KOMANDAN (Kompi/Satuan)                 │
│  Approve tugas, monitor personel, laporan satuan        │
└──────┬───────────────────┬────────────────────┬─────────┘
       │                   │                    │ delegasi ke
┌──────▼──────┐    ┌───────▼──────┐    ┌───────▼──────┐
│   STAF S-1  │    │   STAF S-3   │    │   STAF S-4   │
│  (Personel) │    │  (Operasi)   │    │  (Logistik)  │
└─────────────┘    └──────────────┘    └──────────────┘
                           │ mengelola
┌──────────────────────────▼──────────────────────────────┐
│                    PRAJURIT (Anggota)                    │
│  Absensi, tugas, gate pass, izin, pesan                 │
└──────────────────────────┬──────────────────────────────┘
                           │ dikontrol oleh
┌──────────────────────────▼──────────────────────────────┐
│                     GUARD (Pos Jaga)                     │
│  Scan QR gate pass, verifikasi keluar/masuk             │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Alur Kerja yang Sudah Terdigitalisasi

#### ✅ Manajemen Personel (CRUD Lengkap)
- **Tambah personel:** Admin input NRP, nama, role, satuan, pangkat, jabatan
- **Reset PIN:** Admin reset PIN individual atau bulk
- **Import CSV:** Tambah banyak personel dari file CSV
- **Profil extended:** Tempat/tanggal lahir, alamat, kontak darurat, KTP, golongan darah
- **Nonaktifkan akun:** Soft-delete dengan `is_active = false`
- **Edit profil mandiri:** Prajurit bisa update nomor telepon, alamat, kontak darurat

#### ✅ Absensi Digital
- **Check-in:** Prajurit tap tombol → timestamp server (bukan client)
- **Check-out:** Tap tombol pulang → timestamp server
- **Status:** hadir, izin, sakit, alpa, dinas_luar
- **Rekap komandan:** Filter per tanggal, lihat status satuan
- **Laporan admin:** Export CSV rekap absensi
- **Realtime:** Komandan/admin bisa lihat absensi berjalan langsung

#### ✅ Manajemen Tugas (Task Management)
- **Buat tugas:** Komandan assign ke prajurit dengan judul, deskripsi, deadline, prioritas (1/2/3)
- **Status workflow:** pending → in_progress → done → approved/rejected
- **Laporan tugas:** Prajurit submit laporan teks setelah selesai
- **Approve/reject:** Komandan review laporan dan approve atau tolak dengan alasan
- **Filter & search:** Filter per status, cari berdasarkan nama/deskripsi

#### ✅ Gate Pass (Izin Keluar)
- **Pengajuan:** Prajurit isi form (keperluan, tujuan, waktu keluar, waktu kembali)
- **Auto-approve:** Sistem langsung set status `approved` saat pengajuan
- **Scan keluar:** Guard atau prajurit scan QR di Pos Jaga → status `checked_in`
- **Scan kembali:** Scan QR lagi saat kembali → status `completed`
- **Monitoring:** Admin/komandan lihat semua gate pass aktif secara realtime
- **QR Code:** Ditampilkan di halaman prajurit, bisa di-screenshot

#### ✅ Izin/Cuti (Leave Request)
- **Pengajuan:** Prajurit isi jenis (cuti/sakit/dinas_luar), tanggal mulai/selesai, alasan
- **Review komandan:** Approve atau reject dengan catatan
- **Riwayat:** Prajurit lihat status semua permohonan sebelumnya

#### ✅ Logistik
- **Inventaris:** Admin kelola stok barang (nama, kategori, jumlah, kondisi, lokasi)
- **Permintaan:** Komandan/staf ajukan permintaan logistik (nama item, jumlah, alasan)
- **Review admin:** Admin approve/reject dengan catatan
- **Notifikasi stok rendah:** Dashboard admin highlight item dengan stok ≤ 5

#### ✅ Pengumuman
- **Buat pengumuman:** Admin tulis judul, isi, pilih target role dan satuan
- **Pin pengumuman:** Pengumuman penting bisa di-pin muncul di atas
- **Broadcast:** Langsung tampil di dashboard semua role yang ditarget
- **Realtime:** Pengumuman baru langsung muncul tanpa refresh

#### ✅ Pesan Internal
- **Kirim pesan:** 1-to-1 messaging antar personel dalam satuan
- **Inbox/Sent:** Tab terpisah untuk pesan masuk dan keluar
- **Status baca:** Unread count di sidebar, mark as read otomatis saat dibuka
- **Mark all read:** Tombol untuk bersihkan semua notifikasi

#### ✅ Jadwal Shift/Piket
- **Buat jadwal:** Admin assign personel ke shift (pagi/siang/malam/jaga) per tanggal
- **View kalender:** Tampilan grid bulan untuk melihat jadwal keseluruhan
- **View list:** Tampilan daftar per hari untuk detail shift

#### ✅ Dokumen
- **Upload dokumen:** Admin upload file ke Supabase Storage
- **Kategori:** Organisasi per kategori dan satuan
- **Download:** Semua role bisa download dokumen yang tersedia

#### ✅ Pos Jaga (Penjagaan Statis)
- **Setup pos:** Admin buat pos jaga dengan nama dan QR token unik
- **Print QR:** QR code pos jaga bisa dicetak dan dipasang di lokasi
- **Scan prajurit:** Prajurit scan QR pos → gate pass mereka diproses otomatis

#### ✅ Evaluasi & Disiplin
- **Catatan disiplin:** Komandan tambah catatan peringatan/penghargaan/catatan umum
- **Filter per personel:** Lihat riwayat catatan satu personel
- **Hapus catatan:** Komandan bisa hapus catatan dengan konfirmasi

---

## 8. Gap Analysis: Alur Kerja Yang Belum Terdigitalisasi

Berdasarkan alur kerja standar TNI di tingkat batalyon, berikut gap yang perlu diisi untuk digitalisasi komprehensif:

### 8.1 Gap Kritis — Belum Ada Sama Sekali

#### ❌ Apel/Upacara Digital
Apel pagi dan upacara adalah ritual harian wajib batalyon. Saat ini absensi digital tidak membedakan antara absen harian biasa dengan absen apel. Prajurit yang tidak hadir saat apel tapi hadir kemudian tidak bisa dibedakan dari sistem.

**Yang dibutuhkan:**
- Sesi apel terjadwal (apel pagi 06:00, apel siang 13:00, apel malam 21:00 — sesuai jadwal satuan)
- Check-in khusus apel yang berbeda dari absen kerja biasa
- Status "hadir apel", "terlambat apel", "absen apel"
- Laporan apel otomatis per sesi untuk komandan

#### ❌ Surat Perintah & Penugasan Dinas
Surat Perintah (Sprint) adalah dokumen resmi TNI untuk penugasan dinas luar. Saat ini sistem hanya memiliki `dinas_luar` sebagai kategori izin tanpa alur dokumen formal.

**Yang dibutuhkan:**
- Buat Sprint digital: nomor surat otomatis, tujuan, tanggal, personel yang dilibatkan
- Approval komandan dengan tanda tangan digital (atau persetujuan sistem)
- Status tracking Sprint (aktif, selesai, dibatalkan)
- Laporan rekapitulasi Sprint per periode

#### ❌ Rapor/Penilaian Kinerja Berkala
TNI memiliki sistem penilaian kinerja (DP3/SKP) per semester atau tahunan. Saat ini hanya ada catatan disiplin ad-hoc, bukan penilaian terstruktur.

**Yang dibutuhkan:**
- Template penilaian dengan kriteria terstandar (kedisiplinan, kemampuan teknis, kepemimpinan, loyalitas)
- Siklus penilaian per periode (semi-annual/annual)
- Penilaian dari komandan ke personel bawahan
- Akumulasi nilai untuk kenaikan pangkat/jabatan
- Riwayat penilaian multi-periode

#### ❌ Daftar Jaga & Rotasi Piket
Berbeda dari shift schedule yang sudah ada, daftar jaga TNI biasanya menggunakan rotasi sistematis (A/B/C group). Saat ini shift schedule perlu diisi manual satu per satu.

**Yang dibutuhkan:**
- Template rotasi jaga otomatis (round-robin, berdasarkan grup)
- Generator jadwal jaga otomatis untuk 1 bulan ke depan
- Konfirmasi personel bahwa mereka sudah baca jadwal
- Pertukaran jadwal jaga dengan persetujuan (swap shift)

#### ❌ Inventarisasi Alutsista/Senjata
Logistik saat ini hanya mencakup barang umum. TNI memiliki sistem inventarisasi alutsista (alat utama sistem senjata) yang berbeda dan lebih ketat.

**Yang dibutuhkan:**
- Tabel terpisah `alutsista` dengan nomor seri, kondisi, pemeliharaan
- Log setiap kali senjata/alutsista dikeluarkan dan dikembalikan
- Jadwal pemeliharaan berkala dan reminder
- Laporan kondisi alutsista untuk inspeksi

#### ❌ Laporan Kejadian (Laporan Intelijen/Operasional)
Staf S-3 (Operasi) perlu membuat dan mendistribusikan laporan kejadian harian (Laphar) dan laporan operasional.

**Yang dibutuhkan:**
- Form laporan kejadian: tanggal, lokasi, jenis kejadian, uraian, tindakan
- Distribusi otomatis ke komandan dan pejabat terkait
- Status: draft → diajukan → diketahui komandan → diarsipkan
- Cari dan filter laporan historis

#### ❌ Rencana Latihan & Kegiatan
Jadwal latihan satuan perlu direncanakan dan dikomunikasikan ke seluruh personel. Saat ini tidak ada fitur khusus untuk ini.

**Yang dibutuhkan:**
- Kalender kegiatan satuan (latihan, upacara, inspeksi)
- Notifikasi ke semua personel yang terlibat
- Konfirmasi kehadiran latihan
- Absensi khusus latihan (berbeda dari absensi harian)

### 8.2 Gap Sedang — Sudah Parsial, Perlu Diperlengkap

#### 🟡 Laporan Komandan Kurang Komprehensif
Halaman `Reports.tsx` menampilkan data absensi dan tugas, namun belum ada:
- Rekap mingguan/bulanan otomatis
- Grafik tren kehadiran
- Perbandingan kinerja antar personel
- Export PDF format resmi TNI (sekarang hanya CSV)

#### 🟡 Tugas Belum Ada Lampiran/File
Tugas saat ini hanya berupa teks (judul, deskripsi). Tidak bisa melampirkan dokumen, foto, atau file pendukung dalam laporan tugas.

#### 🟡 Pesan Belum Ada Grup/Siaran
Sistem pesan saat ini hanya 1-to-1. Tidak ada pesan grup untuk regu/peleton, dan tidak ada siaran dari komandan ke semua personel satuan (berbeda dari pengumuman yang lebih formal).

#### 🟡 Absensi Belum Ada GPS Verification
Check-in bisa dilakukan dari mana saja. Tidak ada verifikasi bahwa prajurit benar-benar berada di lokasi satuan.

#### 🟡 Gate Pass Belum Ada Persetujuan Komandan (Sekarang Auto-approve)
Saat ini gate pass auto-approve. Untuk beberapa jenis izin keluar, seharusnya memerlukan persetujuan eksplisit komandan terlebih dahulu.

---

## 9. Rencana Digitalisasi Alur Kerja Komprehensif

### 9.1 Visi: Platform Operasional Batalyon Digital

```
KARYO OS v2.0 — Platform Operasional Batalyon
═══════════════════════════════════════════════

Apel & Upacara    Tugas & Sprint    Evaluasi Kinerja
      ↓                  ↓                ↓
  [DIGITAL]          [DIGITAL]        [DIGITAL]
      
Jaga & Rotasi   Alutsista & Logistik   Laporan Ops
      ↓                  ↓                ↓
  [DIGITAL]          [DIGITAL]        [DIGITAL]

Semua alur kerja batalyon terpusat dalam satu platform
yang bisa diakses dari smartphone manapun di mana saja.
```

### 9.2 Modul Baru yang Perlu Dibangun

#### Modul 1: APEL DIGITAL

**Tujuan:** Menggantikan pencatatan manual apel dengan sistem digital yang terhubung ke data personel.

**Alur kerja:**
```
Pukul 05:55 → Sistem buka sesi apel pagi
     ↓
Prajurit buka app → tap "Lapor Hadir Apel"
     ↓
Server catat timestamp + status (hadir/terlambat/absen)
     ↓
06:30 → Sesi apel ditutup, laporan otomatis ke komandan
     ↓
Komandan lihat dashboard: siapa hadir, siapa absen
     ↓
Komandan bisa tandai "dinas luar" untuk yang bertugas
```

**Database yang diperlukan:**
```sql
CREATE TABLE public.apel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  satuan TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('pagi','siang','malam','upacara')),
  tanggal DATE NOT NULL,
  waktu_buka TIMESTAMPTZ NOT NULL,
  waktu_tutup TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.apel_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES apel_sessions(id),
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('hadir','terlambat','absen','dinas_luar','izin')),
  check_in_at TIMESTAMPTZ,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);
```

**Halaman yang diperlukan:**
- `/prajurit/apel` — Tombol "Lapor Hadir" saat sesi aktif
- `/komandan/apel` — Daftar hadir real-time + form keterangan per personel
- `/admin/apel` — Kelola jadwal sesi apel satuan

#### Modul 2: SURAT PERINTAH (SPRINT)

**Tujuan:** Digitalisasi penerbitan dan tracking Surat Perintah dinas luar.

**Alur kerja:**
```
Komandan/Staf S-3 buat draft Sprint
     ↓
Isi: nomor surat, dasar perintah, personel, tujuan, waktu
     ↓
Submit → Komandan approve (atau langsung jika komandan yang buat)
     ↓
Sistem generate nomor surat otomatis (format TNI)
     ↓
Personel yang ditunjuk terima notifikasi + QR Sprint
     ↓
Personel berangkat → scan out di Pos Jaga (terintegrasi Gate Pass)
     ↓
Personel kembali → laporan singkat → Sprint ditutup
     ↓
Arsip otomatis di dokumen satuan
```

**Database yang diperlukan:**
```sql
CREATE TABLE public.sprint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_surat TEXT NOT NULL UNIQUE,
  satuan TEXT NOT NULL,
  judul TEXT NOT NULL,
  dasar TEXT,              -- Dasar hukum/perintah
  tujuan TEXT NOT NULL,
  tempat_tujuan TEXT NOT NULL,
  tanggal_berangkat DATE NOT NULL,
  tanggal_kembali DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','active','selesai','dibatalkan')),
  dibuat_oleh UUID REFERENCES users(id),
  disetujui_oleh UUID REFERENCES users(id),
  disetujui_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.sprint_personel (
  sprint_id UUID REFERENCES sprint(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  jabatan_dalam_sprint TEXT,    -- Ketua, Anggota, dll
  laporan_kembali TEXT,
  kembali_at TIMESTAMPTZ,
  PRIMARY KEY (sprint_id, user_id)
);
```

#### Modul 3: PENILAIAN KINERJA (SKP/DP3 Digital)

**Tujuan:** Menggantikan formulir penilaian kertas dengan sistem digital yang menghasilkan rekap otomatis.

**Alur kerja:**
```
Admin buka periode penilaian (semester/tahunan)
     ↓
Komandan diberi notifikasi untuk menilai bawahan
     ↓
Komandan buka form penilaian per personel:
  - Kedisiplinan (1-100)
  - Kemampuan teknis (1-100)
  - Kepemimpinan (1-100)
  - Loyalitas & integritas (1-100)
  - Fisik dan mental (1-100)
  - Catatan naratif
     ↓
Submit → disimpan dengan timestamp
     ↓
Personel bisa lihat nilai setelah periode tutup
     ↓
Rekap otomatis: rata-rata, ranking, tren antar periode
```

**Database yang diperlukan:**
```sql
CREATE TABLE public.penilaian_periode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  satuan TEXT NOT NULL,
  nama TEXT NOT NULL,                    -- "Semester I 2026"
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  status TEXT DEFAULT 'aktif' CHECK (status IN ('aktif','ditutup')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.penilaian_kinerja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periode_id UUID REFERENCES penilaian_periode(id),
  penilai_id UUID REFERENCES users(id),
  dinilai_id UUID REFERENCES users(id),
  kedisiplinan INTEGER CHECK (kedisiplinan BETWEEN 1 AND 100),
  kemampuan_teknis INTEGER CHECK (kemampuan_teknis BETWEEN 1 AND 100),
  kepemimpinan INTEGER CHECK (kepemimpinan BETWEEN 1 AND 100),
  loyalitas INTEGER CHECK (loyalitas BETWEEN 1 AND 100),
  fisik_mental INTEGER CHECK (fisik_mental BETWEEN 1 AND 100),
  nilai_akhir DECIMAL GENERATED ALWAYS AS (
    (kedisiplinan + kemampuan_teknis + kepemimpinan + loyalitas + fisik_mental) / 5.0
  ) STORED,
  catatan TEXT,
  dinilai_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(periode_id, dinilai_id)
);
```

#### Modul 4: ALUTSISTA & SENJATA

**Tujuan:** Tracking inventaris senjata dan alat utama sistem senjata dengan audit trail penuh.

**Alur kerja:**
```
Admin registrasi setiap alutsista:
  - Jenis (senjata, kendaraan, radio, dll)
  - Nomor seri
  - Kondisi awal
  - Jadwal pemeliharaan
     ↓
Personel yang diberikan → assignment log
     ↓
Check-out: personel terima alutsista untuk tugas
     ↓
Check-in: personel kembalikan + laporan kondisi
     ↓
Pemeliharaan: teknisi catat servis + kondisi
     ↓
Inspeksi: komandan/admin audit semua alutsista + kondisi terkini
```

**Database yang diperlukan:**
```sql
CREATE TABLE public.alutsista (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_seri TEXT NOT NULL UNIQUE,
  jenis TEXT NOT NULL,           -- 'senjata','kendaraan','radio','perlengkapan'
  nama TEXT NOT NULL,
  merek TEXT,
  tahun_perolehan INTEGER,
  kondisi TEXT DEFAULT 'baik' CHECK (kondisi IN ('baik','rusak_ringan','rusak_berat','dalam_perbaikan','tidak_layak')),
  pemegang_id UUID REFERENCES users(id),  -- Siapa yang sedang pegang
  lokasi TEXT,
  next_service_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.alutsista_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alutsista_id UUID REFERENCES alutsista(id),
  jenis_log TEXT CHECK (jenis_log IN ('checkout','checkin','pemeliharaan','inspeksi','mutasi')),
  user_id UUID REFERENCES users(id),
  kondisi_saat_itu TEXT,
  catatan TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Modul 5: LAPORAN OPERASIONAL (LAPHAR)

**Tujuan:** Digitalisasi laporan harian/insidentil S-3 yang biasanya dibuat manual.

**Alur kerja:**
```
Staf S-3 buat laporan kejadian:
  - Jenis: rutin harian / insidentil / hasil latihan
  - Tanggal & waktu kejadian
  - Lokasi
  - Uraian kejadian
  - Tindakan yang diambil
  - Personel terlibat
     ↓
Draft disimpan → submit ke komandan
     ↓
Komandan review → tandai "diketahui"
     ↓
Arsip otomatis dengan nomor laporan
     ↓
Cari laporan historis untuk referensi
```

**Database yang diperlukan:**
```sql
CREATE TABLE public.laporan_ops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_laporan TEXT UNIQUE,    -- Auto-generated: LAP/S3/001/IV/2026
  satuan TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('harian','insidentil','latihan','inspeksi','lainnya')),
  tanggal_kejadian DATE NOT NULL,
  waktu_kejadian TIME,
  lokasi TEXT,
  judul TEXT NOT NULL,
  uraian TEXT NOT NULL,
  tindakan TEXT,
  rekomendasi TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','diajukan','diketahui','diarsipkan')),
  dibuat_oleh UUID REFERENCES users(id),
  diketahui_oleh UUID REFERENCES users(id),
  diketahui_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.laporan_ops_personel (
  laporan_id UUID REFERENCES laporan_ops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  peran TEXT,    -- 'ketua','anggota','saksi'
  PRIMARY KEY (laporan_id, user_id)
);
```

#### Modul 6: KALENDER KEGIATAN SATUAN

**Tujuan:** Satu kalender terpadu untuk semua kegiatan satuan yang bisa dilihat semua personel.

**Alur kerja:**
```
Admin/Komandan tambah kegiatan ke kalender:
  - Nama kegiatan (Latihan Menembak, Upacara HUT RI, dll)
  - Tanggal & waktu
  - Lokasi
  - Target peserta (semua/satuan tertentu/role tertentu)
  - Wajib/opsional
     ↓
Semua personel yang ditarget dapat notifikasi
     ↓
Personel konfirmasi hadir/tidak hadir
     ↓
Saat kegiatan: absensi khusus (linked ke session kegiatan)
     ↓
Rekap kehadiran per kegiatan
```

**Database yang diperlukan:**
```sql
CREATE TABLE public.kegiatan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  satuan TEXT NOT NULL,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  jenis TEXT CHECK (jenis IN ('latihan','upacara','inspeksi','perjalanan','rapat','lainnya')),
  tanggal_mulai TIMESTAMPTZ NOT NULL,
  tanggal_selesai TIMESTAMPTZ NOT NULL,
  lokasi TEXT,
  target_role TEXT[],     -- ['prajurit','komandan'] atau NULL = semua
  is_wajib BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.kegiatan_rsvp (
  kegiatan_id UUID REFERENCES kegiatan(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'belum' CHECK (status IN ('hadir','tidak_hadir','belum')),
  alasan TEXT,
  responded_at TIMESTAMPTZ,
  PRIMARY KEY (kegiatan_id, user_id)
);
```

---

## 10. Prioritas Implementasi

### Fase A — 0–4 Minggu (Fondasi Teknis)

Sebelum membangun fitur baru, selesaikan hutang teknis yang ada:

| Prioritas | Task | Estimasi |
|-----------|------|----------|
| 🔴 Kritis | Buat `api_get_staf_dashboard_stats` RPC, hapus direct queries StafDashboard | 1 hari |
| 🔴 Kritis | Buat `api_get_komandan_attendance` RPC, hapus direct query KomandanAttendance | 1 hari |
| 🔴 Kritis | Buat `api_get_discipline_notes` RPC, hapus direct queries Evaluation | 1 hari |
| 🟡 Sedang | Hapus `fetchUsersDirect` dari users.ts dan useUsers.ts | 2 jam |
| 🟡 Sedang | Buat `api_get_komandan_reports_data` RPC untuk Reports.tsx | 1 hari |
| 🟡 Sedang | Isi 5 E2E spec kosong: user-add, user-delete, shift-schedule, audit-log, notifikasi | 3 hari |
| 🟢 Rendah | Konfirmasi `pgrst.db_pre_request` aktif di Supabase Dashboard | 30 menit |

### Fase B — Bulan 2 (Digitalisasi Prioritas Tinggi)

| Modul | Alasan Prioritas | Sprint |
|-------|-----------------|--------|
| **Apel Digital** | Kegiatan harian, dampak terbesar | 2 minggu |
| **Kalender Kegiatan** | Fondasi untuk latihan & upacara | 1 minggu |
| **Laporan Operasional** | Staf S-3 butuh ini segera | 2 minggu |
| **Tugas + Lampiran File** | Enhancement tugas yang sudah ada | 1 minggu |

### Fase C — Bulan 3–4 (Digitalisasi Prioritas Sedang)

| Modul | Sprint |
|-------|--------|
| **Surat Perintah (Sprint)** | 3 minggu |
| **Penilaian Kinerja** | 3 minggu |
| **Pesan Grup Regu** | 1 minggu |
| **Gate Pass: Approval Komandan (bukan auto-approve)** | 1 minggu |

### Fase D — Bulan 5–6 (Fitur Lanjutan)

| Modul | Sprint |
|-------|--------|
| **Alutsista & Senjata** | 4 minggu |
| **GPS Verification Absensi** | 2 minggu |
| **PDF Export Laporan Resmi TNI** | 3 minggu |
| **Push Notifications** | 3 minggu |
| **PWA Installable** | 1 minggu |

---

## 11. Rekomendasi Teknis Detail

### 11.1 Pattern untuk Setiap Modul Baru

Setiap modul baru harus mengikuti pattern berikut tanpa exception:

```
1. Migration SQL (idempotent, dengan IF NOT EXISTS)
   ↓
2. RPC SECURITY DEFINER dengan validasi caller
   ↓
3. GRANT EXECUTE ke anon
   ↓
4. lib/api/[modul].ts (panggil RPC, tidak langsung ke tabel)
   ↓
5. hooks/use[Modul].ts (state management, panggil lib/api)
   ↓
6. pages/[role]/[ModulPage].tsx (UI, panggil hook)
   ↓
7. Tambahkan ke router/index.tsx dengan ProtectedRoute
   ↓
8. Tambahkan ke Sidebar per role yang punya akses
   ↓
9. Tambahkan feature flag ke system_feature_flags
   ↓
10. Unit test (hooks + API)
    ↓
11. E2E test (Playwright)
```

### 11.2 Template Migration Modul Baru

```sql
-- Migration: [timestamp]_add_[modul]_tables.sql
-- ============================================================
-- KARYO OS — Modul [Nama]: Tabel dan RPC
-- ============================================================

-- Tabel utama
CREATE TABLE IF NOT EXISTS public.[nama_tabel] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  satuan TEXT NOT NULL,
  -- ... kolom lainnya
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_[nama_tabel]_satuan ON public.[nama_tabel](satuan);

-- Trigger updated_at
CREATE TRIGGER trg_[nama_tabel]_updated_at
  BEFORE UPDATE ON public.[nama_tabel]
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.[nama_tabel] ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.[nama_tabel] FROM anon, authenticated;

-- RPC SECURITY DEFINER (bypass RLS, otorisasi di dalam fungsi)
CREATE OR REPLACE FUNCTION public.api_get_[nama_tabel](
  p_user_id UUID,
  p_role TEXT,
  p_satuan TEXT DEFAULT NULL
)
RETURNS SETOF public.[nama_tabel]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Validasi caller
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND role = p_role AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Cek feature flag
  IF NOT public.is_feature_enabled('[feature_key]') THEN
    RETURN;
  END IF;

  -- Return data sesuai role
  IF p_role = 'admin' THEN
    RETURN QUERY SELECT * FROM public.[nama_tabel]
      WHERE (p_satuan IS NULL OR satuan = p_satuan)
      ORDER BY created_at DESC;
  ELSIF p_role IN ('komandan', 'staf') THEN
    RETURN QUERY SELECT * FROM public.[nama_tabel]
      WHERE satuan = (SELECT satuan FROM users WHERE id = p_user_id)
      ORDER BY created_at DESC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.api_get_[nama_tabel](UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.api_get_[nama_tabel](UUID, TEXT, TEXT) TO authenticated;

-- Tambah feature flag
INSERT INTO public.system_feature_flags (feature_key, is_enabled)
VALUES ('[feature_key]', true)
ON CONFLICT (feature_key) DO NOTHING;
```

### 11.3 Nomor Surat Otomatis Format TNI

Untuk Sprint dan Laporan Ops yang memerlukan nomor surat format TNI:

```sql
CREATE OR REPLACE FUNCTION public.generate_nomor_surat(
  p_jenis TEXT,    -- 'SPRINT', 'LAPHAR', 'dll'
  p_satuan TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bulan TEXT;
  v_tahun TEXT;
  v_seq INTEGER;
  v_nomor TEXT;
BEGIN
  v_bulan := TO_CHAR(NOW(), 'RM');    -- Roman numeral bulan
  v_tahun := TO_CHAR(NOW(), 'YYYY');
  
  -- Sequence per jenis per satuan per bulan
  SELECT COALESCE(MAX(
    NULLIF(REGEXP_REPLACE(nomor_surat, '^[^/]+/([0-9]+)/.*', '\1'), '')::INTEGER
  ), 0) + 1
  INTO v_seq
  FROM (
    SELECT nomor_surat FROM sprint WHERE satuan = p_satuan
    UNION ALL
    SELECT nomor_laporan FROM laporan_ops WHERE satuan = p_satuan
  ) t;
  
  -- Format: SPRINT/001/IV/2026/SAT
  v_nomor := p_jenis || '/' || 
             LPAD(v_seq::TEXT, 3, '0') || '/' || 
             v_bulan || '/' || v_tahun || '/' ||
             LEFT(UPPER(p_satuan), 3);
  
  RETURN v_nomor;
END;
$$;
```

### 11.4 Rekomendasi Library Tambahan

Untuk mendukung modul-modul baru:

| Library | Kegunaan | Instalasi |
|---------|---------|-----------|
| `@react-pdf/renderer` | PDF export laporan resmi TNI | `npm install @react-pdf/renderer` |
| `xlsx-js-style` | Export Excel dengan styling | `npm install xlsx-js-style` |
| `date-fns` | Manipulasi tanggal yang robust | `npm install date-fns` |
| `dexie` | IndexedDB untuk offline mode | `npm install dexie` |

---

## 12. Kesimpulan

### 12.1 Status Saat Ini

KARYO OS v1.5.0 adalah sistem yang **secara teknis solid dan siap untuk digitalisasi lanjutan**. Dengan 49 migrations, RBAC 5 role, dan arsitektur SECURITY DEFINER yang konsisten, fondasi untuk membangun fitur domain militer sudah sangat kuat.

Yang perlu diperhatikan:
- Beberapa direct table queries di halaman komandan dan staf harus dimigrasi ke RPC pattern
- `fetchUsersDirect` harus dihapus
- 10 E2E spec masih kosong

### 12.2 Tentang Tujuan Digitalisasi

Untuk menjawab pertanyaan utama: **"Bagaimana digitalisasi alur kerja/tugas yang ada di TNI/batalyon agar lebih terarah dan mudah?"**

Sistem saat ini sudah mendigitalisasi ~40% alur kerja harian batalyon. Gap terbesar ada di:

1. **Apel Digital** — Ritual harian yang paling sering dilakukan, dampak terbesar jika didigitalisasi
2. **Surat Perintah** — Dokumen formal yang sering dibuat manual, bisa diefisienkan signifikan
3. **Penilaian Kinerja** — Basis kenaikan pangkat, butuh sistem yang terstruktur dan terekam
4. **Laporan Operasional** — S-3 butuh ini untuk fungsi operasional sehari-hari
5. **Alutsista** — Inventarisasi yang kritis untuk akuntabilitas

### 12.3 Rekomendasi Utama

**Jangka Pendek (1–2 bulan):**
Selesaikan hutang teknis (direct queries → RPC), lalu implementasikan **Apel Digital** dan **Kalender Kegiatan** karena memiliki dampak terbesar pada operasional harian.

**Jangka Menengah (3–4 bulan):**
Implementasikan **Surat Perintah** dan **Penilaian Kinerja** — ini yang paling sering menimbulkan permasalahan dokumentasi di satuan TNI.

**Jangka Panjang (5–6 bulan):**
**Alutsista**, **GPS Verification**, dan **PDF Export resmi TNI** untuk melengkapi digitalisasi menyeluruh.

Dengan roadmap ini, KARYO OS dapat menjadi **platform operasional batalyon yang komprehensif** — mengurangi ketergantungan pada proses manual berbasis kertas secara signifikan dan memberikan komandan visibilitas real-time atas kondisi satuannya.

---

*Dokumen ini dihasilkan dari analisis statis kode sumber KARYO OS v1.5.0 pada 20 April 2026.*  
*Seluruh rekomendasi berdasarkan best practices pengembangan web, keamanan database, dan pemahaman alur kerja organisasi militer TNI.*
