# 📖 Fitur Lengkap KARYO OS

Dokumentasi komprehensif semua fitur sistem per-role.

---

## 🏛️ Sistem Overview

KARYO OS mengimplementasikan model RBAC (Role-Based Access Control) dengan **5 role utama**:

```
┌─────────────────────────────────────────────┐
│ SUPER ADMIN (admin)                         │
│ • Konfigurasi sistem                        │
│ • Manajemen akun & reset PIN                │
│ • Audit log & monitoring kesehatan          │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ KOMANDAN (komandan)                         │
│ • Tier: Batalion / Kompi / Peleton          │
│ • Manajemen anggota & assign tugas           │
│ • Monitoring real-time & laporan            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ STAF (staf)                                 │
│ • Bidang: S-1 (Pers) / S-3 (Ops) / S-4 (Log)│
│ • Input data operasional sesuai bidang      │
│ • Kelola attendance, tasks, logistics       │
└──────────────────┬──────────────────────────┘
                   │
          ┌────────┴─────────┐
          │                  │
  ┌───────▼────────┐  ┌──────▼──────────┐
  │ PRAJURIT       │  │ GUARD / PROVOST │
  │ (prajurit)     │  │ (guard)         │
  │ • Tasks daily  │  │ • Validate QR   │
  │ • Gate Pass    │  │ • Scan in/out   │
  │ • Report       │  │ • Check notes   │
  └────────────────┘  └─────────────────┘
```

---

## 🔐 1. Autentikasi

### Login System
- **No Email Required** - Gunakan NRP (Nomor Registrasi Pokok)
- **6-Digit PIN** - Simple, military-standard authentication
- **Session Management** - Automatic role-based redirect
- **Multi-Tab Support** - Sinkronisasi session lintas tab

### Proses Login
```
┌──────────┐
│ Masukkan │ NRP (4-8 digit) + PIN 6-digit
│ Akun     │
└─────┬────┘
      │
      ▼
┌──────────────┐
│ Validasi     │ Cek ke database Supabase
│ Credentials  │
└─────┬────────┘
      │
   ┌──┴──┐
   │     │
   ▼     ▼
BERHASIL GAGAL
│        │
├─────┬──┤
│     │  │
▼     ▼  └──► Error: NRP/PIN salah
REDIRECT    (Auto-clear form)
(per role)
```

### Fitur Keamanan
- ✅ Password hashing bcrypt
- ✅ Row-level security (RLS) di database
- ✅ Session timeout (customizable)
- ✅ Audit log semua login attempts
- ✅ PIN reset hanya oleh admin

---

## 👤 2. Super Admin Dashboard (`/admin`)

### A. Konfigurasi Sistem
```
Settings → Configuration
├─ Branding
│  ├─ App name / logo
│  ├─ Color scheme (primary, secondary)
│  └─ Feature flags
├─ System Settings
│  ├─ Session timeout
│  ├─ Password policy
│  └─ Rate limiting
└─ Integrations
   ├─ Supabase config
   ├─ Email notifications
   └─ API keys
```

### B. Manajemen Personel (600+ users)
```
Users Management
├─ View & Filter (600+ personel)
│  ├─ Search: NRP / Nama
│  ├─ Filter: Role / Unit / Status
│  ├─ Sort: Nama / NRP / Dibuat Tgl
│  └─ Pagination: Virtual scroll (optimized)
├─ Import CSV
│  ├─ Template: NRP, Nama, Role, Unit
│  ├─ Batch import (< 10s untuk 600 user)
│  ├─ Validation & error reporting
│  └─ Rollback jika gagal
├─ Aksi Massal
│  ├─ Reset PIN bulk
│  ├─ Toggle status (active/inactive)
│  ├─ Ubah role/unit bulk
│  └─ Delete dengan konfirmasi
├─ CRUD Individual
│  ├─ Create: Form modal
│  ├─ Read: Detail view
│  ├─ Update: Edit modal (NRP, name, role, unit, status)
│  └─ Delete: Soft-delete + audit trail
└─ Audit Trail
   ├─ Semua aksi tercatat: who, what, when
   └─ Export untuk compliance
```

**Performance**: 600 users load < 2s, virtual scrolling only renders ~20 visible rows

