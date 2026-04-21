# Gate Pass Auto-Approval Implementation Checklist

## Pre-Deployment Checklist

### ✅ Backend Setup
- [ ] Review migration file: `supabase/migrations/20260421140000_enhance_gatepass_validation_autoapproval.sql`
- [ ] Run migration on Supabase:
  ```bash
  supabase migration up
  # or push to Supabase dashboard
  ```
- [ ] Verify tables created:
  ```sql
  SELECT * FROM gate_pass_approval_log LIMIT 1;
  SELECT * FROM gate_pass LIMIT 1; -- Check new columns
  ```
- [ ] Verify RPC functions exist:
  ```sql
  SELECT routines.routine_name
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name LIKE 'api_%gate_pass%';
  ```

### ✅ Frontend Dependencies
- [ ] Validate `lucide-react` for icons (already in project)
- [ ] Ensure TypeScript types are updated
- [ ] Test compiled without errors: `npm run build`

### ✅ Database Validation
```bash
# Check indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'gate_pass_approval_log';

# Check constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'gate_pass';

# Check RLS policies
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE tablename = 'gate_pass';
```

### ✅ Testing
- [ ] Run unit tests: `npm run test:unit src/tests/gatePassValidation.test.ts`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Manual test in development:
  ```bash
  npm run dev
  # Login as prajurit with 3+ previous approvals
  # Try creating gate pass during working hours, known destination, ≤24h
  # Verify auto-approval
  ```

### ✅ Security Review
- [ ] Verify SECURITY DEFINER on all RPC functions
- [ ] Check authorization checks in api_insert_gate_pass
- [ ] Verify RLS policies on gate_pass table
- [ ] Test cross-satuan access restrictions (komandan)
- [ ] Verify guard-only scan access

## Deployment Steps

### Step 1: Database Migration
```bash
cd /workspaces/v

# Check migration status
supabase migration list

# Apply migration
supabase migration up

# Or if using direct SQL
psql -h <host> -U <user> -d <db> -f supabase/migrations/20260421140000_enhance_gatepass_validation_autoapproval.sql
```

### Step 2: Frontend Build
```bash
npm install
npm run build

# Verify no errors
npm run lint
npm run type-check
```

### Step 3: Update API Client
Verify these files are up-to-date:
- [ ] `src/lib/api/gatepass.ts` - New response types
- [ ] `src/lib/validation/gatePassValidation.ts` - Validation functions
- [ ] `src/components/gatepass/GatePassForm.tsx` - Enhanced form
- [ ] `src/store/gatePassStore.ts` - Updated return types

### Step 4: Test in Staging
```bash
npm run test:e2e

# Specific gate pass tests
npm run test:e2e -- e2e/gatepass*.spec.ts
```

### Step 5: Deploy
```bash
npm run deploy
# or
npm run build && npm run prod
```

## Post-Deployment Validation

### ✅ Health Checks
1. **Form Submission**
   - [ ] Login as prajurit
   - [ ] Navigate to Gate Pass menu
   - [ ] Create gate pass (working hours, known destination)
   - [ ] Verify auto-approval appears (green banner with ✓)

2. **Komandan Approval**
   - [ ] Login as komandan
   - [ ] Create gate pass
   - [ ] Verify auto-approved status immediately

3. **Guard Scanning**
   - [ ] Login as guard
   - [ ] Navigate to Pos Jaga scanner
   - [ ] Scan QR from approved gate pass
   - [ ] Verify status transitions: approved → checked_in

4. **Admin Monitoring**
   - [ ] Login as admin
   - [ ] Check gate pass monitor dashboard
   - [ ] Verify approval stats showing auto-approved count

### ✅ Error Handling
Test error scenarios:
- [ ] Invalid field lengths (too short/long)
- [ ] Past departure time
- [ ] Duration > 7 days
- [ ] Invalid QR token format
- [ ] Cross-satuan approval rejection
- [ ] Invalid status transitions

### ✅ Performance
- [ ] Form validation completes in <100ms
- [ ] Gate pass creation <500ms
- [ ] Approval stats query <1s
- [ ] Query indexes are being used

## Rollback Plan

If issues occur, rollback is simple:

### Option 1: Database Level
```sql
-- Revert approval logic to previous version
CREATE OR REPLACE FUNCTION public.api_insert_gate_pass(...)
RETURNS VOID ... -- Old version

-- Drop new columns if needed
ALTER TABLE gate_pass DROP COLUMN IF EXISTS approval_reason;
ALTER TABLE gate_pass DROP COLUMN IF EXISTS auto_approved;

-- Drop new table
DROP TABLE IF EXISTS gate_pass_approval_log;
```

### Option 2: Code Level
```bash
# Revert to previous commit if issues with frontend
git revert <commit_hash>

# Or selective revert of specific files
git checkout main -- src/components/gatepass/GatePassForm.tsx
```

