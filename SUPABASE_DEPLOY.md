# 🗄️ Panduan Deploy Supabase — KARYO OS

Panduan lengkap untuk menyiapkan backend Supabase bagi aplikasi KARYO OS dari nol hingga production-ready.

---

## 📋 Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Buat Project Supabase](#2-buat-project-supabase)
3. [Ambil Kredensial API](#3-ambil-kredensial-api)
4. [Jalankan Migrasi Database](#4-jalankan-migrasi-database)
5. [Seed Data Awal](#5-seed-data-awal)
6. [Aktifkan Realtime](#6-aktifkan-realtime)
7. [Konfigurasi Storage](#7-konfigurasi-storage)
8. [Konfigurasi Environment Variables](#8-konfigurasi-environment-variables)
9. [Konfigurasi RLS Production](#9-konfigurasi-rls-production)
10. [Verifikasi Deploy](#10-verifikasi-deploy)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prasyarat

- Akun [Supabase](https://supabase.com) (gratis)
- Akses ke repository KARYO OS
- File migration di folder `supabase/migrations/`

---

## 2. Buat Project Supabase

1. Buka [supabase.com](https://supabase.com) → **Sign In**
2. Di dashboard, klik **New project**
3. Isi form berikut:

   | Field | Nilai |
   |---|---|
   | **Organization** | Pilih organisasi kamu |
   | **Name** | `karyo-os` (atau nama lain) |
   | **Database Password** | Buat password yang kuat — **simpan baik-baik!** |
   | **Region** | `Southeast Asia (Singapore)` — terdekat untuk Indonesia |
   | **Pricing Plan** | Free (cukup untuk production skala kecil) |

4. Klik **Create new project** dan tunggu ±2 menit hingga project selesai provisioning

> ⚠️ **Penting:** Catat database password yang dibuat. Password ini tidak dapat dilihat kembali setelah project dibuat.

---

## 3. Ambil Kredensial API

Setelah project aktif:

1. Di sidebar kiri, klik **Project Settings** (ikon ⚙️)
2. Pilih menu **API**
3. Catat dua nilai berikut:

   | Variabel | Lokasi di Dashboard |
   |---|---|
   | `VITE_SUPABASE_URL` | **Project URL** (contoh: `https://abcdefgh.supabase.co`) |
   | `VITE_SUPABASE_ANON_KEY` | **Project API keys → anon public** |

> ⚠️ **Jangan** gunakan `service_role` key di frontend. Hanya gunakan `anon public` key.

---

## 4. Jalankan Migrasi Database

Migration harus dijalankan **secara berurutan** menggunakan Supabase SQL Editor.

### Cara Membuka SQL Editor

Dashboard → **SQL Editor** (ikon 🗒️ di sidebar kiri) → **New query**

---

### Migration 001 — Schema Awal

Salin dan jalankan seluruh isi file:

```
supabase/migrations/001_initial_schema.sql
```

File ini membuat:
- Ekstensi `pgcrypto` untuk hashing PIN (bcrypt)
- 12 tabel utama: `users`, `tasks`, `task_reports`, `attendance`, `leave_requests`, `announcements`, `messages`, `logistics_items`, `audit_logs`, `shift_schedules`, `documents`, `discipline_notes`
- Index performa
- Fungsi RPC: `verify_user_pin`, `create_user_with_pin`, `reset_user_pin`, `change_user_pin`, `increment_login_attempts`
- Trigger `updated_at` otomatis
- Row Level Security (RLS) diaktifkan — policy dev (open) untuk development

**Cara menjalankan:**

```sql
-- Di SQL Editor, klik "New query", paste isi file, lalu klik "Run" (Ctrl+Enter)
```

Pastikan muncul output: `Success. No rows returned` atau sejenisnya.

---

### Migration 002 — Seed Data (Development / Testing)

> **Opsional** — hanya untuk development atau demo pertama kali.

Salin dan jalankan:

```
supabase/migrations/002_seed_data.sql
```

Membuat akun sample berikut (semua PIN: **123456**):

| NRP | Nama | Role | Satuan |
|---|---|---|---|
| `1000001` | Admin Karyo | `admin` | Batalyon 1 |
| `2000001` | Budi Santoso | `komandan` | Batalyon 1 |
| `3000001` | Agus Pratama | `prajurit` | Batalyon 1 |
| `3000002` | Hendra Wijaya | `prajurit` | Batalyon 1 |
| `3000003` | Eko Susanto | `prajurit` | Batalyon 1 |

> ⚠️ **Jangan jalankan migration 002 di production** dengan data nyata. Gunakan hanya untuk testing awal.

---

### Migration 003 — Server Functions

Salin dan jalankan:

```
supabase/migrations/003_server_functions.sql
```

Menambahkan:
- Tabel `logistics_requests` (permintaan logistik Komandan → Admin)
- Fungsi `server_checkin` / `server_checkout` — timestamp dari server (anti-manipulasi)
- Fungsi `bulk_reset_pins` — reset PIN banyak user sekaligus
- Fungsi `import_users_csv` — import user dari CSV

---

### Migration 004 — Production RLS

> **Wajib** dijalankan sebelum go-live ke production.

Salin dan jalankan:

```
supabase/migrations/004_production_rls.sql
```

Menghapus semua policy dev (open) dan menggantinya dengan policy production ketat:

| Tabel | admin | komandan | prajurit |
|---|---|---|---|
| `users` | Full CRUD | Baca users sesatuan | Baca data sendiri |
| `tasks` | Full CRUD | CRUD tugas yang dibuat | Baca+update tugas sendiri |
| `attendance` | Full CRUD | Baca semua | CRUD absensi sendiri |
| `messages` | Full CRUD | CRUD pesan sendiri | CRUD pesan sendiri |
| `audit_logs` | Full CRUD | ❌ | ❌ |
| `discipline_notes` | Full CRUD | CRUD notes | Baca data sendiri |

Juga membuat fungsi helper:
- `set_session_context(user_id, role)` — dipanggil saat login
- `current_karyo_user_id()` — membaca sesi user aktif
- `current_karyo_role()` — membaca role user aktif

---

### Verifikasi Urutan Migration

Setelah semua migration selesai, cek tabel yang terbuat:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Harus tampil minimal 13 tabel:

```
announcements
attendance
audit_logs
discipline_notes
documents
leave_requests
logistics_items
logistics_requests
messages
shift_schedules
task_reports
tasks
users
```

---

## 5. Seed Data Awal

Jika tidak menjalankan migration 002, buat akun admin pertama secara manual:

```sql
-- Ganti nilai sesuai kebutuhan
SELECT public.create_user_with_pin(
  '1000001',          -- NRP unik
  '123456',           -- PIN 6 digit (ganti di production!)
  'Admin Karyo',      -- Nama lengkap
  'admin',            -- Role: admin / komandan / prajurit
  'Batalyon 1',       -- Satuan
  'Letnan Kolonel',   -- Pangkat (opsional)
  'Komandan Batalyon' -- Jabatan (opsional)
);
```

> ⚠️ **Production:** Ganti PIN default segera setelah login pertama menggunakan fitur "Ganti PIN" di aplikasi.

---

## 6. Aktifkan Realtime

KARYO OS menggunakan Supabase Realtime untuk fitur pesan dan notifikasi. Aktifkan untuk tabel yang diperlukan:

1. Di dashboard, buka **Database** → **Replication**
2. Di bagian **Supabase Realtime**, aktifkan tabel berikut:

   | Tabel | Kegunaan |
   |---|---|
   | `messages` | Pesan real-time antar pengguna |
   | `announcements` | Pengumuman baru muncul langsung |
   | `tasks` | Update status tugas real-time |
   | `attendance` | Monitoring kehadiran live (opsional) |

3. Untuk setiap tabel, pastikan toggle **Enabled** aktif

> 💡 Aktifkan hanya tabel yang benar-benar diperlukan untuk menjaga performa.

---

## 7. Konfigurasi Storage

KARYO OS menggunakan Supabase Storage untuk file upload. Buat bucket berikut:

### Langkah Membuat Bucket

1. Di dashboard → **Storage** → **New bucket**

---

### Bucket 1: `avatars` (Foto Profil)

| Setting | Nilai |
|---|---|
| Name | `avatars` |
| Public | ✅ Ya |
| File size limit | `5 MB` |
| Allowed MIME types | `image/jpeg, image/png, image/webp` |

```sql
-- Policy: user bisa upload foto sendiri, semua bisa lihat
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_user_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'anon'
  );
```

---

### Bucket 2: `documents` (Arsip Dokumen)

| Setting | Nilai |
|---|---|
| Name | `documents` |
| Public | ❌ Tidak |
| File size limit | `50 MB` |
| Allowed MIME types | `application/pdf, application/msword, application/vnd.openxmlformats-officedocument.*` |

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

CREATE POLICY "documents_authenticated_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "documents_admin_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents');
```

---

### Bucket 3: `task-reports` (File Laporan Tugas)

| Setting | Nilai |
|---|---|
| Name | `task-reports` |
| Public | ❌ Tidak |
| File size limit | `20 MB` |
| Allowed MIME types | `image/*, application/pdf` |

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('task-reports', 'task-reports', false);

CREATE POLICY "task_reports_authenticated" ON storage.objects
  FOR ALL USING (bucket_id = 'task-reports');
```

---

## 8. Konfigurasi Environment Variables

### Development (lokal)

Buat file `.env.local` di root project:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Config
VITE_APP_NAME=Karyo OS
VITE_APP_VERSION=1.0.0
```


### Production (Netlify)

1. Di Netlify Dashboard → pilih site KARYO OS
2. **Site configuration** → **Environment variables** → **Add a variable**
3. Tambahkan variabel yang sama persis seperti di atas (wajib: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Pastikan format dan value environment variable sama persis dengan `.env.local` (tanpa tanda kutip, tanpa spasi ekstra)

> ⚠️ File `.env.local` tidak boleh di-commit ke Git (sudah ada di `.gitignore`).

> 💡 **Tips:** Jika build Netlify gagal karena error environment (misal: Supabase URL/Key tidak terdeteksi), cek kembali penulisan dan value environment variable di dashboard Netlify.
---

## 12. Catatan Teknis Tambahan

- **QR Code:** KARYO OS kini menggunakan package `react-qr-code` (bukan `qrcode.react`) agar build kompatibel dengan Vite/Netlify dan tidak error saat deploy.
- **Realtime:** Aktifkan hanya tabel yang benar-benar digunakan realtime (lihat kode di `src/hooks/useNotifications.ts`, `useMessages.ts`, dsb).
- **Testing:** File test sudah dikecualikan dari build (lihat `tsconfig.json` dan `tsconfig.app.json`).
- **Optimalisasi:** Pastikan hanya dependensi yang diperlukan yang diinstall di production.

---

---

## 9. Konfigurasi RLS Production

Setelah menjalankan migration 004, verifikasi bahwa policy production aktif:

```sql
-- Cek semua policy aktif di database
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Pastikan **tidak ada** policy yang namanya diawali `dev_anon_all_`. Jika masih ada, jalankan ulang migration 004.

### Checklist Keamanan Production

- [ ] Migration 004 (production RLS) sudah dijalankan
- [ ] Tidak ada policy `dev_anon_all_*` yang tersisa
- [ ] PIN admin default sudah diganti
- [ ] Database password Supabase disimpan di tempat aman
- [ ] `service_role` key tidak diekspos ke frontend
- [ ] Realtime hanya aktif untuk tabel yang diperlukan
- [ ] Storage bucket `documents` dan `task-reports` bersifat private

---

## 10. Verifikasi Deploy

### Test Login

1. Buka aplikasi KARYO OS
2. Login dengan NRP `1000001` dan PIN `123456`
3. Pastikan redirect ke `/admin/dashboard`

### Test Database

Cek data masuk di Supabase Dashboard → **Table Editor** → pilih tabel `users`. Harus tampil akun yang sudah di-seed.

### Test RPC

Di SQL Editor, coba jalankan:

```sql
-- Test verify PIN
SELECT * FROM public.verify_user_pin('1000001', '123456');
-- Harus mengembalikan user_id

-- Test session context
SELECT public.set_session_context(
  (SELECT id FROM public.users WHERE nrp = '1000001'),
  'admin'
);
SELECT public.current_karyo_role(); -- harus mengembalikan 'admin'
```

### Test Realtime

1. Buka dua tab browser, login sebagai dua user berbeda
2. Kirim pesan dari satu user ke yang lain
3. Pesan harus muncul di tab lain tanpa refresh halaman

---

## 11. Troubleshooting

### ❌ Error: `pgcrypto extension not found`

**Solusi:** Aktifkan ekstensi secara manual:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Atau via dashboard: **Database** → **Extensions** → cari `pgcrypto` → **Enable**

---

### ❌ Error: `relation "users" does not exist`

**Solusi:** Pastikan migration 001 sudah dijalankan sebelum migration lainnya.

---

### ❌ Error: `function update_updated_at_column() does not exist`

Migration 003 bergantung pada fungsi dari migration 001. Pastikan urutan migration benar (001 → 002 → 003 → 004).

---

### ❌ Login gagal padahal NRP & PIN benar

**Kemungkinan penyebab:**
1. Migration 004 dijalankan tapi `set_session_context` belum dipanggil — ini normal, RLS memerlukan session context
2. Cek `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sudah benar di `.env.local`
3. Pastikan project Supabase statusnya **Active** (bukan paused)

---

### ❌ Data tidak muncul setelah login (query kosong)

**Kemungkinan penyebab:** RLS policy memblokir query. Cek:

```sql
-- Pastikan set_session_context terpanggil dengan benar
SELECT current_setting('karyo.current_user_id', TRUE);
SELECT current_setting('karyo.current_user_role', TRUE);
```

Jika kosong, berarti `authStore` tidak memanggil `set_session_context` setelah login.

---

### ❌ Realtime tidak berfungsi

1. Pastikan tabel sudah diaktifkan di **Database → Replication**
2. Cek Supabase plan — Free plan mendukung Realtime dengan batasan koneksi concurrent
3. Pastikan client Supabase menggunakan `anon key` yang benar

---

### ⚡ Project Supabase "Paused" (Free Plan)

Project Free Supabase akan di-pause otomatis setelah **7 hari tidak ada aktivitas**.

**Solusi:**
- Buka dashboard Supabase → klik **Restore project**
- Tunggu ±1-2 menit hingga aktif kembali
- Upgrade ke Pro plan untuk menghindari auto-pause di production

---

## 📚 Referensi

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/sql-editor)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

---

<div align="center">
  <strong>KARYO OS</strong> — Panduan Supabase Deployment 🇮🇩
</div>