### C. Audit Log & Monitoring
```
Monitoring
├─ Sistem Health
│  ├─ Database: Connection status, query time
│  ├─ Realtime: Active subscriptions, events/min
│  ├─ Storage: Usage, quota
│  └─ Performance: p50/p95/p99 latency
├─ User Activity
│  ├─ Login attempts (success/fail)
│  ├─ Feature usage (most accessed modules)
│  ├─ Data changes (CRUD operations)
│  └─ Timerange: Last 7/30/90 days
└─ Alerts
   ├─ Threshold: Errors > 10/min
   ├─ Deprecated: Downtime > 5min
   └─ Custom: Define custom metrics
```

### D. Feature Flags
```
Feature Control
├─ Toggle fitur on/off instantly (no deploy)
├─ Per-user rollout (A/B testing)
├─ Per-role activation
└─ Bulk enable/disable
```

---

## 👨‍💼 3. Komandan Dashboard (`/komandan`)

### A. Monitoring Personel
```
Personel Management
├─ Real-time List
│  ├─ Status: Hadir / Izin / Cuti / Keluar
│  ├─ Lokasi: Pos Jaga / HQ / Lapangan
│  ├─ Tier: Batalion / Kompi / Peleton
│  └─ Quick Actions: Send message, assign task, view profile
├─ Statistics
│  ├─ Total personel: count
│  ├─ Hadir hari ini: count
│  ├─ Gate pass aktif: count
│  ├─ Tugas pending: count
│  └─ Overdue alert: count
└─ View Details
   ├─ Attendance history
   ├─ Task completion rate
   ├─ Gate pass submissions
   └─ Discipline notes
```

### B. Task Management
```
Manajemen Tugas
├─ Create Task
│  ├─ Title, description, priority
│  ├─ Assign to: Individual / Group / Unit
│  ├─ Date: Tanggal target penyelesaian
│  ├─ Attachments: File, link, dokumen
│  ├─ Status: Pending → In Progress → Completed
│  └─ Template: Reuse tasks
├─ Monitor Progress
│  ├─ Filter: Status, priority, due date
│  ├─ View: List / Board / Calendar
│  ├─ Metrics: Completion rate, overdue count
│  └─ Bulk actions: Close, extend, reassign
└─ Review Submissions
   ├─ View task reports dari subordinate
   ├─ Accept / Reject / Request revision
   ├─ Add comments & feedback
   └─ Archive completed
```

### C. Gate Pass Approval
```
Gate Pass Management
├─ Pending Approvals
│  ├─ List: Pending submissions dari personel
│  ├─ Details: Tujuan, waktu keluar/kembali, alasan
│  ├─ Approve / Reject / Request info
│  ├─ Bulk approve (select multiple)
│  └─ Filter: Priority, requestor, destination
├─ Tracking
│  ├─ Approved list: Track siapa keluar
│  ├─ Status: Pending → Approved → Checked-in → Completed
│  ├─ Overdue alerts: Auto-flag jika tidak kembali tepat waktu
│  └─ History: Last 30 days
└─ Reports
   ├─ Gate pass usage: Frekuensi per personel
   ├─ Peak times: Jam berapa paling banyak keluar
   └─ Export: CSV / PDF untuk compliance
```

### D. Reports & Analytics
```
Laporan
├─ Harian
│  ├─ Attendance summary
│  ├─ Task completion
│  ├─ Gate passes approved
│  └─ Any incidents / alerts
├─ Mingguan / Bulanan
│  ├─ Personel performance ranking
│  ├─ Task completion trend
│  ├─ Attendance rate per personel
│  └─ Discipline incidents
└─ Custom Reports
   ├─ Select metrics, timeframe, recipients
   ├─ Schedule: One-time / recurring
   └─ Format: PDF / Email / Dashboard
```

### E. Komunikasi
```
Messaging
├─ Send Broadcast
│  ├─ Ke: Unit / Role / Individual
│  ├─ Tipe: Info / Alert / Urgent
│  ├─ Schedule: Now / Later
│  └─ Tracking: Delivered / Read
├─ Receive Reports
│  ├─ From: Subordinate
│  ├─ Tipe: Task report, issue, feedback
│  ├─ Filter & search
│  └─ Archive
└─ Notifications
   ├─ Real-time pada dashboard
   ├─ Email/push (optional)
   └─ Do-not-disturb hours
```

---

