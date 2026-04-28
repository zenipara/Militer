# 🔧 Troubleshooting Guide

Solusi cepat untuk masalah umum saat development, deployment, dan production use.

---

## Development Issues

### "npm install gagal"

**Error**: `npm ERR! code E404`, `npm ERR! 404 Not Found`

**Solusi**:
```bash
# Clear cache npm
npm cache clean --force

# Update npm
npm install -g npm@latest

# Reinstall dependencies
npm install
```

---

### "Localhost port 5173 sudah digunakan"

**Error**: `Port 5173 is in use`

**Solusi**:
```bash
# Cari process yang gunakan port 5173
lsof -ti:5173

# Kill process (contoh PID 12345)
kill -9 12345

# Atau pakai port berbeda
npm run dev -- --port 3000
```

---

### "Cannot find module '@/components/...'"

**Error**: `Cannot find module` saat import

**Solusi**: Verifikasi `tsconfig.json` memiliki path alias:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Lalu restart dev server:
```bash
npm run dev
```

---

### "API seems to be missing" (Supabase tidak terkoneksi)

**Error**: Console shows `Failed to fetch`, requests timeout

**Solusi**:
```bash
# 1. Verifikasi .env.local ada dan benar
cat .env.local | grep SUPABASE

# 2. Verifikasi URLs tidak ada typo
# Format: https://XXXXX.supabase.co (bukan .co.id atau URL lain)

# 3. Cek network connectivity
ping supabase.co

# 4. Jalankan check command
npm run check:supabase

# 5. Buka browser console (F12) dan lihat XHR requests
# Verifikasi request berjalan ke correct endpoint
```

---

### "Types not updating" di VS Code

**Symptom**: TypeScript errors tidak hilang setelah fix code

**Solusi**:
```bash
# Restart TS server di VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Atau manual clear cache & rebuild
rm -rf node_modules/.vite
npm run type-check
```

---

## Deployment Issues

### "Build production gagal"

**Error**: `npm run build` fails with TypeScript errors

**Solusi**:
```bash
# 1. Jalankan type-check terlebih dahulu
npm run type-check

# 2. Fix errors yang ditampilkan

# 3. Coba build lagi
npm run build

# 4. Jika masih gagal, check bundle size
npm run build -- --stats

# 5. Lihat error log lebih detail
npm run build 2>&1 | tee build-error.log
```

---

### "GitHub Actions deploy gagal"

**Error**: Workflow `.github/workflows/deploy-production.yml` fails

**Solusi**:
```bash
# 1. Verifikasi GitHub Secrets sudah diset
Settings → Secrets → Actions
Pastikan ada:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY

# 2. Check workflow logs
GitHub → Actions → Last workflow run → View logs

# 3. Rebuild workflow
GitHub → Actions → "Deploy Production" → "Run workflow" → Branch: main

# 4. Jika masih gagal, test lokal dulu
npm run build
npm run preview
```

---

### "GitHub Pages blank page"

**Error**: URL buka ke blank page / 404 Not Found

**Symptoms**:
- GitHub Pages deployment successful ✓
- Tapi halaman blank atau 404
- Console error: "Cannot GET /Militer/"

**Solusi**:

1. **Verifikasi base path setup**:
   - Jika repo name adalah `Militer`, base path harus `/Militer/`
   - Check `vite.config.js`:
   ```javascript
   export default {
     base: process.env.VITE_BASE_PATH || '/',
     // ...
   }
   ```

2. **Verifikasi GitHub Actions workflow**:
   - File: `.github/workflows/deploy-production.yml`
   - Pastikan ada: `VITE_BASE_PATH=/Militer/`

3. **Build ulang dengan base path yang benar**:
   ```bash
   VITE_BASE_PATH=/Militer/ npm run build
   
   # Test locally
   npm run preview
   # Buka http://localhost:4173/Militer/
   ```

4. **Clear GitHub Pages cache**:
   ```
   Settings → Pages → Change branch → Save
   Tunggu rebuild, lalu akses URL lagi
   ```

---

### "Supabase db push gagal"

**Error**: `supabase db push` fails atau migrations tidak diapply

