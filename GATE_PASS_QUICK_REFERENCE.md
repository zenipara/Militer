# Gate Pass Implementation - Quick Reference

## 🎯 What Was Implemented

### 1. Validation Layer (`src/lib/validation/gatePassValidation.ts`)
Comprehensive validation functions for form fields:

```typescript
// Single field validation
validateKeperluan(value)      // 5-255 chars
validateTujuan(value)         // 3-255 chars
validateWaktuKeluar(value)    // future, <= 30 days
validateWaktuKembali(value)   // > keluar, <= 7 days
validateQrToken(value)        // 64 hex chars

// Form validation
validateGatePassForm(payload) // returns { isValid, errors, warnings }

// Auto-approval checking
canAutoApprove(criteria)      // checks if auto-approvable

// Status transitions
validateStatusTransition(from, to) // validates flow
```

### 2. Enhanced Form (`src/components/gatepass/GatePassForm.tsx`)
- Real-time field validation as user types
- Accumulates all errors before submit
- Shows warnings for edge cases
- Displays auto-approval status with visual feedback
- Better UX with disabled submit if invalid

### 3. Backend Auto-Approval
Migration: `supabase/migrations/20260421140000_*`

**Function:** `should_auto_approve_gate_pass(user_id, keperluan, tujuan, waktu_keluar, waktu_kembali)`
- Returns: `{ should_approve, reason, criteria }`
- Checks: role, history, destination, duration, hours

**Enhanced RPCs:**
- `api_insert_gate_pass()` - Now returns approval response
- `api_update_gate_pass_status()` - Enhanced status validation
- `api_get_approval_stats()` - User approval history

### 4. API Updates (`src/lib/api/gatepass.ts`)
New response types:
- `InsertGatePassResponse` - Contains `auto_approved` flag
- `UpdateGatePassStatusResponse` - Status change confirmatio
- `ApprovalStats` - User statistics

### 5. Store Updates (`src/store/gatePassStore.ts`)
- `createGatePass()` now returns `InsertGatePassResponse`
- Can check `result.auto_approved` to show success banner

## 🚀 Quick Start

### For Developers

#### Test Validation Functions
```typescript
import { validateGatePassForm } from '@/lib/validation/gatePassValidation'

const result = validateGatePassForm({
  keperluan: 'Menghadiri rapat',
  tujuan: 'Bandung',
  waktu_keluar: '2026-04-21T10:00',
  waktu_kembali: '2026-04-21T17:00',
})

if (result.isValid) {
  console.log('✅ Valid')
  console.log('⚠️ Warnings:', result.warnings)
} else {
  console.log('❌ Errors:', result.errors)
}
```

#### Use in Components
```tsx
import GatePassForm from '@/components/gatepass/GatePassForm'

export default function Page() {
  return <GatePassForm />
}

// Form automatically handles:
// - Real-time validation
// - Error display
// - Auto-approval feedback
// - Submission
```

#### Check Auto-Approval in Store
```typescript
const createGatePass = useGatePassStore(s => s.createGatePass)

const result = await createGatePass({
  keperluan: 'Rapat',
  tujuan: 'Bandung',
  waktu_keluar: datetime1,
  waktu_kembali: datetime2,
})

if (result?.auto_approved) {
  showNotification('✅ Auto-Approved!', 'success')
} else {
  showNotification('⏳ Waiting for approval', 'info')
}
```

### For QA/Testers

#### Test Auto-Approval Scenarios

**Scenario 1: Komandan Auto-Approved**
1. Login as komandan
2. Go to Gate Pass menu
3. Create gate pass (any time, any destination)
4. ✅ Should show "AUTO-APPROVED" banner

**Scenario 2: Prajurit Auto-Approved**
1. Login as prajurit (must have 3+ previous approvals)
2. Go to Gate Pass menu
3. Create gate pass:
   - Time: 10:00-17:00 (same day)
   - Day: Monday-Friday (working hours)
   - Destination: Known destination (visited before)
4. ✅ Should show "AUTO-APPROVED" banner

**Scenario 3: Prajurit Pending**
1. Login as prajurit (new soldier, <3 approvals)
2. Create gate pass:
   - Any time, any destination
3. ⏳ Should show "PENDING" - awaiting komandan approval

**Scenario 4: Validation Error**
1. Create gate pass with invalid data:
   - Keperluan: "abc" (too short)
   - Tujuan: "" (empty)
   - Waktu Keluar: past date
   - Waktu Kembali: before keluar time
2. ❌ Form should disable submit button
3. Red error badges on invalid fields

#### Test Scanning

**Valid Status Transitions:**
1. approved → checked_in (scan out at post)
2. checked_in → completed (scan in at post)

**Invalid Transitions:**
1. pending → checked_in (should reject, still waiting)
2. completed → checked_in (should reject, final state)