## 👔 4. Staf Dashboard (`/staf`)

Automatic role-mapping berdasarkan `jabatan` field:

### S-1 (Personnel / Pers)
```
Bidang Personel (S-1)
├─ Absensi Management
│  ├─ Manual input kehadiran
│  ├─ Bulk mark kehadiran (excel import)
│  ├─ History: 3 months
│  ├─ Discrepancy report (jika ada anomali)
│  └─ Approve: Dari sistem ke komandan
├─ Izin & Cuti
│  ├─ Kelola izin dari personel
│  ├─ Approve / Reject izin
│  ├─ Track: Cuti balance per personel
│  └─ Bulk cuti: Liburan nasional
└─ Personel Data
   ├─ Maintain data pribadi
   ├─ Contact info updates
   ├─ Education/training records
   └─ Discipline notes entry
```

### S-3 (Operations / Ops)
```
Bidang Operasional (S-3)
├─ Task Distribution
│  ├─ Create & assign tasks
│  ├─ Priority levels: Urgent / Normal / Low
│  ├─ Broadcast instruksi ke unit
│  └─ Track completion
├─ Shift Schedule
│  ├─ Create shift templates
│  ├─ Assign personel ke shift
│  ├─ Conflict detection
│  ├─ Publish schedule
│  └─ Track actual attendance
├─ Pos Jaga (Guard Post) Management
│  ├─ Buat & kelola posts
│  ├─ Assign guard (personel)
│  ├─ Generate QR code per post
│  ├─ Monitor: Siapa jaga sekarang
│  └─ History: Jaga records
└─ Incident Reporting
   ├─ Report operasional incidents
   ├─ Severity levels
   ├─ Send ke komandan & higher authority
   └─ Track resolution
```

### S-4 (Logistics / Log)
```
Bidang Logistik (S-4)
├─ Inventory Management
│  ├─ Item master: Nama, kategori, unit, harga
│  ├─ Stock tracking: Incoming / outgoing
│  ├─ Reorder alerts: Low stock warnings
│  ├─ Physical count: Reconcile vs system
│  └─ History: 1 year
├─ Purchase Requisition
│  ├─ Create request (dari komandan)
│  ├─ Approve / Reject dengan reason
│  ├─ Track: Budget vs actual
│  └─ Archive: Closed POs
├─ Distribution
│  ├─ Track: Mana barang dikirim
│  ├─ Recipient: Personel / Unit
│  ├─ Signature: Digital approval
│  └─ Return: Track retur
└─ Reports
   ├─ Inventory report (current stock)
   ├─ Usage report (trend)
   ├─ Budget utilization
   └─ Supplier performance
```

---

## 🪖 5. Prajurit Dashboard (`/prajurit`)

### A. Task Management
```
Tugas
├─ Assigned Tasks
│  ├─ List dari komandan
│  ├─ Priority: Urgent badge jika ada
│  ├─ Due date: Countdown timer
│  ├─ View: Details dengan attachment
│  └─ Status: Pending → In Progress → Submitted
├─ Report Submission
│  ├─ Kerjakan task → Submit report
│  ├─ Add: Description, attachment, photos
│  ├─ Status: Submitted (waiting for approval)
│  └─ Notification: Approval status
├─ History
│  ├─ Completed tasks (Last 30 days)
│  ├─ Rating: Berapa bintang dari komandan
│  └─ Performance trend chart
└─ Overdue Alert
   ├─ Tasks that past due date
   ├─ Fast action: Report late submission
   └─ Notification bell prominent
```

### B. Attendance
```
Absensi
├─ Check-in / Check-out
│  ├─ Daily clock in/out
│  ├─ Location capture (optional GPS)
│  ├─ Time recorded automatically
│  └─ Confirmation message
├─ Status
│  ├─ Hari ini: Present / Absent / Late
│  ├─ On leave: Show tipe cuti
│  ├─ On gate pass: Show tujuan
│  └─ Real-time update
├─ History
│  ├─ Monthly attendance calendar
│  ├─ Summary: Present/Absent/Cuti days
│  ├─ Punctuality: On-time %, average
│  └─ Discrepancy flag: If karyawan input ≠ system
└─ Permohonan Izin
   ├─ Submit: Cuti / Sakit / Keperluan
   ├─ Date range & alasan
   ├─ Attachment: Dokumen (surat sakit, etc)
   ├─ Status: Pending / Approved / Rejected
   └─ Notification: Approval update
```

