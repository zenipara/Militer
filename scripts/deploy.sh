#!/usr/bin/env bash
# ============================================================
# KARYO OS — Build & Deploy Supabase via Terminal
# Jalankan: bash scripts/deploy.sh
# GitHub Pages deployment frontend ditangani oleh GitHub Actions.
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

# ── 3. Siapkan frontend untuk GitHub Pages ───────────────────
section "3. Siapkan Frontend GitHub Pages"
info "Artefak frontend tersedia di dist/. Deploy ke GitHub Pages berjalan via workflow GitHub Actions."

# ── Selesai ──────────────────────────────────────────────────
section "✅ Deploy Selesai!"
echo ""
echo -e "  ${GREEN}Migrasi Supabase selesai dan frontend sudah dibuild.${NC}"
echo -e "  URL produksi GitHub Pages dikelola oleh workflow GitHub Actions."
echo ""
echo -e "  ${YELLOW}Checklist pasca-deploy:${NC}"
echo -e "  [ ] Login dengan NRP 1000001 dan PIN 123456 (jika seed data dijalankan)"
echo -e "  [ ] Ganti PIN admin default segera"
echo -e "  [ ] Aktifkan Realtime di Supabase Dashboard → Database → Replication"
echo -e "  [ ] Pastikan migration 004_production_rls.sql sudah dijalankan"
echo ""