### For Deployment

1. **Run migration**
   ```bash
   supabase migration up
   ```

2. **Build & test**
   ```bash
   npm run build
   npm run test:unit src/tests/gatePassValidation.test.ts
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

4. **Verify**
   - Login as prajurit with 3+ approvals
   - Create gate pass during working hours, known destination
   - Should auto-approve

## 📊 Auto-Approval Decision Tree

```
User submits Gate Pass
    ↓
┌─────────────────────────────────┐
│ Is user KOMANDAN or ADMIN?      │
├─────────────────────────────────┤
│ YES: ✅ AUTO-APPROVED           │
│ NO:  Continue...                │
└─────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ ALL criteria met?                              │
├───────────────────────────────────────────────┤
│ 1. ≥ 3 previous approvals                    │
│ 2. Same destination (visited before)         │
│ 3. Duration ≤ 24 hours                       │
│ 4. Mon-Fri, 7AM-6PM (working hours)          │
├───────────────────────────────────────────────┤
│ ALL YES: ✅ AUTO-APPROVED                    │
│ ANY NO:  ⏳ PENDING                           │
└───────────────────────────────────────────────┘
```

## 📁 File Structure

```
src/
├── lib/
│   ├── validation/
│   │   └── gatePassValidation.ts      ← New: All validation functions
│   └── api/
│       └── gatepass.ts                ← Updated: New response types
├── components/
│   └── gatepass/
│       └── GatePassForm.tsx           ← Updated: Real-time validation, etc
├── store/
│   └── gatePassStore.ts               ← Updated: Handle approval responses
└── tests/
    └── gatePassValidation.test.ts     ← New: Comprehensive test suite

supabase/
└── migrations/
    └── 20260421140000_*.sql           ← New: Backend auto-approval logic

Documentation/
├── GATE_PASS_VALIDATION_GUIDE.md       ← New: Full guide
├── GATE_PASS_DEPLOYMENT_CHECKLIST.md   ← New: Deployment steps
└── GATE_PASS_QUICK_REFERENCE.md        ← This file
```

## 🔍 Debugging Tips

### Issue: Auto-approval not working
```typescript
// Check approval criteria logging
console.log(criteria_met) // From gate_pass_approval_log table

// Query to check actual approval decision
SELECT 
  id, user_id, status, auto_approved, approval_reason, created_at
FROM gate_pass
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### Issue: Validation errors not showing
```typescript
// Ensure validateGatePassForm returns errors array
const result = validateGatePassForm(payload)
console.log('Validation errors:', result.errors)
console.log('Form valid?', result.isValid)
```

### Issue: Status transition rejected
```sql
-- Check current status and try valid transition
SELECT status FROM gate_pass WHERE id = ?;

-- Query valid transitions
SELECT * FROM pg_get_function_arguments('api_update_gate_pass_status'::regprocedure)
```

### Issue: Permission denied on scan
```typescript
// Verify user role
const user = useAuthStore(s => s.user)
console.log('User role:', user?.role)

// Guard can only scan at post
// Admin & Guard can scan
// Prajurit cannot scan (must give to Guard)
```

## 📚 Related Files

- **Gate Pass Schema**: `supabase/migrations/005_gate_pass_schema.sql`
- **Gate Pass RLS**: `supabase/migrations/006_gate_pass_rls.sql`
- **Gate Pass Scanner**: `src/components/gatepass/GatePassScanner.tsx`
- **Gate Pass List**: `src/components/gatepass/GatePassList.tsx`
- **Types**: `src/types/index.ts` (GatePass, GatePassStatus)

## ❓ FAQ

**Q: Why does auto-approval require 3 previous approvals?**
A: Establishes trust history. New soldiers need manual review.

**Q: Can admin override auto-approval?**
A: Yes, admin can approve/reject any gate pass at any time.

**Q: What if user has no satuan set?**
A: Satuan checks become lenient (BTRIM to null).

**Q: Can guard create gate passes?**
A: No, only prajurit/komandan/admin can create.

**Q: What about weekend gate passes?**
A: They don't auto-approve, pending manual approval.

## 🎓 Learning Resources

1. **Understand Validation**
   - Read: `src/lib/validation/gatePassValidation.ts`
   - Run: `npm run test:unit` to see examples

2. **Understand Auto-Approval Logic**
   - Read: `supabase/migrations/20260421140000_*.sql`
   - Function: `should_auto_approve_gate_pass()`

3. **See It In Action**
   - Try: Create gate pass in dev environment
   - Watch: Form validation in real-time
   - Check: Auto-approval banner

4. **Full Documentation**
   - See: `GATE_PASS_VALIDATION_GUIDE.md`

---

**Last Updated:** 2026-04-21  
**Status:** ✅ Complete & Ready for Deployment  
**Version:** 1.0.0
