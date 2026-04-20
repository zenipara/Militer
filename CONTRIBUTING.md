# Panduan Kontribusi KARYO OS

Terima kasih telah berkontribusi pada KARYO OS! Dokumen ini berisi konvensi dan standar yang harus diikuti agar kode tetap konsisten.

---

## 1. Standar Bahasa UI

**Seluruh teks antarmuka pengguna (label, tombol, placeholder, pesan error, judul halaman) HARUS dalam Bahasa Indonesia.**

### Kamus Istilah Resmi

| ❌ Inggris (jangan dipakai) | ✅ Bahasa Indonesia (gunakan ini) |
|---|---|
| Control Center | Pusat Kendali |
| Ops Center | Pusat Operasi |
| Health Metrics | Metrik Sistem |
| Dashboard | Beranda / Dasbor |
| Home | Beranda |
| Status | Status |
| Online / Offline | Online / Offline *(boleh tetap dalam Inggris)* |
| Submit | Kirim |
| Cancel | Batal |
| Save | Simpan |
| Delete | Hapus |
| Edit | Ubah |
| Add | Tambah |
| Search | Cari |
| Filter | Filter |
| Loading | Memuat |
| Error | Kesalahan |
| Success | Berhasil |
| Warning | Peringatan |
| Confirmed | Dikonfirmasi |
| Approved | Disetujui |
| Rejected | Ditolak |
| Pending | Menunggu |
| Active | Aktif |
| Inactive | Nonaktif |
| Profile | Profil |
| Settings | Pengaturan |
| Logout | Keluar |
| Login | Masuk |
| Report | Laporan |
| Announcement | Pengumuman |
| Schedule | Jadwal |
| Attendance | Kehadiran / Absensi |
| Personnel | Personel |
| Task | Tugas |
| Leave Request | Permohonan Izin |
| Evaluation | Evaluasi |
| Logistics | Logistik |
| Audit Log | Log Audit |
| Documents | Dokumen |

### Pengecualian yang Diperbolehkan
- Nama proper (KARYO OS, Supabase, NRP)
- Istilah teknis tanpa padanan umum (URL, ID, PIN, CSV)
- Label role singkat: `admin`, `komandan`, `staf`, `guard`, `prajurit` (huruf kecil dalam kode)

---

## 2. Struktur Proyek

```
src/
├── components/
│   ├── common/       # Komponen generik: Button, Modal, Input, Badge, ErrorBoundary, AvatarUpload
│   ├── layout/       # DashboardLayout, Sidebar, Navbar, BottomTabBar
│   └── ui/           # StatCard, Table, PageHeader, Pagination, BarChart, GlobalSearch, AttendanceHeatmap
├── hooks/            # Custom hooks: useUsers, useTasks, useAttendance, useMessages, ...
├── pages/
│   ├── admin/        # Halaman khusus Super Admin
│   ├── komandan/     # Halaman khusus Komandan
│   ├── staf/         # Halaman khusus Staf Bidang (S-1/S-3/S-4)
│   ├── guard/        # Halaman khusus Petugas Jaga / Provost
│   └── prajurit/     # Halaman khusus Prajurit
├── router/           # Definisi route dan ProtectedRoute
├── store/            # Zustand stores: authStore, uiStore
├── types/            # TypeScript type definitions (index.ts)
└── utils/            # Utility functions: date.ts
supabase/
└── migrations/       # SQL migrations dijalankan secara berurutan
```

---

## 3. Konvensi Kode

### TypeScript
- Gunakan `interface` untuk tipe data domain (User, Task, dll.)
- Gunakan `type` hanya untuk union/alias
- Hindari `any` — gunakan `unknown` dan type-guard
- Semua export named, kecuali komponen halaman (default export)

### React
- Komponen fungsional dengan hooks
- State lokal dengan `useState`, global dengan Zustand
- Gunakan `useCallback` untuk fungsi yang diteruskan sebagai prop
- Error boundary wajib di level root (`ErrorBoundary` di `main.tsx`)

### Styling (Tailwind CSS 4)
- Gunakan CSS variable (misalnya `text-text-primary`, `bg-bg-card`) — jangan hardcode warna
- Class `app-card` untuk kartu konten
- Class `form-control` untuk semua input form
- Hindari inline style kecuali untuk nilai dinamis

### Ikon
- Gunakan `lucide-react` — **jangan** emoji sebagai ikon UI
- Selalu tambahkan `aria-hidden="true"` pada wrapper ikon
- Ukuran standar: `size={16}` untuk navigasi, `size={20}` untuk tombol

---

## 4. Database & Supabase

### Migrations
- Simpan di `supabase/migrations/` dengan prefix nomor urut: `001_`, `002_`, dst.
- Setiap migration harus idempoten (bisa dijalankan ulang tanpa error)
- Tambahkan komentar pada setiap blok SQL

### Row Level Security (RLS)
- **Dev**: policy terbuka (`USING (TRUE)`) di file `004_production_rls.sql` akan diganti sebelum produksi
- **Prod**: gunakan session variables `karyo.current_user_id` / `karyo.current_user_role` via `set_session_context()` RPC

### Timestamp
- Selalu gunakan server-side timestamp untuk data kritis (check-in/check-out) via RPC, bukan `new Date()` di client

---

## 5. Perintah Development

```bash
npm run dev          # Jalankan dev server
npm run build        # Production build
npm run type-check   # TypeScript check tanpa build
npm run lint         # ESLint
npm test             # Jalankan semua unit test (Vitest)
npm run test:coverage # Coverage report
```

---

## 6. Pull Request

- Judul PR dalam Bahasa Indonesia atau Inggris (konsisten per PR)
- Checklist yang jelas di deskripsi PR
- Pastikan `npm run build` dan `npm run type-check` berhasil sebelum PR
- Sertakan migration SQL jika ada perubahan skema database
