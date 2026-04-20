# 📋 SPESIFIKASI TEKNIS — KARYO OS
### Versi 1.5.0 | April 2026

---

## Daftar Isi

1. [Gambaran Umum Sistem](#1-gambaran-umum-sistem)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Spesifikasi Autentikasi & RBAC](#3-spesifikasi-autentikasi--rbac)
4. [Spesifikasi Database](#4-spesifikasi-database)
5. [Spesifikasi API & Supabase](#5-spesifikasi-api--supabase)
6. [Spesifikasi Frontend](#6-spesifikasi-frontend)
7. [Spesifikasi Dashboard Admin](#7-spesifikasi-dashboard-admin)
8. [Spesifikasi Dashboard Komandan](#8-spesifikasi-dashboard-komandan)
9. [Spesifikasi Dashboard Prajurit](#9-spesifikasi-dashboard-prajurit)
10. [Spesifikasi Dashboard Staf Operasional](#10-spesifikasi-dashboard-staf-operasional)
11. [Spesifikasi UI/UX](#11-spesifikasi-uiux)
12. [Spesifikasi Deployment](#12-spesifikasi-deployment)
13. [Spesifikasi Keamanan](#13-spesifikasi-keamanan)
14. [Spesifikasi Performa](#14-spesifikasi-performa)
15. [Roadmap Pengembangan](#15-roadmap-pengembangan)

---

## 1. Gambaran Umum Sistem

### 1.1 Identitas Sistem

| Atribut | Nilai |
|---|---|
| **Nama Sistem** | Karyo OS |
| **Kepanjangan** | Operational System — Command & Battalion Tracking |
| **Versi** | 1.5.0 |
| **Target Pengguna** | Unit militer TNI Indonesia |
| **Jenis Aplikasi** | Web Application (SPA) |
| **Bahasa Antarmuka** | Bahasa Indonesia |

### 1.2 Tujuan Sistem

Karyo OS dirancang untuk:
- Mendigitalisasi proses manajemen personel satuan militer
- Menyediakan sistem absensi digital yang akurat dan tahan manipulasi
- Mempermudah distribusi dan tracking tugas antar hierarki
- Menyediakan laporan dan analitik operasional secara real-time
- Mengurangi ketergantungan pada proses manual berbasis kertas

### 1.3 Batasan Sistem (MVP v1.0)

- Tidak memiliki fitur GPS tracking real-time
- Tidak terintegrasi dengan sistem SIMAK TNI
- Tidak memiliki fitur video/audio call
- Belum mendukung akses offline (memerlukan koneksi internet)
- Maksimum 500 user per deployment instance

---

## 2. Arsitektur Sistem

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────┐
│                GITHUB PAGES                 │
│          (Static File Hosting)              │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────┐
│              REACT SPA (Frontend)           │
│   React 19 + Vite + TypeScript + Tailwind   │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │  Router  │ │  Zustand │ │  Components │ │
│  │ (RRv6)   │ │  Store   │ │   Library   │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
└──────────────────┬──────────────────────────┘
                   │ Supabase JS Client
┌──────────────────▼──────────────────────────┐
│              SUPABASE BACKEND               │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │PostgreSQL│ │Realtime  │ │  Storage    │ │
│  │   (DB)   │ │ (WS)     │ │  (Files)    │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │     Row Level Security (RLS)         │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 2.2 Frontend Architecture

```
src/
├── pages/          # Route-level components (satu file per halaman)
├── components/     # Reusable UI components
│   ├── common/     # Atomic components (Button, Input, Modal)
│   ├── layout/     # Layout wrappers (Sidebar, Navbar)
│   └── ui/         # Composite components (Table, Chart, Card)
├── hooks/          # Custom React hooks
├── store/          # Zustand state management
├── lib/            # External service clients (Supabase)
├── router/         # Route definitions & guards
├── types/          # TypeScript type definitions
└── utils/          # Helper functions
```

### 2.3 Data Flow

```
User Action
    │
    ▼
React Component (UI)
    │
    ▼
Custom Hook (useXxx.ts)
    │
    ├──► Zustand Store (state update)
    │
    └──► Supabase Client
              │
              ▼
         Supabase DB (PostgreSQL)
              │
              ▼ (via Realtime subscription)
         Zustand Store (reactive update)
              │
              ▼
         React Component (re-render)
```

---

## 3. Spesifikasi Autentikasi & RBAC

### 3.1 Mekanisme Login

Sistem menggunakan **custom authentication** berbasis NRP + PIN — **tidak** menggunakan Supabase Auth default.

**Alur Autentikasi:**

```
1. User memasukkan NRP (Nomor Registrasi Pokok) + PIN 6 digit
2. Frontend mengirim query ke tabel `users`:
   SELECT id, nama, role, pin_hash, is_active
   FROM users WHERE nrp = $1
3. Validasi PIN dengan bcrypt compare terhadap `pin_hash`
4. Jika valid → generate session token, simpan ke localStorage
5. Baca field `role` → redirect ke dashboard yang sesuai:
   - role = 'admin'     → /admin/dashboard
   - role = 'komandan'  → /komandan/dashboard
   - role = 'staf'      → /staf/dashboard
   - role = 'guard'      → /guard/gatepass-scan
   - role = 'prajurit'  → /prajurit/dashboard
6. Update field `last_login` dan `is_online` pada tabel users
```

### 3.2 Struktur Session (Zustand authStore)

```typescript
interface AuthState {
  user: {
    id: string;
    nrp: string;
    nama: string;
    role: 'admin' | 'komandan' | 'staf' | 'guard' | 'prajurit';
    pangkat: string;
    satuan: string;
    jabatan?: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (nrp: string, pin: string) => Promise<void>;
  logout: () => void;
}
```

### 3.3 Role-Based Access Control (RBAC)

#### Struktur Role (v2)

| Role Asli (DB) | Label Operasional | Cakupan Akses |
|---|---|---|
| `admin` | **Super Admin** | Konfigurasi sistem: branding, backup, audit log, reset PIN, feature flag. |
| `komandan` | **Komandan Tier 1–3** | Approval & pelaporan sesuai `level_komando` (BATALION/KOMPI/PELETON). |
| `staf` | **Staf Bidang (S-1/S-3/S-4)** | Input data sesuai bidang operasional yang ditetapkan dari `jabatan`. |
| `guard` | **Petugas Jaga / Provost** | Validasi gate pass + baca `discipline_notes` untuk pemantauan disiplin. |
| `prajurit` | **Prajurit** | Akses mandiri: tugas, absensi, profil, izin pribadi. |

#### Aturan Akses Inti

- **Komandan bertingkat (berdasarkan `users.level_komando`):**
  - `BATALION`: dapat melihat data seluruh satuan batalion.
  - `KOMPI`: hanya data kompi dan peleton di bawah kompinya.
  - `PELETON`: hanya data peleton sendiri.
- **Staf berbasis bidang (berdasarkan mapping `jabatan` → S-1/S-3/S-4):**
  - **S-1 (Pers)**: write `attendance`, `leave_requests`.
  - **S-3 (Ops)**: write `tasks`, `shift_schedules`, data monitoring `pos_jaga`.
  - **S-4 (Log)**: write eksklusif `logistics`.
- **Admin/Super Admin tidak menangani data operasional harian** (absensi/logistik/tugas), kecuali fungsi audit dan administrasi sistem.

#### Tabel Akses Halaman (Ringkas)

| Halaman | Super Admin (`admin`) | Komandan (`komandan`) | Staf (`staf`) | Petugas Jaga/Provost (`guard`) | Prajurit |
|---|:---:|:---:|:---:|:---:|:---:|
| `/login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/admin/dashboard` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/settings` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/audit` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/backup` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/komandan/*` | ❌ | ✅ | ✅* | ❌ | ❌ |
| `/guard/*` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/staf/dashboard` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/staf/messages` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/prajurit/*` | ❌ | ❌ | ❌ | ❌ | ✅ |

*Akses staf ke modul komandan dibatasi ketat oleh kebijakan bidang (S-1/S-3/S-4) pada level database.

#### ProtectedRoute Component

```typescript
// router/ProtectedRoute.tsx
// Redirect ke /login jika belum autentikasi
// Redirect ke dashboard role sendiri jika akses halaman role lain

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}
```

### 3.4 Row Level Security (RLS) Supabase

Meskipun autentikasi dilakukan custom, RLS tetap diterapkan di database sebagai lapisan keamanan kedua:

```sql
-- Contoh policy: prajurit hanya bisa lihat data sendiri
CREATE POLICY "prajurit_own_data" ON attendance
  FOR SELECT USING (user_id = current_user_id());

-- Komandan bisa lihat data unit-nya
CREATE POLICY "komandan_unit_data" ON users
  FOR SELECT USING (
    satuan = (SELECT satuan FROM users WHERE id = current_user_id())
    AND role = 'prajurit'
  );
```

### 3.5 Validasi PIN

- PIN harus tepat **6 digit angka**
- Disimpan sebagai **bcrypt hash** (cost factor 12) di kolom `pin_hash`
- Tidak ada fitur "lupa PIN" — reset hanya bisa dilakukan oleh Admin
- Maksimum **5 percobaan login gagal** → akun terkunci sementara (15 menit)

---

## 4. Spesifikasi Database

### 4.1 Daftar Tabel

| Tabel | Fungsi |
|---|---|
| `users` | Data master personel |
| `tasks` | Manajemen tugas |
| `task_reports` | Laporan penyelesaian tugas |
| `attendance` | Data kehadiran |
| `leave_requests` | Permintaan izin |
| `announcements` | Broadcast pengumuman |
| `messages` | Pesan inbox |
| `logistics` | Data logistik |
| `audit_logs` | Log aktivitas sistem |
| `shift_schedules` | Jadwal shift |
| `documents` | Arsip dokumen |
| `discipline_notes` | Catatan disiplin personel |

### 4.2 DDL Lengkap

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE user_role AS ENUM ('admin', 'komandan', 'staf', 'guard', 'prajurit');
CREATE TYPE command_level AS ENUM ('BATALION', 'KOMPI', 'PELETON');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'done', 'approved', 'rejected');
CREATE TYPE attendance_status AS ENUM ('hadir', 'izin', 'sakit', 'alpa', 'dinas_luar');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================
-- TABEL: users
-- ============================================================
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nrp           varchar(20) UNIQUE NOT NULL,
  pin_hash      text NOT NULL,
  nama          varchar(100) NOT NULL,
  role          user_role NOT NULL DEFAULT 'prajurit',
  level_komando command_level,
  pangkat       varchar(50),
  jabatan       varchar(100),
  satuan        varchar(100) NOT NULL,
  foto_url      text,
  is_active     boolean NOT NULL DEFAULT true,
  is_online     boolean NOT NULL DEFAULT false,
  login_attempts int NOT NULL DEFAULT 0,
  locked_until  timestamptz,
  last_login    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_komandan_level
    CHECK (
      (role = 'komandan' AND level_komando IS NOT NULL)
      OR (role <> 'komandan' AND level_komando IS NULL)
    )
);

-- Index
CREATE INDEX idx_users_nrp ON users(nrp);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_level_komando ON users(level_komando);
CREATE INDEX idx_users_satuan ON users(satuan);

-- ============================================================
-- TABEL: tasks
-- ============================================================
CREATE TABLE tasks (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  judul         varchar(200) NOT NULL,
  deskripsi     text,
  assigned_to   uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  status        task_status NOT NULL DEFAULT 'pending',
  prioritas     smallint NOT NULL DEFAULT 2 CHECK (prioritas BETWEEN 1 AND 3),
  deadline      timestamptz,
  satuan        varchar(100),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);

-- ============================================================
-- TABEL: task_reports
-- ============================================================
CREATE TABLE task_reports (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  isi_laporan   text NOT NULL,
  file_url      text,
  submitted_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABEL: attendance
-- ============================================================
CREATE TABLE attendance (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  tanggal       date NOT NULL DEFAULT CURRENT_DATE,
  check_in      timestamptz,
  check_out     timestamptz,
  status        attendance_status NOT NULL DEFAULT 'hadir',
  keterangan    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tanggal)
);

-- Index
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_tanggal ON attendance(tanggal);

-- ============================================================
-- TABEL: leave_requests
-- ============================================================
CREATE TABLE leave_requests (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  jenis_izin    varchar(50) NOT NULL,  -- 'cuti', 'sakit', 'dinas_luar'
  tanggal_mulai date NOT NULL,
  tanggal_selesai date NOT NULL,
  alasan        text NOT NULL,
  status        leave_status NOT NULL DEFAULT 'pending',
  reviewed_by   uuid REFERENCES users(id),
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABEL: announcements
-- ============================================================
CREATE TABLE announcements (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  judul         varchar(200) NOT NULL,
  isi           text NOT NULL,
  target_role   user_role[],  -- NULL = semua role
  target_satuan varchar(100),  -- NULL = semua satuan
  created_by    uuid REFERENCES users(id),
  is_pinned     boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABEL: messages
-- ============================================================
CREATE TABLE messages (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user     uuid REFERENCES users(id),
  to_user       uuid REFERENCES users(id),
  isi           text NOT NULL,
  is_read       boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABEL: logistics
-- ============================================================
CREATE TABLE logistics (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_item     varchar(200) NOT NULL,
  kategori      varchar(100),
  jumlah        int NOT NULL DEFAULT 0,
  satuan_item   varchar(50),
  kondisi       varchar(50),  -- 'baik', 'rusak_ringan', 'rusak_berat'
  lokasi        varchar(100),
  catatan       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABEL: audit_logs
-- ============================================================
CREATE TABLE audit_logs (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  action        varchar(100) NOT NULL,
  resource      varchar(100),
  resource_id   uuid,
  detail        jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- TABEL: shift_schedules
-- ============================================================
CREATE TABLE shift_schedules (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  tanggal       date NOT NULL,
  shift_mulai   time NOT NULL,
  shift_selesai time NOT NULL,
  jenis_shift   varchar(50),  -- 'pagi', 'siang', 'malam', 'jaga'
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABEL: documents
-- ============================================================
CREATE TABLE documents (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama          varchar(200) NOT NULL,
  kategori      varchar(100),
  file_url      text NOT NULL,
  file_size     bigint,
  satuan        varchar(100),
  uploaded_by   uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABEL: discipline_notes
-- ============================================================
CREATE TABLE discipline_notes (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  jenis         varchar(50),  -- 'peringatan', 'penghargaan', 'catatan'
  isi           text NOT NULL,
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Contoh policy akses operasional berbasis bidang staf & komando
-- ============================================================
-- S-1 (Pers): write attendance + leave_requests
CREATE POLICY "staf_s1_write_attendance" ON attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_user_id()
        AND u.role = 'staf'
        AND (u.jabatan ILIKE 'S-1%' OR u.jabatan ILIKE '%PERS%')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_user_id()
        AND u.role = 'staf'
        AND (u.jabatan ILIKE 'S-1%' OR u.jabatan ILIKE '%PERS%')
    )
  );

CREATE POLICY "staf_s1_write_leave_requests" ON leave_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_user_id()
        AND u.role = 'staf'
        AND (u.jabatan ILIKE 'S-1%' OR u.jabatan ILIKE '%PERS%')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_user_id()
        AND u.role = 'staf'
        AND (u.jabatan ILIKE 'S-1%' OR u.jabatan ILIKE '%PERS%')
    )
  );

-- S-3 (Ops): write tasks + shift_schedules
CREATE POLICY "staf_s3_write_tasks" ON tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_user_id()
        AND u.role = 'staf'
        AND (u.jabatan ILIKE 'S-3%' OR u.jabatan ILIKE '%OPS%')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_user_id()
        AND u.role = 'staf'
        AND (u.jabatan ILIKE 'S-3%' OR u.jabatan ILIKE '%OPS%')
    )
  );

CREATE POLICY "staf_s3_write_shift_schedules" ON shift_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_user_id()
        AND u.role = 'staf'
        AND (u.jabatan ILIKE 'S-3%' OR u.jabatan ILIKE '%OPS%')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_user_id()
        AND u.role = 'staf'
        AND (u.jabatan ILIKE 'S-3%' OR u.jabatan ILIKE '%OPS%')
    )
  );

-- S-4 (Log): write logistics (eksklusif operasional logistik)
CREATE POLICY "staf_s4_write_logistics" ON logistics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_user_id()
        AND u.role = 'staf'
        AND (u.jabatan ILIKE 'S-4%' OR u.jabatan ILIKE '%LOG%')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_user_id()
        AND u.role = 'staf'
        AND (u.jabatan ILIKE 'S-4%' OR u.jabatan ILIKE '%LOG%')
    )
  );

-- Petugas Jaga / Provost: read discipline_notes
CREATE POLICY "guard_read_discipline_notes" ON discipline_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = current_user_id()
        AND u.role = 'guard'
    )
  );
```

### 4.3 Fungsi Database (Helper)

```sql
-- Fungsi untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pada tabel yang punya updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fungsi verify PIN
CREATE OR REPLACE FUNCTION verify_user_pin(p_nrp varchar, p_pin varchar)
RETURNS TABLE(user_id uuid, user_role user_role, user_nama varchar) AS $$
BEGIN
  RETURN QUERY
  SELECT id, role, nama
  FROM users
  WHERE nrp = p_nrp
    AND pin_hash = crypt(p_pin, pin_hash)
    AND is_active = true
    AND (locked_until IS NULL OR locked_until < now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Spesifikasi API & Supabase

### 5.1 Inisialisasi Client

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### 5.2 Query Patterns

#### Login

```typescript
// hooks/useAuth.ts
const login = async (nrp: string, pin: string) => {
  const { data, error } = await supabase
    .rpc('verify_user_pin', { p_nrp: nrp, p_pin: pin });

  if (error || !data?.length) throw new Error('NRP atau PIN salah');

  const user = data[0];
  // Simpan ke Zustand store & localStorage
  // Update last_login & is_online
};
```

#### Realtime Subscription

```typescript
// hooks/useTasks.ts — contoh subscribe perubahan tugas
useEffect(() => {
  const channel = supabase
    .channel('tasks-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `assigned_to=eq.${userId}`
    }, (payload) => {
      // Update local state
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [userId]);
```

### 5.3 Tipe Data TypeScript

```typescript
// src/types/index.ts

export type Role = 'admin' | 'komandan' | 'staf' | 'guard' | 'prajurit';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'approved' | 'rejected';
export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpa' | 'dinas_luar';

export interface User {
  id: string;
  nrp: string;
  nama: string;
  role: Role;
  pangkat?: string;
  jabatan?: string;
  satuan: string;
  foto_url?: string;
  is_active: boolean;
  is_online: boolean;
  last_login?: string;
  created_at: string;
}

export interface Task {
  id: string;
  judul: string;
  deskripsi?: string;
  assigned_to: string;
  assigned_by: string;
  status: TaskStatus;
  prioritas: 1 | 2 | 3;
  deadline?: string;
  satuan?: string;
  created_at: string;
  // Joined fields
  assignee?: User;
  assigner?: User;
}

export interface Attendance {
  id: string;
  user_id: string;
  tanggal: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatus;
  keterangan?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource?: string;
  detail?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  user?: User;
}
```

---

## 6. Spesifikasi Frontend

### 6.1 Routing

```typescript
// router/index.tsx
const routes = [
  { path: '/login',                  element: <Login />,              public: true },
  { path: '/admin/dashboard',        element: <AdminDashboard />,     roles: ['admin'] },
  { path: '/admin/users',            element: <UserManagement />,     roles: ['admin', 'staf'] },
  { path: '/admin/audit',            element: <AuditLog />,           roles: ['admin'] },
  { path: '/admin/logistics',        element: <Logistics />,          roles: ['staf'] },
  { path: '/admin/attendance',       element: <AttendanceReport />,   roles: ['staf'] },
  { path: '/admin/schedule',         element: <ShiftSchedule />,      roles: ['staf'] },
  { path: '/admin/documents',        element: <Documents />,          roles: ['admin', 'staf', 'komandan'] },
  { path: '/admin/announcements',    element: <Announcements />,      roles: ['admin', 'staf', 'komandan'] },
  { path: '/admin/gatepass-monitor', element: <GatePassMonitor />,    roles: ['staf', 'komandan'] },
  { path: '/admin/pos-jaga',         element: <PosJaga />,            roles: ['staf'] },
  { path: '/admin/settings',         element: <Settings />,           roles: ['admin'] },
  { path: '/komandan/dashboard',     element: <KomandanDashboard />,  roles: ['komandan'] },
  { path: '/komandan/tasks',         element: <TaskManagement />,     roles: ['komandan'] },
  { path: '/komandan/personnel',     element: <Personnel />,          roles: ['komandan'] },
  { path: '/komandan/reports',       element: <Reports />,            roles: ['komandan'] },
  { path: '/guard/gatepass-scan',    element: <GuardDashboard />,     roles: ['guard'] },
  { path: '/staf/dashboard',         element: <StafDashboard />,      roles: ['staf'] },
  { path: '/staf/messages',          element: <Messages />,           roles: ['staf'] },
  { path: '/prajurit/dashboard',     element: <PrajuritDashboard />,  roles: ['prajurit'] },
  { path: '/prajurit/tasks',         element: <MyTasks />,            roles: ['prajurit'] },
  { path: '/prajurit/attendance',    element: <Attendance />,         roles: ['prajurit'] },
  { path: '/prajurit/profile',       element: <Profile />,            roles: ['prajurit'] },
  { path: '/',                       element: <Navigate to="/login" /> },
  { path: '*',                       element: <NotFound /> },
];
```

### 6.2 State Management (Zustand)

```typescript
// store/authStore.ts
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (nrp: string, pin: string) => Promise<void>;
  logout: () => void;
  updateOnlineStatus: (status: boolean) => void;
}

// store/uiStore.ts
interface UIStore {
  isDarkMode: boolean;
  sidebarOpen: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (msg: string, type: string) => void;
}
```

### 6.3 Custom Hooks

| Hook | Fungsi |
|---|---|
| `useAuth()` | Login, logout, current user |
| `useUsers()` | CRUD users, filter by role/satuan |
| `useTasks()` | CRUD tasks, filter, assign |
| `useAttendance()` | Check-in/out, riwayat |
| `useAuditLogs()` | Baca audit log (admin only) |
| `useAnnouncements()` | CRUD pengumuman |
| `useMessages()` | Inbox & kirim pesan |
| `useRealtime()` | Subscribe perubahan data |

---

## 7. Spesifikasi Dashboard Admin

### 7.1 Halaman & Komponen

| Halaman | Path | Fitur Utama |
|---|---|---|
| Control Center | `/admin/dashboard` | Status sistem, ringkasan kesehatan platform |
| User Management | `/admin/users` | Manajemen akun, reset PIN, aktivasi/nonaktif akun |
| Audit Log | `/admin/audit` | Timeline aktivitas, filter by user/action/date |
| Settings | `/admin/settings` | Branding, feature flag, konfigurasi platform |
| Backup | `/admin/backup` | Backup/restore data sistem |

### 7.2 Fitur Kritis

**Reset PIN Massal:**
- Admin memilih satu atau banyak user
- Pilih PIN baru (atau generate otomatis)
- Konfirmasi dengan PIN Admin sendiri
- Log tercatat di audit_logs

**Import/Export Data:**
- Format CSV (user, attendance, tasks)
- Validasi format sebelum import
- Preview data sebelum konfirmasi import
- Export dengan filter tanggal/satuan/role

**Monitoring Real-time:**
- Badge online/offline menggunakan Supabase Realtime
- Update otomatis setiap user login/logout
- Tampil total user aktif saat ini

---

## 8. Spesifikasi Dashboard Komandan

### 8.1 Halaman & Komponen

| Halaman | Path | Fitur Utama |
|---|---|---|
| Operational Center | `/komandan/dashboard` | Status unit, tugas aktif, alert kritis |
| Task Management | `/komandan/tasks` | Buat, assign, approval tugas |
| Personnel | `/komandan/personnel` | Data & tracking anggota unit |
| Reports | `/komandan/reports` | Laporan masuk, approval |
| Evaluation | `/komandan/evaluation` | Catatan kinerja & disiplin |
| Attendance | `/komandan/attendance` | Tracking kehadiran unit |
| Gate Pass Status | `/komandan/gatepass-approval` | Status operasional gate pass unit |

### 8.2 Alur Task Management

```
Komandan buat tugas
       │
       ▼
Set: judul, deskripsi, assigned_to, deadline, prioritas
       │
       ▼
Status: PENDING
       │
       ▼ (prajurit mulai kerjakan)
Status: IN_PROGRESS
       │
       ▼ (prajurit submit laporan)
Status: DONE
       │
   ┌───┴───┐
   ▼       ▼
APPROVED  REJECTED
```

### 8.3 Approval Sistem

- Komandan menerima notifikasi saat prajurit submit laporan
- Dapat melihat isi laporan + file attachment
- Approve → status tugas berubah ke `approved`
- Reject + catatan → status kembali ke `in_progress`

---

## 9. Spesifikasi Dashboard Prajurit

### 9.1 Halaman & Komponen

| Halaman | Path | Fitur Utama |
|---|---|---|
| My Dashboard | `/prajurit/dashboard` | Tugas hari ini, status kehadiran, notifikasi |
| My Tasks | `/prajurit/tasks` | List tugas, kerjakan, submit laporan |
| Attendance | `/prajurit/attendance` | Check-in/out, riwayat |
| Gate Pass | `/prajurit/gatepass` | Pengajuan detail gate pass |
| Scan Pos Jaga | `/prajurit/scan-pos` | Scan QR statis Pos Jaga untuk keluar/kembali |
| Messages | `/prajurit/messages` | Inbox & kirim pesan |
| Leave Request | `/prajurit/leave` | Pengajuan & status izin |
| Profile | `/prajurit/profile` | Data diri, statistik pribadi |

### 9.2 Alur Check-in/Check-out

```typescript
// Aturan bisnis absensi:
// - Hanya bisa check-in satu kali per hari
// - Check-out hanya bisa dilakukan setelah check-in
// - Tidak bisa check-in/out untuk hari yang sudah lewat
// - Waktu diambil dari server (Supabase), bukan client
```

### 9.3 Alur Gate Pass Baru

```text
1. Prajurit login dan membuka menu Gate Pass
2. Isi detail keperluan, tujuan, jam keluar, dan jam kembali
3. Submit pengajuan → status langsung disetujui otomatis
4. Prajurit datang ke Pos Jaga dan scan QR statis
5. Scan pertama mengubah status menjadi checked_in
6. Saat kembali, scan QR Pos Jaga lagi
7. Scan kedua mengubah status menjadi completed
8. Jika melewati batas kembali saat checked_in, status menjadi overdue
```

Aturan bisnis:
- Tidak ada lagi approval manual untuk pengajuan gate pass
- QR yang dipindai adalah QR statis milik Pos Jaga, bukan QR gate pass per pengajuan
- Sistem mencocokkan ID user, ID pos jaga, dan timestamp scan di backend
- Monitoring admin menampilkan `approved`, `checked_in`, `completed`, dan `overdue`

### 9.3 Submit Laporan Tugas

- Prajurit mengisi form laporan teks (wajib)
- Opsional: upload file pendukung (max 10MB)
- Setelah submit → status tugas → `done`
- Menunggu approval Komandan

---

## 10. Spesifikasi Dashboard Staf Operasional

### 10.1 Halaman & Komponen

| Halaman | Path | Fitur Utama |
|---|---|---|
| Pusat Staf | `/staf/dashboard` | Statistik satuan, modul akses cepat per bidang, pengumuman terpinit |
| Pesan | `/staf/messages` | Inbox & kirim pesan antar personel |
| Personel | `/admin/users` | Lihat & kelola data personel satuan |
| Rekap Absensi | `/admin/attendance` | Rekap & export data kehadiran (S-1) |
| Jadwal Shift | `/admin/schedule` | Lihat & atur jadwal shift (S-3) |
| Logistik | `/admin/logistics` | Inventaris perlengkapan satuan (S-4) |
| Pos Jaga | `/admin/pos-jaga` | Monitoring pos jaga & QR (S-3) |
| Gate Pass Monitor | `/admin/gatepass-monitor` | Monitoring gate pass aktif (S-3) |

### 10.2 Deteksi Bidang Otomatis

Dashboard staf mendeteksi bidang penugasan secara otomatis dari field `jabatan` user:

| Keyword di Jabatan | Bidang | Label |
|---|---|---|
| `s-1`, `s1`, `pers` | `pers` | Staf Personel (S-1) |
| `s-4`, `s4`, `log` | `log` | Staf Logistik (S-4) |
| `s-3`, `s3`, `ops` | `ops` | Staf Operasional (S-3) |
| *(lainnya)* | `umum` | Staf Operasional |

### 10.3 Modul Akses Cepat per Bidang

Modul yang ditampilkan di Quick Access disesuaikan per bidang:

- **S-1 (Pers):** Manajemen Personel, Rekap Absensi, Izin, Pesan
- **S-4 (Log):** Inventaris Logistik, Data Personel, Pesan
- **S-3 (Ops):** Jadwal Shift, Pos Jaga, Gate Pass Monitor, Data Personel, Pesan
- **Umum:** Data Personel, Pesan

### 10.4 Statistik Dashboard

| Stat | Sumber Data | Keterangan |
|---|---|---|
| Total Personel | `users` WHERE `satuan` AND `is_active` | Personel aktif di satuan staf |
| Hadir Hari Ini | `attendance` WHERE `tanggal = today` AND `status = hadir` | Kehadiran hari berjalan |
| Tugas Aktif | `tasks` WHERE `status IN (pending, in_progress)` | Semua tugas aktif satuan |
| Logistik Pending | `logistics_requests` WHERE `status = pending` | Permintaan logistik menunggu |

---

## 11. Spesifikasi UI/UX

### 11.1 Design System

**Palet Warna (Military Dark Theme)**

| Token | Hex | Penggunaan |
|---|---|---|
| `primary` | `#4B5320` | Olive Drab — CTA, aksen utama |
| `secondary` | `#8B7355` | Khaki — elemen sekunder |
| `bg-dark` | `#1A1F14` | Background utama (dark mode) |
| `bg-card` | `#252B1C` | Background card |
| `surface` | `#2F3620` | Surface element |
| `text-primary` | `#E8E8D0` | Teks utama |
| `text-muted` | `#9B9B7A` | Teks sekunder |
| `accent-red` | `#C41E3A` | Alert, bahaya |
| `accent-gold` | `#D4AF37` | Penghargaan, warning |
| `success` | `#4CAF50` | Status sukses/hadir |

**Tipografi**
- Font utama: `Inter` (UI) atau `Roboto Mono` (data/NRP)
- Size scale: 12, 14, 16, 18, 24, 32px
- Weight: 400 (normal), 500 (medium), 700 (bold)

### 11.2 Layout

**Desktop (>= 1024px):**
- Sidebar tetap di kiri (240px lebar)
- Content area scrollable
- Header dengan info user & notifikasi

**Mobile (< 768px):**
- Bottom Tab Bar navigation (4-5 item)
- Sidebar dalam drawer/overlay
- Konten full-width

### 11.3 Komponen Kritis

**LoginPage**
- 1 input NRP (numeric, maxlength 20)
- 1 input PIN (password, maxlength 6, numeric only)
- Logo + nama satuan di header
- Tombol "Masuk" dengan loading state
- Pesan error jelas (NRP tidak ditemukan / PIN salah)
- Tidak ada link daftar/lupa password

**StatCard**
```
┌────────────────────────┐
│ 🪖 Total Personel       │
│                         │
│       247               │
│    ↑ 3 dari kemarin     │
└────────────────────────┘
```

**TaskCard**
```
┌────────────────────────────┐
│ [!] Patroli Sektor Timur   │
│ Deadline: 14 Apr 2026      │
│ Status: ● IN PROGRESS      │
│                [Lapor]     │
└────────────────────────────┘
```

### 11.4 Aksesibilitas

- Semua input memiliki label & placeholder
- Warna tidak menjadi satu-satunya indikator status
- Keyboard navigasi untuk form login
- Loading skeleton saat fetch data

---

## 12. Spesifikasi Deployment

### 12.1 GitHub Pages Configuration

Deployment frontend dijalankan di GitHub Pages dengan konfigurasi berikut:

- Hash router agar refresh dan deep-link aman di subpath Pages
- Base path `/v/` untuk repository project page
- `public/404.html` sebagai fallback redirect SPA
- Build production dijalankan oleh workflow GitHub Actions

### 12.2 Vite Configuration

`vite.config.ts` menggunakan base path dari `VITE_BASE_PATH` agar build bisa dipakai di GitHub Pages maupun environment lain.

### 12.3 Checklist Sebelum Deploy

- [ ] Secret GitHub Actions untuk Supabase sudah diset
- [ ] Build lokal berhasil (`npm run build`)
- [ ] Migration SQL sudah dijalankan di Supabase
- [ ] RLS sudah diaktifkan pada semua tabel
- [ ] Tidak ada `console.log` yang tertinggal
- [ ] TypeScript tidak ada error (`npm run type-check`)
- [ ] Semua route protected sudah diuji

### 12.4 Domain & SSL

- GitHub Pages menyediakan domain gratis: `yuniamagsila.github.io/v/`
- HTTPS otomatis disediakan oleh GitHub Pages
- Custom domain dapat dikonfigurasi di GitHub Pages Settings

---

## 13. Spesifikasi Keamanan

### 13.1 Prinsip Keamanan

| Prinsip | Implementasi |
|---|---|
| **Defense in Depth** | RLS di DB + validasi di frontend + type safety |
| **Least Privilege** | Setiap role hanya bisa akses data yang diperlukan |
| **No Trust by Default** | Setiap request divalidasi role-nya |
| **Audit Everything** | Semua aksi CUD dicatat di audit_logs |

### 13.2 Keamanan PIN

- PIN tidak pernah dikirim dalam bentuk plaintext ke client
- Perbandingan PIN dilakukan di PostgreSQL via fungsi `crypt()`
- PIN hash menggunakan bcrypt dengan salt otomatis
- Tidak ada endpoint yang mengembalikan `pin_hash`

### 13.3 Keamanan Session

```typescript
// Session disimpan di localStorage dengan struktur:
{
  "karyo_session": {
    "user_id": "uuid",
    "role": "prajurit",
    "expires_at": "2026-04-14T10:00:00Z"
  }
}

// Session expire setelah 8 jam (shift kerja)
// Logout otomatis saat browser ditutup (opsional: sessionStorage)
```

### 13.4 Proteksi CSRF & XSS

- Content Security Policy header via konfigurasi aplikasi dan build pipeline
- Input sanitization pada semua form input
- Tidak menggunakan `dangerouslySetInnerHTML`
- Semua data dari Supabase di-escape sebelum ditampilkan

### 13.5 Rate Limiting Login

```typescript
// Logika di frontend + dicatat di DB:
// - 5 percobaan gagal berturut-turut = lockout 15 menit
// - Reset counter setelah login berhasil
// - Tercatat di kolom login_attempts & locked_until pada tabel users
```

---

## 14. Spesifikasi Performa

### 14.1 Target Performa

| Metrik | Target |
|---|---|
| First Contentful Paint (FCP) | < 1.5 detik |
| Time to Interactive (TTI) | < 3 detik |
| Bundle size (gzipped) | < 300 KB |
| Lighthouse Score | > 80 |
| API Response time | < 500ms |

### 14.2 Optimasi

**Code Splitting:**
- Setiap dashboard di-lazy load (`React.lazy()`)
- Vendor chunk dipisah (React, Supabase, Zustand)

**Data Fetching:**
- Pagination pada tabel besar (50 row per halaman)
- Debounce pada input pencarian (300ms)
- Cache data yang jarang berubah (users, satuan)

**Realtime:**
- Subscribe hanya pada channel yang relevan dengan role user
- Unsubscribe saat komponen unmount

---

## 15. Roadmap Pengembangan

### Phase 1 — MVP (v1.0) ✅ Selesai
- [x] Spesifikasi & desain sistem
- [x] Setup project (Vite + React + TS + Tailwind)
- [x] Supabase schema & RLS
- [x] Halaman Login + routing RBAC
- [x] Dashboard Prajurit (core features)
- [x] Dashboard Komandan (core features)
- [x] Dashboard Admin (core features)
- [x] Deploy ke GitHub Pages

### Phase 1.5 — Stabilisasi (v1.2.1) ✅ Selesai
- [x] Gate Pass & QR Scanner (pengajuan, scan pos jaga, monitoring, approval)
- [x] Guard dashboard untuk verifikasi Gate Pass
- [x] Backup & restore database multi-tabel dengan format JSON terversi
- [x] Feature flags berbasis database (aktifkan/nonaktifkan fitur per role)
- [x] Platform branding (nama satuan, tagline, logo)
- [x] Auto-refresh dashboard & display density setting
- [x] Audit log dengan pembersihan berdasar rentang waktu
- [x] Global realtime sync via Supabase subscription
- [x] Unit test & e2e test dengan Vitest + Playwright
- [x] CI/CD pipeline: lint, type-check, test, build, security scan, smoke prod
- [x] Service worker untuk cache management di GitHub Pages SPA

### Phase 2 — Enhancement (v1.5) ✅ Selesai
- [x] Notifikasi push (browser notifications)
- [x] Export PDF laporan kehadiran (via print API)
- [x] Upload foto profil personel
- [x] Fitur pencarian global
- [x] Kalender interaktif (ShiftSchedule calendar view)
- [x] Role Staf Operasional (S-1, S-3, S-4) dengan dashboard, RBAC, dan akses modul

### Phase 3 — Advanced (v2.0)
- [x] PWA (Progressive Web App) untuk akses offline
- [ ] Integrasi API eksternal (cuaca, peta)
- [x] Analytics dashboard dengan chart canggih
- [ ] Multi-satuan (satu sistem untuk banyak unit)
- [x] Backup otomatis terjadwal

---

*Dokumen ini adalah spesifikasi hidup yang akan diperbarui seiring perkembangan sistem.*

**Copyright © 2026 Nafal Faturizki. All rights reserved.**