**Solusi**:
```bash
# 1. Cek status migrations sekarang
supabase migration list

# 2. Jika ada mismatch, lihat detail error
supabase db push --dry-run

# 3. Jika problem persist, repair migrations:
supabase migration repair --status reverted 20260415000000

# 4. Push ulang
supabase db push

# 5. Verifikasi applied di remote
supabase migration list --linked
```

---

## Production Issues

### "Import masih lambat untuk 600+ users (20+ menit)"

**Symptom**: CSV import to 600 users tidak lebih cepat meskipun ada optimization

**Root Causes**:

1. **Migration belum diapply**:
   ```bash
   # Check status
   supabase db status
   
   # Should show: 20260422150000_optimize_600_users_end_to_end ✓
   
   # If not, push:
   supabase db push
   ```

2. **Old import function dipakai** - Code masih manual loop:
   ```typescript
   // ❌ SLOW
   for (const user of csvData) {
     await createUser(user);  // Per-user call
   }
   
   // ✅ FAST
   import { bulkImportUsers } from '@/lib/api/optimized600Users';
   await bulkImportUsers({ users: csvData });
   ```

3. **Connection pooling tidak aktif**:
   ```bash
   # Verifikasi di supabase/config.toml
   grep "enabled = true" supabase/config.toml
   
   # Should show: enabled = true
   
   # Jika false, update & restart
   supabase start --force-rebuild
   ```

**Solution**:
```bash
# Verify migration applied
supabase db status

# Verify code uses bulkImportUsers
grep -r "bulkImportUsers" src/

# Test manually
npm run build && npm run dev
# Try import 600 users → should finish < 10 seconds
```

---

### "Hanya bisa login 50 users, tidak bisa 600"

**Symptom**: Error "only 50 users available", auth fails untuk user > 50

**Root Causes**:

1. **RLS policy limit enforcement**:
   ```sql
   -- Check if LIMIT 50 in policy
   SELECT * FROM pg_policies 
   WHERE tablename = 'users' AND polname LIKE '%LIMIT%';
   ```

2. **Pagination bug di backend**:
   ```sql
   -- Verify api_get_users works for rows > 50
   SELECT api_get_users(
     p_limit := 100,
     p_offset := 50
   );
   -- Should return 100 rows
   ```

**Solution**:
```bash
# 1. Verify total users in database
supabase db execute --sql "SELECT COUNT(*) FROM public.users WHERE is_deleted = false"
# Should show 600

# 2. Verify RLS policy doesn't have LIMIT
supabase db execute --sql "SELECT * FROM pg_policies WHERE tablename = 'users'"

# 3. Test pagination directly
curl "http://localhost:3000/rest/v1/users?limit=100&offset=50"
# Should return 100 users
```

---

### "Connection pool exhausted (cannot acquire connection)"

**Error**: `Error: cannot acquire connection` setelah 100-150 users

**Symptom**: Login fails setelah concurrent users tertentu

**Root Causes**:

1. **Connection pooling disabled**:
   ```bash
   grep "enabled = true" supabase/config.toml
   # If false → that's the problem!
   ```

2. **Pool size terlalu kecil**:
   ```bash
   grep "default_pool_size" supabase/config.toml
   # Should be 50+ untuk 600 users
   ```

3. **Subscriptions tidak di-cleanup**:
   ```typescript
   // ❌ WRONG - Missing cleanup
   useEffect(() => {
     optimizedRealtimeSubscriber.subscribe(...);
   }, []);
   
   // ✅ CORRECT
   useEffect(() => {
     const key = optimizedRealtimeSubscriber.subscribe(...);
     return () => optimizedRealtimeSubscriber.unsubscribe(key);
   }, []);
   ```

**Solution**:
```bash
# 1. Enable connection pooling
# Edit supabase/config.toml
[db]
pooler:
  enabled = true
  pool_mode = "transaction"
  default_pool_size = 50
  max_client_conn = 500

# 2. Restart Supabase
supabase restart

# 3. Monitor subscriptions pada dashboard
# Check: Number of active connections
```

---

