# 🚀 Getting Started dengan KARYO OS

Panduan lengkap untuk setup development environment dan jalankan aplikasi.

---

## 📋 Prasyarat

- **Node.js** 18+ ([download](https://nodejs.org))
- **Git** untuk clone repository
- **Supabase Account** ([daftar gratis](https://supabase.com))

---

## ⚡ 3-Minute Quickstart

### 1. Clone Repository
```bash
git clone https://github.com/zenipara/Militer.git
cd Militer
```

### 2. Automatic Setup (Recommended)
```bash
# Codespace atau terminal lokal
bash scripts/setup.sh

# Script ini handle:
# ✅ npm install (dependencies)
# ✅ .env.local setup (interactive)
# ✅ Supabase migration (jika ada)
# ✅ npm run build (verify)
```

### 3. Run Development Server
```bash
npm run dev
```

Akses aplikasi: **http://localhost:5173**

---

## 🔧 Manual Setup (Jika Script Gagal)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Buat `.env.local` di root project:
```bash
cp .env.example .env.local
```

Edit `.env.local` dengan Supabase credentials:
```env
# Supabase Config
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Only for GitHub Pages deploy
VITE_BASE_PATH=/Militer/
VITE_APP_NAME=Karyo OS
```

**Cara dapatkan Supabase credentials:**
1. Login ke [Supabase](https://app.supabase.com)
2. Buat project baru atau gunakan existing
3. Pergi ke **Settings → API**
4. Copy `Project URL` → `VITE_SUPABASE_URL`
5. Copy `anon public` key → `VITE_SUPABASE_ANON_KEY`

### Step 3: Database Migration
```bash
# Setup Supabase CLI
npm install -g supabase
# atau
npm exec --yes supabase@latest -- --version

# Push migrations ke database
supabase db push
```

### Step 4: Run Dev Server
```bash
npm run dev
```

---

## 🎯 First-Time Workflow

### 1. Login
- **NRP**: Any number (sistem punya dummy users)
- **PIN**: Any 6 digits
- Atau use pre-seeded credentials di `supabase/seed.sql`

### 2. Explore Features
- **Admin Dashboard**: `/admin` (role-based redirect)
- **Komandan Dashboard**: `/komandan`
- **Prajurit Dashboard**: `/prajurit`
- **Staf Dashboard**: `/staf`
- **Guard Dashboard**: `/guard`

### 3. Common Tasks

#### 1. Create New User (Admin)
```
1. Login as `admin`
2. Navigate to: Settings → User Management
3. Click: "Tambah Personel"
4. Fill: NRP, Name, Role, Unit
5. Submit
```

#### 2. Create Task (Komandan/Staf)
```
1. Navigate to: Tasks / Sprint
2. Click: "Buat Tugas"
3. Select: Recipient, date, priority
4. Add: Description & attachments (optional)
5. Assign
```

#### 3. Submit Gate Pass (Prajurit)
```
1. Navigate to: Gate Pass
2. Fill: Reason, Destination, Times
3. Submit (auto-approved jika eligible)
4. Go to: Pos Jaga → Scan QR to confirm
```

---

## 📝 Testing

### Unit Tests
```bash
npm run test:unit
```

### End-to-End Tests (Playwright)
```bash
npm run test:e2e
```

### Coverage Report
```bash
npm run test:coverage
```

### Smoke Test Production
```bash
E2E_BASE_URL=https://yuniamagsila.github.io/v/ npm run test:smoke:prod
```

---

## 🔨 Development Commands

```bash
# Development server (hot reload)
npm run dev

# Build production
npm run build

# Preview production build locally
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# All checks (type + lint + build)
npm run check
```

---

## 📂 Project Structure

```
karyo-os/
├── src/
│   ├── pages/           # Page components per route
│   ├── components/      # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities & API layer
│   ├── store/          # Zustand state management
│   ├── types/          # TypeScript interfaces
│   └── tests/          # Unit test files
├── e2e/                # End-to-end Playwright tests
├── docs/               # Advanced documentation
├── supabase/
│   ├── migrations/     # Database migrations
│   └── config.toml     # Supabase config
├── scripts/            # Bash setup/deploy scripts
├── public/             # Static assets & PWA files
└── package.json        # Dependencies & scripts
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anon key |
| `VITE_BASE_PATH` | ❌ No | Base path for routing (default: `/`) |
| `VITE_APP_NAME` | ❌ No | App display name (default: `Karyo OS`) |

### Tailwind CSS Config

File: `tailwind.config.js` - Customizable theme, colors, spacing

### TypeScript Config

File: `tsconfig.json` - Strict mode enabled, path aliases configured

---

## 🐛 Troubleshooting

### "Port 5173 already in use"
```bash
# Kill process using port
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

### "Cannot find module '@/components/...'"
```bash
# Path aliases not resolved - check tsconfig.json
# Paths should have:
"@/*": ["./src/*"]
```

### "Supabase connection failed"
```bash
# 1. Verify .env.local exists and has correct URLs
cat .env.local | grep SUPABASE

# 2. Check network connectivity
ping supabase.co

# 3. Verify credentials are correct in supabase.com console
```

### "Database migration pending"
```bash
# Push latest migrations
supabase db push

# Check status
supabase migration list
```

---

## 📚 Next Steps

1. **Explore Features**: Read [FEATURES.md](./FEATURES.md)
2. **Advanced Setup**: Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production
3. **Contribute**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
4. **Issues**: Report bugs on [GitHub Issues](https://github.com/zenipara/Militer/issues)

---

## 🆘 Need Help?

- 📖 Read relevant doc in `/docs` folder
- 🐛 Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- 💬 Open GitHub issue with details
- 📧 Contact maintainers

---

**Happy coding!** 🚀