### C. Gate Pass (Keluar-Masuk)
```
Gate Pass
├─ Submission
│  ├─ Alasan (Reason): Text, 5-255 chars
│  ├─ Tujuan (Destination): 3-255 chars
│  ├─ Waktu Keluar: Date + time
│  ├─ Waktu Kembali: Date + time (> keluar, ≤ 7 hari)
│  ├─ Auto-approval: Auto-approved jika eligible
│  │   └─ Kriteria: Good history, known destination, ≤ 24h, working hours
│  └─ Submit
├─ Approval Status
│  ├─ Auto-Approved: Langsung bisa berangkat
│  ├─ Pending: Tunggu approval komandan
│  ├─ Rejected: Reason ditampilkan
│  └─ Timeline: Submitted → Approved → Keluar → Kembali
├─ At Guard Post
│  ├─ Guard scan QR code (exit validation)
│  ├─ System records: Waktu keluar actual
│  ├─ When returning: Guard scan lagi
│  ├─ System records: Waktu kembali actual
│  └─ Status: Completed atau Overdue if > expected return
├─ Overdue Tracking
│  ├─ If waktu kembali passed, system flags Overdue
│  ├─ Notification ke: Personel + Komandan + Guard
│  ├─ Action: Contact personel, mark as emergency
│  └─ Resolution: Update actual return time
└─ History
   ├─ All submissions (Last 90 days)
   ├─ Status distribution chart
   ├─ Destination frequency
   └─ Average duration per destination
```

### D. Komunikasi & Dokumen
```
Messaging & Documents
├─ Inbox
│  ├─ Pesan dari komandan / staf
│  ├─ Tipe: Info / Alert / Instruksi
│  ├─ Read status
│  └─ Archive
├─ Notifikasi
│  ├─ Task assignment
│  ├─ Approval updates
│  ├─ Broadcast dari komandan
│  ├─ Badge count
│  └─ Sound + vibration (configurable)
├─ Documents
│  ├─ Download dokumen dari sistem
│  ├─ Types: Forms, regulasi, template
│  ├─ Offline access: Saved for offline reading
│  └─ Latest version indicator
└─ Profile
   ├─ View pribadi data
   ├─ Edit: Contact, alamat, emergency contact
   ├─ Security: Change PIN (old PIN required)
   └─ Picture: Upload profile photo
```

### E. Reporting
```
Laporan Pribadi
├─ Statistics
│  ├─ Attendance: % kehadiran bulan ini
│  ├─ Tasks: Completed vs assigned
│  ├─ Rating: Average rating dari komandan
│  ├─ Gate pass: Submitted vs approved
│  └─ Punctuality: Ontime %
├─ Trends
│  ├─ Performance trend (3-month chart)
│  ├─ Attendance pattern
│  ├─ Task completion rate trend
│  └─ Discipline incidents
└─ Export
   ├─ Download personal record (PDF)
   ├─ Attendance certificate
   ├─ Performance report
   └─ For HR / external agencies
```

---

## 🚧 6. Guard / Provost Dashboard (`/guard`)

### A. QR Scanning & Validation
```
Gate Post Duties
├─ QR Scanner Interface
│  ├─ Camera access (use device camera)
│  ├─ Scan gate pass QR code
│  ├─ Automatic validation
│  └─ Haptic feedback (vibration)
├─ Validation Checks
│  ├─ QR exists in system?
│  ├─ Gate pass status? (must be approved)
│  ├─ Waktu keluar sudah tiba? (or too early)
│  ├─ Jika scanning keluar: Record time & location
│  ├─ Jika scanning kembali: Mark completed
│  └─ If overdue: Alert and escalate
├─ Result Display
│  ├─ Green (✓): Scan success, personel bisa lewat
│  ├─ Red (✗): Invalid/expired/already used
│  ├─ Yellow (⚠): Warning - ask personel (e.g. slightly early)
│  └─ Beep + vibration feedback
└─ Manual Entry
   ├─ Jika QR scanner rusak: Manual NRP/PIN entry
   ├─ Verify personel identity
   ├─ Record manually if QR not available
   └─ Flag untuk review nanti
```

