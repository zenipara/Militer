#!/usr/bin/env bash
# ============================================================
# KARYO OS — Deploy ke Supabase + Netlify via Terminal
# Jalankan: bash scripts/deploy.sh
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

# ── Cek prasyarat ────────────────────────────────────────────
section "Cek Prasyarat"

command -v node &>/dev/null     || error "Node.js tidak ditemukan. Jalankan bash scripts/setup.sh terlebih dahulu."
command -v supabase &>/dev/null || error "Supabase CLI tidak ditemukan. Jalankan bash scripts/setup.sh terlebih dahulu."
command -v netlify &>/dev/null  || error "Netlify CLI tidak ditemukan. Jalankan bash scripts/setup.sh terlebih dahulu."
[[ -f ".env.local" ]]           || error ".env.local tidak ditemukan. Jalankan bash scripts/setup.sh terlebih dahulu."

success "Semua prasyarat terpenuhi."

# ── 1. Deploy migrasi Supabase ───────────────────────────────
section "1. Deploy Migrasi Supabase"

# Cek apakah project sudah di-link
if ! supabase status &>/dev/null 2>&1; then
  warn "Supabase project belum di-link."
  info "Masukkan Supabase Project ID:"
  read -r -p "  Project ID: " SB_PROJECT_ID
  [[ -z "$SB_PROJECT_ID" ]] && error "Project ID tidak boleh kosong."
  supabase link --project-ref "$SB_PROJECT_ID"
fi

info "Menerapkan migration ke Supabase cloud..."
supabase db push
success "Migrasi Supabase berhasil."

# ── 2. Build production ──────────────────────────────────────
section "2. Build Production"
info "Menjalankan build Vite..."
npm run build
success "Build selesai. Output: dist/"

# ── 3. Deploy ke Netlify ─────────────────────────────────────
section "3. Deploy ke Netlify"

# Login jika belum
if ! netlify status &>/dev/null 2>&1; then
  info "Belum login ke Netlify. Membuka autentikasi..."
  netlify login
fi

# Cek apakah sudah terhubung ke site Netlify
if [[ ! -f ".netlify/state.json" ]]; then
  warn "Belum terhubung ke Netlify site."
  echo ""
  echo -e "  ${YELLOW}Pilih salah satu:${NC}"
  echo -e "  ${CYAN}[1]${NC} Buat site Netlify baru"
  echo -e "  ${CYAN}[2]${NC} Hubungkan ke site Netlify yang sudah ada"
  echo ""
  read -r -p "  Pilihan [1/2]: " NETLIFY_CHOICE

  if [[ "$NETLIFY_CHOICE" == "2" ]]; then
    info "Daftar site Netlify kamu:"
    netlify sites:list
    echo ""
    read -r -p "  Masukkan Site ID atau nama site: " NETLIFY_SITE
    netlify link --id "$NETLIFY_SITE"
  else
    info "Membuat site Netlify baru..."
    netlify sites:create --name "karyo-os"
    netlify link
  fi
fi

# Set environment variables di Netlify jika belum ada
section "3a. Sinkronisasi Environment Variables ke Netlify"
info "Membaca .env.local dan menyinkronkan ke Netlify..."

while IFS= read -r line || [[ -n "$line" ]]; do
  # Lewati baris komentar dan kosong
  [[ "$line" =~ ^#.*$ ]] && continue
  [[ -z "$line" ]]       && continue

  KEY="${line%%=*}"
  VALUE="${line#*=}"

  if [[ -n "$KEY" && -n "$VALUE" ]]; then
    netlify env:set "$KEY" "$VALUE" --context production 2>/dev/null \
      && info "  Set $KEY" \
      || warn "  Gagal set $KEY (mungkin sudah ada)"
  fi
done < ".env.local"
success "Environment variables tersinkronisasi."

# Deploy ke production
section "3b. Deploy ke Production"
info "Mendeploy ke Netlify production..."
netlify deploy --dir=dist --prod

# ── Selesai ──────────────────────────────────────────────────
section "✅ Deploy Selesai!"
echo ""
SITE_URL=$(netlify status --json 2>/dev/null | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "(lihat output netlify di atas)")
echo -e "  ${GREEN}Aplikasi KARYO OS berhasil dideploy!${NC}"
if [[ -n "$SITE_URL" ]]; then
  echo -e "  URL: ${CYAN}${SITE_URL}${NC}"
fi
echo ""
echo -e "  ${YELLOW}Checklist pasca-deploy:${NC}"
echo -e "  [ ] Login dengan NRP 1000001 dan PIN 123456 (jika seed data dijalankan)"
echo -e "  [ ] Ganti PIN admin default segera"
echo -e "  [ ] Aktifkan Realtime di Supabase Dashboard → Database → Replication"
echo -e "  [ ] Pastikan migration 004_production_rls.sql sudah dijalankan"
echo ""
