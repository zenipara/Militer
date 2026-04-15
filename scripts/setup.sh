#!/usr/bin/env bash
# ============================================================
# KARYO OS — Setup via Terminal (GitHub Codespaces / Linux)
# Jalankan: bash scripts/setup.sh
# ============================================================
set -euo pipefail

# ── Warna output ────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}ℹ  $*${NC}"; }
success() { echo -e "${GREEN}✔  $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠  $*${NC}"; }
error()   { echo -e "${RED}✖  $*${NC}"; exit 1; }
section() { echo -e "\n${BOLD}══════════════════════════════════════${NC}"; echo -e "${BOLD}  $*${NC}"; echo -e "${BOLD}══════════════════════════════════════${NC}"; }

# ── 0. Cek Node.js ──────────────────────────────────────────
section "0. Cek Node.js & npm"
if ! command -v node &>/dev/null; then
  error "Node.js tidak ditemukan. Pasang Node.js >= 20 terlebih dahulu."
fi
NODE_VER=$(node -e "process.exit(parseInt(process.versions.node) < 20 ? 1 : 0)" && echo ok || echo fail)
if [[ "$NODE_VER" == "fail" ]]; then
  error "Node.js >= 20 diperlukan. Versi saat ini: $(node -v)"
fi
success "Node.js $(node -v)  |  npm $(npm -v)"

# ── 1. Install Supabase CLI ──────────────────────────────────
section "1. Install Supabase CLI"
if command -v supabase &>/dev/null; then
  success "Supabase CLI sudah terpasang: $(supabase --version)"
else
  info "Menginstall Supabase CLI via npm..."
  npm install -g supabase
  success "Supabase CLI terpasang: $(supabase --version)"
fi

# ── 2. Install Netlify CLI ───────────────────────────────────
section "2. Install Netlify CLI"
if command -v netlify &>/dev/null; then
  success "Netlify CLI sudah terpasang: $(netlify --version)"
else
  info "Menginstall Netlify CLI via npm..."
  npm install -g netlify-cli
  success "Netlify CLI terpasang: $(netlify --version)"
fi

# ── 3. Install dependencies proyek ──────────────────────────
section "3. Install dependensi proyek"
npm ci
success "Dependensi proyek terinstall."

# ── 4. Konfigurasi .env.local ───────────────────────────────
section "4. Konfigurasi Environment Variables"
ENV_FILE=".env.local"

if [[ -f "$ENV_FILE" ]]; then
  warn "$ENV_FILE sudah ada."
  read -r -p "   Timpa dengan nilai baru? [y/N] " OVERWRITE
  [[ "${OVERWRITE,,}" != "y" ]] && { info "Melewati konfigurasi env."; SKIP_ENV=1; }
fi

if [[ "${SKIP_ENV:-0}" != "1" ]]; then
  echo ""
  info "Masukkan kredensial Supabase (dari: Supabase Dashboard → Settings → API)"
  echo ""

  read -r -p "  VITE_SUPABASE_URL  (contoh: https://abcd.supabase.co) : " SUPABASE_URL
  [[ -z "$SUPABASE_URL" ]] && error "VITE_SUPABASE_URL tidak boleh kosong."

  read -r -p "  VITE_SUPABASE_ANON_KEY (anon public key)              : " SUPABASE_ANON_KEY
  [[ -z "$SUPABASE_ANON_KEY" ]] && error "VITE_SUPABASE_ANON_KEY tidak boleh kosong."

  cat > "$ENV_FILE" <<EOF
# Supabase
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# App Config
VITE_APP_NAME=Karyo OS
VITE_APP_VERSION=1.0.0
EOF

  success "$ENV_FILE berhasil dibuat."
fi

# ── 5. Login & link Supabase ─────────────────────────────────
section "5. Login & Link Supabase"
info "Membuka login Supabase di browser (atau gunakan access token)..."
supabase login

echo ""
info "Masukkan Supabase Project ID kamu"
info "(Temukan di: Supabase Dashboard → Settings → General → Reference ID)"
read -r -p "  Project ID: " SB_PROJECT_ID
[[ -z "$SB_PROJECT_ID" ]] && error "Project ID tidak boleh kosong."

supabase link --project-ref "$SB_PROJECT_ID"
success "Supabase project berhasil di-link: $SB_PROJECT_ID"

# ── 6. Jalankan migrasi database ────────────────────────────
section "6. Jalankan Migrasi Database"
info "Menjalankan semua migration ke Supabase cloud..."
supabase db push
success "Semua migration berhasil dijalankan."

# ── 7. Verifikasi tabel database ────────────────────────────
section "7. Verifikasi Database"
info "Cek tabel yang terbuat (via Supabase CLI):"
supabase db dump --schema public --linked 2>/dev/null | grep "^CREATE TABLE" | awk '{print "   ✔", $3}' || \
  warn "Tidak bisa dump schema otomatis. Verifikasi manual via Supabase Dashboard → Table Editor."

# ── 8. Build proyek ─────────────────────────────────────────
section "8. Build Proyek (Production)"
info "Menjalankan TypeScript check + Vite build..."
npm run build
success "Build berhasil. Output: dist/"

# ── Selesai ──────────────────────────────────────────────────
section "✅ Setup Selesai!"
echo ""
echo -e "  ${GREEN}Langkah selanjutnya:${NC}"
echo -e "  1. Jalankan dev server  : ${CYAN}npm run dev${NC}"
echo -e "  2. Deploy ke Netlify    : ${CYAN}bash scripts/deploy.sh${NC}"
echo ""
echo -e "  ${YELLOW}Jika ingin seed data sample, jalankan di Supabase SQL Editor:${NC}"
echo -e "  ${CYAN}supabase/migrations/002_seed_data.sql${NC}"
echo ""
