#!/usr/bin/env bash
# ============================================================
# KARYO OS — Supabase connectivity checker
# Usage: bash scripts/check-supabase.sh [env-file]
# Default env file: .env.local
# ============================================================
set -euo pipefail

ENV_FILE="${1:-.env.local}"

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
section() {
  echo -e "\n${BOLD}══════════════════════════════════════${NC}"
  echo -e "${BOLD}  $*${NC}"
  echo -e "${BOLD}══════════════════════════════════════${NC}"
}

section "Supabase Config Check"

read_env_value() {
  local key="$1"
  local file="$2"

  if [[ ! -f "$file" ]]; then
    return 0
  fi

  local line
  line=$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$file" | tail -n 1 || true)
  [[ -z "$line" ]] && return 0

  local value="${line#*=}"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  printf '%s' "$value"
}

if [[ -f "$ENV_FILE" ]]; then
  info "Load environment from $ENV_FILE"
else
  warn "$ENV_FILE tidak ditemukan, fallback ke environment shell saat ini."
fi

SUPABASE_URL="$(read_env_value VITE_SUPABASE_URL "$ENV_FILE")"
SUPABASE_ANON_KEY="$(read_env_value VITE_SUPABASE_ANON_KEY "$ENV_FILE")"

if [[ -z "$SUPABASE_URL" ]]; then
  SUPABASE_URL="${VITE_SUPABASE_URL:-}"
fi

if [[ -z "$SUPABASE_ANON_KEY" ]]; then
  SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}"
fi

[[ -z "$SUPABASE_URL" ]] && error "VITE_SUPABASE_URL belum diset."
[[ -z "$SUPABASE_ANON_KEY" ]] && error "VITE_SUPABASE_ANON_KEY belum diset."

if [[ ! "$SUPABASE_URL" =~ ^https://[a-zA-Z0-9-]+\.supabase\.co/?$ ]]; then
  warn "Format VITE_SUPABASE_URL terlihat tidak standar: $SUPABASE_URL"
fi

health_code=$(curl -sS -m 15 -o /dev/null -w "%{http_code}" "${SUPABASE_URL%/}/auth/v1/health" || true)
if [[ "$health_code" != "200" && "$health_code" != "401" ]]; then
  error "Auth health check gagal (HTTP $health_code). Periksa URL project / status project Supabase."
fi
success "Auth endpoint reachable (HTTP $health_code)."

rest_code=$(curl -sS -m 15 -o /dev/null -w "%{http_code}" "${SUPABASE_URL%/}/rest/v1/" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" || true)

if [[ "$rest_code" == "000" || -z "$rest_code" ]]; then
  error "REST endpoint tidak dapat diakses (network/CORS/host issue)."
fi

case "$rest_code" in
  200|401|403|404)
    success "REST endpoint terjangkau (HTTP $rest_code). Koneksi frontend -> Supabase aktif."
    ;;
  *)
    warn "REST endpoint merespons HTTP $rest_code. Cek API key / kebijakan RLS jika request app gagal."
    ;;
esac

section "Hasil"
success "Konfigurasi dasar Supabase valid dan endpoint dapat dijangkau."
info "Lanjutkan verifikasi DB schema dengan: supabase db push / supabase migration list"