### Option 3: Feature Flag (Recommended)
```typescript
// In your config
const FEATURES = {
  GATE_PASS_AUTO_APPROVAL: false // Disable if issues detected
}

// Then conditionally use old or new logic
if (FEATURES.GATE_PASS_AUTO_APPROVAL) {
  // Use new validation
} else {
  // Use old logic
}
```

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Approval Rate**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE auto_approved = TRUE) as auto_approved,
     COUNT(*) FILTER (WHERE status = 'pending') as still_pending,
     COUNT(*) FILTER (WHERE status = 'rejected') as rejected
   FROM gate_pass
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Validation Errors**
   - Track validation failures in logs
   - Alert if failure rate > 10%

3. **Processing Time**
   - Monitor RPC execution time
   - Alert if > 1 second

4. **Auto-Approval Success Rate**
   ```sql
   SELECT 
     role,
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE auto_approved = TRUE) as auto,
     ROUND(100.0 * COUNT(*) FILTER (WHERE auto_approved = TRUE) / COUNT(*), 2) as pct
   FROM gate_pass gp
   JOIN users u ON u.id = gp.user_id
   WHERE gp.created_at > NOW() - INTERVAL '7 days'
   GROUP BY role;
   ```

### Logs to Check
```bash
# Supabase function logs
supabase functions list
supabase functions logs api_insert_gate_pass

# Edge function errors
tail -f ~/.supabase/edge-logs.txt

# Application errors
cat logs/application.log | grep "gate_pass"
```

## Documentation Updates

- [x] Create `GATE_PASS_VALIDATION_GUIDE.md` - Comprehensive guide
- [x] Create test file with all test cases
- [x] Update this checklist
- [ ] Update README with feature list
- [ ] Update API documentation
- [ ] Create user guide for prajurit

## Feature Flags (Optional)

```typescript
// Enable/disable auto-approval feature
POST /api/admin/feature-flags
{
  "feature": "gate_pass_auto_approval",
  "enabled": true
}

// Or in environment variables
VITE_GATE_PASS_AUTO_APPROVAL=true
```

## Data Migration (If Needed)

If migrating from old gate pass system:

```sql
-- Backfill auto_approved flag based on role
UPDATE gate_pass gp
SET auto_approved = CASE
  WHEN u.role = 'komandan' AND gp.status = 'approved' THEN TRUE
  WHEN u.role = 'admin' AND gp.status = 'approved' THEN TRUE
  ELSE FALSE
END
FROM users u
WHERE gp.user_id = u.id
AND gp.created_at < NOW() - INTERVAL '1 day';

-- Create missing approval logs
INSERT INTO gate_pass_approval_log (
  gate_pass_id, approver_id, approval_status, is_auto, created_at
)
SELECT id, approved_by, status, auto_approved, updated_at
FROM gate_pass
WHERE approved_by IS NOT NULL
ON CONFLICT DO NOTHING;
```

## Performance Optimization

If experiencing slow queries:

```sql
-- Add indexes if not present
CREATE INDEX idx_gate_pass_user_created ON gate_pass(user_id, created_at DESC);
CREATE INDEX idx_gate_pass_approval_log_created ON gate_pass_approval_log(created_at DESC);
CREATE INDEX idx_gate_pass_approval_log_auto ON gate_pass_approval_log(is_auto);

-- Analyze query plans
EXPLAIN ANALYZE
SELECT * FROM gate_pass WHERE status = 'pending' AND created_at > NOW() - INTERVAL '7 days';
```

## Team Communication

### Announcement Template
```
🚀 Gate Pass Auto-Approval System Deployed

New Features:
✅ Intelligent auto-approval for eligible submissions
✅ Real-time validation with helpful error messages
✅ Approval audit trail and statistics
✅ Enhanced security with strict status transitions

Who benefits:
- Prajurit: Faster approvals for routine leaves (3+ history, known destination)
- Komandan: Automatic approval for personal leaves
- Guard: Clearer status validation when scanning
- Admin: Better monitoring and audit trails

How it works:
Prajurit gate pass auto-approved if ALL criteria met:
• ≥ 3 previous approvals
• Same destination (visited before)
• ≤ 24 hour duration
• Working hours (Mon-Fri, 7AM-6PM)

Komandan & Admin: Always auto-approved

Questions? See GATE_PASS_VALIDATION_GUIDE.md
```

## Success Criteria

- [ ] ≥ 30% of prajurit submissions auto-approved (first week)
- [ ] 0 validation errors in first 48 hours
- [ ] 100% komandan submissions auto-approved
- [ ] All scan operations successful
- [ ] User feedback positive (>4/5 rating)
- [ ] No security incidents

## Next Steps

1. Schedule deployment window (avoid peak hours)
2. Notify stakeholders 24 hours before
3. Run full test suite
4. Monitor closely first 24 hours
5. Gather user feedback
6. Plan Phase 2 improvements
