# Update Gate Pass - Waktu Keluar dan Kembali Otomatis

## 📋 Ringkasan Perubahan

Pembaruan ini mengimplementasikan fitur otomatis pengisian dan tampilan **Waktu Keluar (Waktu Keluar Aktual)** dan **Waktu Kembali (Waktu Kembali Aktual)** saat scanning di Pos Jaga.

## 🎯 Fitur yang Ditambahkan

### 1. **Otomatis Capture Waktu Scanning** ✓
- Sistem backend sudah otomatis mengupdate `actual_keluar` saat scan keluar (status approved → checked_in)
- Sistem backend sudah otomatis mengupdate `actual_kembali` saat scan kembali (status checked_in → completed)
- Waktu capture dilakukan server-side dengan `NOW()` untuk akurasi maksimal

### 2. **Auto-Adjust Return Time on Checkout** ✓ NEW
- Saat prajurit scan keluar dengan delay, waktu kembali **rencana** otomatis di-adjust
- **Contoh**: 
  - Rencana: 14:00 - 18:00 (durasi 4 jam)
  - Actual checkout: 14:10 (delay 10 menit)
  - Hasil: Waktu kembali rencana auto-adjust ke 18:10
- **Manfaat**: Durasi izin tetap konsisten, meskipun ada delay saat keluar
- Implementasi di backend: `scan_gate_pass()` dan `authenticated_scan_pos_jaga()`
- `formatTimeOnly(waktu)` - Format "HH:mm" (contoh: "14:30")
- `formatTimeWithDate(waktu)` - Format "HH:mm (DD Mon)" (contoh: "14:30 (25 Apr)")
- `formatFullDateTime(waktu)` - Format lengkap dengan hari (contoh: "Selasa, 25 April 2026 14:30")
- `formatDateOnly(waktu)` - Hanya tanggal (contoh: "25 April 2026")
- `formatRelativeTime(waktu)` - Waktu relatif (contoh: "24 menit lalu")
- `formatDuration(start, end)` - Durasi antara dua waktu (contoh: "4 jam 30 menit")

### 3. **Enhanced ScanResultCard** (`src/components/guard/ScanResultCard.tsx`)
Menampilkan informasi lengkap после scanning:
- **Status Utama** - Indikator jelas (✓ Sudah Keluar, ✓✓ Sudah Kembali, ⏳ Menunggu Keluar)
- **Waktu Keluar**
  - Rencana: Waktu keluar yang direncanakan
  - Aktual: Waktu capture saat scan dengan badge ✓ success
- **Waktu Kembali**
  - Rencana: Waktu kembali yang direncanakan
  - Aktual: Waktu capture saat scan dengan badge ✓ success
  - Status: "Menunggu scan kembali..." jika belum kembali

### 4. **Enhanced GatePassList** (`src/components/gatepass/GatePassList.tsx`)
Menampilkan riwayat gate pass dengan informasi waktu:
- Kolom Keluar:
  - Rencana: Waktu yang direncanakan
  - Aktual: Waktu capture (jika sudah discan) dengan ✓ icon
- Kolom Kembali:
  - Rencana: Waktu yang direncanakan
  - Aktual: Waktu capture (jika sudah discan) dengan ✓ icon

### 5. **Updated Tests** (`src/tests/components/guard/ScanResultCard.test.tsx`)
- Test case untuk status `checked_in` (sudah keluar)
- Test case untuk status `approved` (siap keluar)
- Test case untuk status `completed` (sudah kembali)
- Verification waktu rencana dan aktual ditampilkan dengan benar

## 🔄 Alur Penggunaan

### Skenario 1: Prajurit Keluar
1. Prajurit sudah membuat gate pass dengan waktu rencana (misal: 14:30 - 17:30)
2. Gate pass di-approve oleh komandan (status → 'approved')
3. Di Pos Jaga, prajurit scan QR gate pass
4. Sistem otomatis:
   - Set `actual_keluar = NOW()` (misal: 14:35)
   - **Auto-adjust `waktu_kembali` rencana** (17:30 → 17:35, +5 menit)
     - Ini memastikan durasi izin tetap 3 jam meski ada delay keluar
   - Update status → 'checked_in'
   - Display di ScanResultCard menunjukkan:
     - Rencana: 14:30
     - Aktual: 14:35 ✓
     - Waktu kembali rencana sudah otomatis adjusted → 17:35

