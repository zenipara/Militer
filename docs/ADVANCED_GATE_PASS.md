# 🚪 Advanced Gate Pass System

Comprehensive deep-dive into Gate Pass architecture, validation, auto-approval, QR scanning, dan workflows.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Auto-Approval System](#auto-approval-system)
3. [Validation Layer](#validation-layer)
4. [QR Code Implementation](#qr-code-implementation)
5. [Status Transitions](#status-transitions)
6. [Troubleshooting](#troubleshooting)

---

## System Architecture

### High-Level Flow

```
┌──────────────────┐
│   PRAJURIT       │
│ Submit Gate Pass │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Frontend Validation            │
│  • Keperluan (5-255 chars)      │
│  • Tujuan (3-255 chars)         │
│  • Waktu Keluar (future date)   │
│  • Waktu Kembali (> keluar)     │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Backend RPC: api_insert_gate_pass│
│  • Validate business logic        │
│  • Check auto-approval criteria   │
│  • Insert record                  │
│  • Return: auto_approved flag     │
└────────┬──────────────────────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
 AUTO-      PENDING
 APPROVED   (Wait)
    │          │
    │          ▼
    │     ┌──────────────┐
    │     │  KOMANDAN    │
    │     │  Approval    │
    │     └──────┬───────┘
    │            │
    └─────┬──────┘
         │
         ▼
    ┌─────────────────┐
    │    APPROVED     │
    └────────┬────────┘
             │
    ┌────────▼──────────┐
    │ Personel ke POS   │
    │ Guard scan QR     │
    └────────┬──────────┘
             │
             ▼
    ┌──────────────────┐
    │  CHECKED_IN      │
    │  (Keluar)        │
    └────────┬─────────┘
             │
    ┌────────▼──────────┐
    │ Personel kembali  │
    │ Guard scan QR lagi│
    └────────┬──────────┘
             │
             ▼
    ┌──────────────────┐
    │   COMPLETED      │
    │  (Kembali)       │
    └──────────────────┘
```

---

## Auto-Approval System

### Approval Criteria

**For ADMIN & KOMANDAN**: ✅ ALWAYS auto-approved

**For PRAJURIT**: Auto-approved IF ALL criteria met:

| Criteria | Value | Reason |
|----------|-------|--------|
| **Previous Approvals** | ≥ 3 | Good track record |
| **Destination** | Known/Repeated | Reduced risk |
| **Duration** | ≤ 24 hours | Short, manageable |
| **Timing** | Working hours, Mon-Fri | Normal operations |

### Implementation

**File**: `supabase/migrations/20260421140000_enhance_gatepass_validation_autoapproval.sql`

```sql
-- Function: Determine if gate pass should auto-approve
CREATE OR REPLACE FUNCTION should_auto_approve_gate_pass(
  p_user_id uuid,
  p_keperluan text,
  p_tujuan text,
  p_waktu_keluar timestamp,
  p_waktu_kembali timestamp
) RETURNS jsonb AS $$
DECLARE
  v_user_role user_role;
  v_approval_history int;
  v_known_destination bool;
  v_duration_hours int;
  v_day_of_week int;
  v_hour_of_day int;
  v_should_approve bool := false;
  v_reason text := '';
BEGIN
  -- 1. Get user role
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;
  
  -- 2. Admin/Komandan always approved
  IF v_user_role IN ('admin', 'komandan') THEN
    RETURN jsonb_build_object(
      'should_approve', true,
      'reason', 'Role: ' || v_user_role,
      'criteria', jsonb_build_object(
        'role_privilege', true,
        'approval_history', NULL,
        'known_destination', NULL,
        'duration_check', NULL,
        'timing_check', NULL
      )
    );
  END IF;
  
  -- 3. For Prajurit: Check all criteria
  
  -- 3.1 Approval History (≥ 3 approved)
  SELECT COUNT(*) INTO v_approval_history
  FROM gate_passes
  WHERE user_id = p_user_id
    AND status = 'approved'
    AND created_at > NOW() - INTERVAL '90 days';
  
  IF v_approval_history >= 3 THEN
    v_reason := v_reason || 'Good history (' || v_approval_history || ' approvals). ';
  END IF;
  
  -- 3.2 Known Destination (visited before)
  SELECT EXISTS(
    SELECT 1 FROM gate_passes
    WHERE user_id = p_user_id
      AND LOWER(tujuan) = LOWER(p_tujuan)
      AND status = 'approved'
      AND created_at > NOW() - INTERVAL '6 months'
  ) INTO v_known_destination;
  
  IF v_known_destination THEN
    v_reason := v_reason || 'Known destination. ';
  END IF;
  
  -- 3.3 Duration (≤ 24 hours)
  v_duration_hours := EXTRACT(EPOCH FROM (p_waktu_kembali - p_waktu_keluar)) / 3600;
  
  IF v_duration_hours <= 24 THEN
    v_reason := v_reason || 'Duration OK (' || v_duration_hours || 'h). ';
  END IF;
  
  -- 3.4 Timing (Working hours, Mon-Fri)
  v_day_of_week := EXTRACT(DOW FROM p_waktu_keluar); -- 0=Sunday, 1=Monday, ..., 6=Saturday
  v_hour_of_day := EXTRACT(HOUR FROM p_waktu_keluar);
  
  IF v_day_of_week BETWEEN 1 AND 5
     AND v_hour_of_day BETWEEN 7 AND 18 THEN
    v_reason := v_reason || 'Working hours. ';
  END IF;
  
  -- 4. Final approval decision (ALL must be true)
  v_should_approve := (v_approval_history >= 3)
    AND v_known_destination
    AND (v_duration_hours <= 24)
    AND (v_day_of_week BETWEEN 1 AND 5)
    AND (v_hour_of_day BETWEEN 7 AND 18);
  
  RETURN jsonb_build_object(
    'should_approve', v_should_approve,
    'reason', CASE WHEN v_should_approve THEN v_reason ELSE 'Requirements not met' END,
    'criteria', jsonb_build_object(
      'approval_history', v_approval_history >= 3,
      'known_destination', v_known_destination,
      'duration_check', v_duration_hours <= 24,
      'timing_check', v_day_of_week BETWEEN 1 AND 5 AND v_hour_of_day BETWEEN 7 AND 18
    )
  );
END;
$$ LANGUAGE plpgsql;
```

### Example Scenarios

#### Scenario 1: Auto-Approved ✅

```
Prajurit: Rifka (5 approvals sebelumnya)
Tujuan: Bandung (visited 3x before)
Waktu: Kamis 10:00 - 16:00 (6 jam)
Result: ✅ AUTO-APPROVED
Reason: Good history + known destination + short duration + working hours
```

#### Scenario 2: Pending Approval ⏳

```
Prajurit: Budi (1 approval only)
Tujuan: Jakarta (first time)
Waktu: Jumat 10:00 - Minggu 20:00 (58 jam)
Result: ⏳ PENDING
Reason: Insufficient history + new destination + long duration
```

#### Scenario 3: Rejected (Outside Hours) ❌

```
Prajurit: Andi (5 approvals)
Tujuan: Surabaya (visited before)
Waktu: Sabtu 22:00 - Minggu 10:00 (weekend)
Result: ⏳ PENDING
Reason: Weekend/outside working hours
```

---

## Validation Layer

### Frontend Validation (`src/lib/validation/gatePassValidation.ts`)

```typescript
export interface GatePassValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export function validateGatePassForm(payload: GatePassFormData): GatePassValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  
  // 1. Keperluan validation
  const keperluanError = validateKeperluan(payload.keperluan);
  if (keperluanError) errors['keperluan'] = keperluanError;
  
  // 2. Tujuan validation
  const tujuanError = validateTujuan(payload.tujuan);
  if (tujuanError) errors['tujuan'] = tujuanError;
  
  // 3. Waktu Keluar validation
  const keluarError = validateWaktuKeluar(payload.waktuKeluar);
  if (keluarError) errors['waktuKeluar'] = keluarError;
  
  // 4. Waktu Kembali validation
  const kembaliError = validateWaktuKembali(payload.waktuKeluar, payload.waktuKembali);
  if (kembaliError) errors['waktuKembali'] = kembaliError;
  
  // 5. QR Token validation
  if (payload.qrToken) {
    const qrError = validateQrToken(payload.qrToken);
    if (qrError) warnings['qrToken'] = qrError;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}
```

### Individual Field Validation

| Field | Rules |
|-------|-------|
| **Keperluan** | 5-255 chars, alphanumeric + spaces |
| **Tujuan** | 3-255 chars, alphanumeric + spaces |
| **Waktu Keluar** | Future ≤ 30 days, ISO 8601 format |
| **Waktu Kembali** | > Waktu Keluar, ≤ 7 days duration |
| **QR Token** | 64 hex chars (32 bytes), auto-generated |

---

## QR Code Implementation

### QR Generation

**File**: `src/components/gatepass/GatePassQRCode.tsx`

```typescript
import QRCode from 'qrcode.react';

export function GatePassQRCode({ gatePassId, qrToken }: Props) {
  // Dynamic import to reduce bundle
  const qrValue = `gatepass://${gatePassId}/${qrToken}`;
  
  return (
    <QRCode
      value={qrValue}
      size={256}
      level="H"
      includeMargin={true}
      renderAs="canvas"
    />
  );
}
```

### QR Scanning

**File**: `src/components/gatepass/GatePassScanner.tsx`

```typescript
import { Html5QrcodeScanner } from 'html5-qrcode';

export function GatePassScanner({ onScanSuccess }: Props) {
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  
  useEffect(() => {
    // Lazy load scanner library
    const qrScanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    });
    
    const onScanSuccess = (decodedText: string) => {
      // Parse: gatepass://ID/TOKEN
      const match = decodedText.match(/gatepass:\/\/([^/]+)\/(.+)/);
      if (match) {
        const [_, gatePassId, qrToken] = match;
        
        // Call backend to validate
        validateGatePassQR(gatePassId, qrToken)
          .then(result => {
            if (result.valid) {
              onScanSuccess(result);
              qrScanner.clear();
            } else {
              showError('Invalid QR Code');
            }
          });
      }
    };
    
    qrScanner.render(onScanSuccess, onScanFailure);
    setScanner(qrScanner);
    
    return () => {
      qrScanner.clear().catch(() => {});
    };
  }, []);
}
```

---

## Status Transitions

### State Machine

```
CREATE → PENDING or APPROVED (auto-decision)
    ↓
PENDING → APPROVED (manual by komandan)
PENDING → REJECTED (manual denial)
    ↓
APPROVED → CHECKED_IN (guard scan: keluar)
    ↓
CHECKED_IN → COMPLETED (guard scan: kembali)
    ↓
[OVERDUE if current_time > waktu_kembali]
```

### Valid Transitions

```sql
-- Validate state transitions
CREATE OR REPLACE FUNCTION validate_status_transition(
  p_current_status gate_pass_status,
  p_new_status gate_pass_status
) RETURNS boolean AS $$
BEGIN
  CASE p_current_status
    WHEN 'pending' THEN
      RETURN p_new_status IN ('approved', 'rejected');
    WHEN 'approved' THEN
      RETURN p_new_status IN ('checked_in', 'cancelled');
    WHEN 'checked_in' THEN
      RETURN p_new_status IN ('completed', 'cancelled', 'overdue');
    WHEN 'completed' THEN
      RETURN FALSE; -- Terminal state
    WHEN 'rejected' THEN
      RETURN FALSE; -- Terminal state
    WHEN 'cancelled' THEN
      RETURN FALSE; -- Terminal state
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;
```

---

## Overdue Detection

### Automatic Overdue Flagging

```sql
-- Scheduled job to mark overdue
SELECT cron.schedule('check_overdue_gate_passes', '*/5 * * * *',
$$
UPDATE gate_passes
SET status = 'overdue'
WHERE status = 'checked_in'
  AND waktu_kembali < NOW()
  AND updated_at < NOW() - INTERVAL '5 minutes';
$$
);
```

### Overdue Alerts

```typescript
// Frontend monitors for overdue status
useEffect(() => {
  const unsubscribe = gatePassStore.subscribeToChanges((update) => {
    if (update.status === 'overdue') {
      notificationService.alert({
        title: 'Gate Pass Overdue',
        message: `${update.personelName} tidak kembali tepat waktu`,
        severity: 'critical',
      });
      
      // Escalate to komandan
      sendNotificationToKomandan(update);
    }
  });
  
  return unsubscribe;
}, []);
```

---

## Troubleshooting

### Issue: Auto-Approval tidak jalan

**Solution**:
```bash
# Verify migration applied
supabase db status | grep "gatepass"

# Test function directly
supabase db execute --sql "
SELECT should_auto_approve_gate_pass(
  'user-id'::uuid,
  'Rapat penting',
  'Jakarta',
  NOW(),
  NOW() + INTERVAL '4 hours'
);
"
```

### Issue: QR Scan tidak tercatat

**Solution**:
```bash
# Verify RPC function
supabase db execute --sql "
SELECT SOURCE FROM pg_proc 
WHERE proname = 'api_update_gate_pass_status';
"

# Test directly
supabase db execute --sql "
SELECT api_update_gate_pass_status(
  'gate-pass-id'::uuid,
  'checked_in',
  NOW()
);
"
```

### Issue: Status stuck di Pending

**Solution**:
```bash
# Check RLS policy
SELECT * FROM pg_policies 
WHERE tablename = 'gate_passes' 
AND polname LIKE '%pending%';

# Manually approve if needed
UPDATE gate_passes 
SET status = 'approved', auto_approved = false
WHERE id = 'gate-pass-id'::uuid;
```

---

## References

- Related: [FEATURES.md](../FEATURES.md#5-gate-pass---keluar-masuk)
- Related: [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
- Deployment: [DEPLOYMENT.md](../DEPLOYMENT.md#5-migrasi-database)

---

**Last Updated**: April 28, 2026