### B. Check-list & Inspection
```
Guard Check List
├─ Pre-Shift
│  ├─ Weapon count & serial check
│  ├─ Post condition inspection (cleanness, security)
│  ├─ Equipment availability
│  ├─ Sign-in to start shift
│  └─ Handover dari previous guard
├─ During Shift
│  ├─ Log all personel in/out
│  ├─ Monitor suspicious activity
│  ├─ Check guest list (if applicable)
│  ├─ Perimeter check (time-based)
│  └─ Report incidents immediately
└─ End-Shift
   ├─ Count & verify weapon again
   ├─ Final post inspection
   ├─ Handover checklist
   ├─ Sign-out from duty
   └─ Incident summary
```

### C. Discipline Notes
```
Personel Monitoring
├─ View Discipline History
│  ├─ Untuk setiap personel yang scan QR
│  ├─ Show: Incidents, warnings, violations
│  ├─ Tipe: Late arrivals, unauthorized absence, etc
│  ├─ Date & reason
│  └─ Status: Resolved / Pending
├─ Add Incident
│  ├─ Tipe: Violation, late, unauthorized, etc
│  ├─ Severity: Minor / Major / Critical
│  ├─ Description + timestamp
│  ├─ Evidence: Photo / attachment (optional)
│  └─ Escalate ke komandan
└─ Alert System
   ├─ Flag high-risk personel (pattern detection)
   ├─ Auto-notify komandan if severity high
   ├─ Followup: Track investigation status
   └─ Archive resolved cases
```

### D. Real-time Dashboard
```
Guard Dashboard
├─ Current Shift Info
│  ├─ Waktu shift: Check-in → Check-out
│  ├─ Expected personel today: Count
│  ├─ Checked in so far: Live counter
│  ├─ Overdue (not kembali): Alert list
│  └─ Post status: Alert jika ada issue
├─ Live Activity Log
│  ├─ Last 10 QR scans: Time, personel, tipe (in/out)
│  ├─ Auto-refresh
│  └─ Click untuk details
├─ Statistics
│  ├─ Total gate passes today
│  ├─ Failed scans (if any)
│  ├─ Average processing time
│  └─ Current active personel di luar
└─ Emergency
   ├─ SOS button untuk urgent report
   ├─ Direct call ke supervisor
   └─ Auto-escalate incident
```

---

## 🔑 Role Permissions Matrix

| Action | Admin | Komandan | Staf | Prajurit | Guard |
|--------|-------|----------|------|----------|-------|
| Create User | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete User | ✅ | ❌ | ❌ | ❌ | ❌ |
| View All Users | ✅ | ✅* | ✅* | ❌ | ❌ |
| Assign Task | ❌ | ✅* | ✅* | ❌ | ❌ |
| Create Task | ❌ | ✅ | ✅ | ❌ | ❌ |
| Submit Gate Pass | ❌ | ✅ | ❌ | ✅ | ❌ |
| Approve Gate Pass | ✅ | ✅* | ❌ | ❌ | ❌ |
| Scan QR | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Audit Log | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export Data | ✅ | ✅* | ✅* | ✅* | ❌ |

`*` = Scoped by unit/role hierarchy

---

## ⚙️ Advanced Features

### 1. Real-time Synchronization
- Multi-tab sync: Perubahan di satu tab langsung reflect di tab lain
- Realtime subscriptions: Live updates tanpa polling
- Conflict resolution: Last-write-wins strategy

### 2. Offline Support (PWA)
- Service Worker: Cache-first for assets
- IndexedDB: 50MB offline database
- Background sync: Sync when online again
- Offline indicator: Show status di navbar

### 3. Performance Optimization (600+ Users)
- Virtual scrolling: Only render visible rows
- Request coalescing: Deduplicate identical requests
- Caching: 2-min TTL on API responses
- Bundle optimization: Dynamic imports for heavy modules

### 4. Security
- Row-level security (RLS) at database layer
- NRP + PIN authentication
- Audit logging: All actions tracked
- Session management: Timeout + refresh token

---

## 📚 For More Details

- **Advanced Gate Pass**: See `/docs/ADVANCED_GATE_PASS.md`
- **API Reference**: See `/docs/API_REFERENCE.md`
- **Performance Optimization**: See `/docs/SCALABILITY.md`
- **Troubleshooting**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

[← Back to README](./README.md)