### Skenario 2: Prajurit Kembali
1. Prajurit scan QR lagi di Pos Jaga saat kembali
2. Sistem otomatis:
   - Set `actual_kembali = NOW()` (misal: 17:25)
   - Update status → 'completed'
   - Display di ScanResultCard menunjukkan:
     - Waktu Kembali:
       - Rencana: 17:35 (sudah di-adjust)
       - Aktual: 17:25 ✓ (lebih cepat dari rencana)

## 📊 Data yang Disimpan

### Database Fields
```typescript
interface GatePass {
  waktu_keluar: string;        // Waktu rencana keluar (input user saat buat)
  waktu_kembali: string;       // Waktu rencana kembali (input user saat buat)
  actual_keluar?: string;      // Waktu AKTUAL keluar (captured saat scan)
  actual_kembali?: string;     // Waktu AKTUAL kembali (captured saat scan)
  status: GatePassStatus;      // approved → checked_in → completed
}
```

## 🛠️ File yang Dimodifikasi

| File | Perubahan |
|------|-----------|
| `src/utils/timeFormatter.ts` | ✨ NEW - Utility untuk format waktu |
| `src/components/guard/ScanResultCard.tsx` | 🔄 Enhanced - Tampilkan waktu rencana & aktual |
| `src/components/gatepass/GatePassList.tsx` | 🔄 Enhanced - Tampilkan waktu dengan icon ✓ |
| `src/tests/components/guard/ScanResultCard.test.tsx` | 🔄 Updated - Test cases sesuai UI baru |

## 🎨 Visual Changes

### Guard Dashboard - Scan Result
```
┌─────────────────────────────────────┐
│  Nama: Prajurit A                   │
│  NRP: 12345                         │
│                                     │
│  ✓ Sudah Keluar                     │
│                                     │
│  🕐 Waktu Keluar                    │
│    Rencana: 14:30 (25 Apr)          │
│    Aktual:  14:35 (25 Apr) ✓        │
│                                     │
│  🕐 Waktu Kembali                   │
│    Rencana: 17:30 (25 Apr)          │
│    Aktual:  17:25 (25 Apr) ✓        │
│                                     │
│  Scan kembali untuk masuk           │
└─────────────────────────────────────┘
```

### Gate Pass List - Row Item
```
Tujuan: Bandung        [APPROVED]
Keperluan: Rapat Penting

🕐 Keluar: 14:30 ✓ 14:35
🕐 Kembali: 17:30 ✓ 17:25
```

## ✅ Checklist Implementasi

- [x] Create utility formatter time (`timeFormatter.ts`)
- [x] Update `ScanResultCard` untuk tampilkan actual times
- [x] Update `GatePassList` untuk tampilkan actual times pada list
- [x] Update test cases sesuai UI baru
- [x] Verify tidak ada compilation errors
- [x] Dokumentasi lengkap

## 🚀 Testing

### Manual Testing
1. Buka `/guard` untuk Guard Dashboard
2. Scan QR gate pass (approved status)
3. Verifikasi `ScanResultCard` menampilkan:
   - Rencana: waktu_keluar
   - Aktual: actual_keluar (captured saat scan)
4. Verify untuk kembali juga sama

### Automated Testing
```bash
npm test -- src/tests/components/guard/ScanResultCard.test.tsx
npm test -- src/tests/components/gatepass/GatePassList.test.tsx
```

## 💾 Backend Implementation (Already Done)

Database migration sudah implemented di:
- `supabase/migrations/20260418222000_harden_scan_rpcs_and_combined_auth_scan.sql` - Initial scan logic
- `supabase/migrations/20260423113000_auto_adjust_return_time_on_checkout.sql` - NEW: Auto-adjust return time

Fungsi RPC:
- `scan_gate_pass()` - Capture actual_keluar + auto-adjust waktu_kembali
- `authenticated_scan_pos_jaga()` - Scan dengan NRP+PIN + auto-adjust waktu_kembali

Both functions:
- Saat checkout: Set `actual_keluar = NOW()` dan auto-adjust `waktu_kembali` jika ada delay
- Saat check-in: Set `actual_kembali = NOW()`

Logic auto-adjust:
```sql
-- Hitung delay antara rencana dan actual
delay_ms := EXTRACT(EPOCH FROM (NOW() - waktu_keluar)) * 1000

-- Jika ada delay positif, adjust return time
IF delay_ms > 0 THEN
  new_waktu_kembali := waktu_kembali + (delay_ms minutes)
END IF
```

## 📝 Notes

- Waktu capture menggunakan server timezone untuk konsistensi
- Display format menggunakan locale Indonesia (id-ID)
- Utility formatter dapat digunakan di komponen lain yang perlu tampilkan waktu
- Actual times dan rencana times ditampilkan bersebelahan untuk perbandingan mudah