### "Gate Pass auto-approval tidak jalan"

**Symptom**: Gate pass selalu pending, tidak auto-approve

**Solution**:
```bash
# 1. Verify migration applied
supabase db status | grep "auto_approval\|gatepass"

# 2. Test auto-approval function
supabase db execute --sql "
SELECT should_auto_approve_gate_pass(
  'test-user-id'::uuid,
  'Rapat penting',
  'Bandung',
  NOW(),
  NOW() + INTERVAL '4 hours'
) as approval_result;
"

# 3. Submit test gate pass via UI
# Check: Is it immediately marked "Disetujui"?

# 4. If still pending, check function in database:
supabase db execute --sql "
SELECT SOURCE FROM PG_PROC WHERE PRONAME = 'should_auto_approve_gate_pass';
"
```

---

### "Real-time data tidak sync antar tab"

**Symptom**: Update di tab 1 tidak muncul di tab 2

**Solution**:
```bash
# 1. Check subscriptions berjalan
Open DevTools → Application → see realtime subscriptions listed

# 2. Verify Supabase realtime aktif
Settings → Realtime → Check: "Realtime enabled" = ON

# 3. Force refresh to verify data consistency
Tab 2: Press F5 (full refresh)
Data should match Tab 1

# 4. Check browser console for errors
DevTools → Console → Look for "[Realtime]" errors

# 5. If issue persist, restart Frontend:
npm run dev (stop + start)
```

---

### "Gate Pass status tidak update setelah scan"

**Symptom**: Guard scan QR but system tetap "Approved" (not "Checked-in")

**Solution**:
```bash
# 1. Verify RPC function handler
supabase db execute --sql "
SELECT SOURCE FROM PG_PROC WHERE PRONAME = 'api_update_gate_pass_status';
"
# Should contain: status validation logic

# 2. Test RPC directly
supabase db execute --sql "
SELECT api_update_gate_pass_status(
  'gate-pass-id'::uuid,
  'checked_in',
  NOW()
);
"

# 3. Check: Did status change?

# 4. If not working, check migration
supabase migration list | grep "gatepass"

# 5. If migration missing, push:
supabase db push
```

---

### "Search / Filter lambat untuk 600 users"

**Symptom**: Typing in search box → UI freezes 1-2 seconds

**Solution**:
```bash
# 1. Verify indexes created
supabase db execute --sql "
SELECT INDEXNAME FROM PG_INDEXES WHERE TABLENAME = 'users';
"
# Should show: idx_users_nrp_lower, idx_users_nama_lower, etc

# 2. If missing, push optimization migration:
supabase db push

# 3. Verify search debounce on frontend
# File: src/pages/admin/UserManagement.tsx
# Look for: debounce(500ms) on search input

# 4. Verify caching layer
localStorage.getItem('user_search_cache');
# Should have cached results

# 5. Test search manually
# Type: NRP or Nama
# Should see results within 1 second max
```

---

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `INVALID_JWT` | Auth token expired / invalid | Login lagi atau clear localStorage |
| `RLS policy violation` | Not allowed to access row | Check user role & RLS policy |
| `Column not found` | Database schema missing | Run `supabase db push` lagi |
| `Unique constraint failed` | Duplicate NRP/email | Check existing data atau use unique method |
| `Foreign key constraint failed` | Referential integrity | Delete child records first |

---

## Getting Help

1. **Check related docs**:
   - [`/docs/SCALABILITY.md`](./docs/SCALABILITY.md) - 600+ user optimization
   - [`/docs/ADVANCED_GATE_PASS.md`](./docs/ADVANCED_GATE_PASS.md) - Gate Pass details
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment setup

2. **Check logs**:
   ```bash
   # Frontend: Browser DevTools → Console / Network
   # Backend: supabase logs
   supabase logs <keyword>
   # Database: Query logs
   supabase db execute --sql "SELECT * FROM pg_stat_statements;"
   ```

3. **Report issue**:
   - [GitHub Issues](https://github.com/zenipara/Militer/issues)
   - Include: Error message, steps to reproduce, environment info

---

**Last Updated**: April 28, 2026
