#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

read_env_key() {
  local key="$1"
  local file="$2"
  if [[ ! -f "$file" ]]; then
    return 1
  fi

  awk -F '=' -v key="$key" '$1 == key { $1=""; sub(/^=/, ""); print; exit }' "$file"
}

ENV_FILE=".env.local"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" && -n "${SUPABASE_TOKEN:-}" ]]; then
  SUPABASE_ACCESS_TOKEN="$SUPABASE_TOKEN"
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" && -n "${SUPABASE_PROJECT_ID:-}" ]]; then
  SUPABASE_PROJECT_REF="$SUPABASE_PROJECT_ID"
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  SUPABASE_PROJECT_REF="$(read_env_key "SUPABASE_PROJECT_REF" "$ENV_FILE" || true)"
fi

if [[ -z "${VITE_SUPABASE_URL:-}" ]]; then
  VITE_SUPABASE_URL="$(read_env_key "VITE_SUPABASE_URL" "$ENV_FILE" || true)"
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN belum diset." >&2
  echo "Isi env lalu jalankan ulang script ini." >&2
  exit 1
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  if [[ -n "${VITE_SUPABASE_URL:-}" ]]; then
    SUPABASE_PROJECT_REF="$(echo "$VITE_SUPABASE_URL" | sed -E 's#https://([^.]+)\.supabase\.co/?#\1#')"
  fi
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "ERROR: SUPABASE_PROJECT_REF tidak ditemukan." >&2
  echo "Set SUPABASE_PROJECT_REF atau VITE_SUPABASE_URL di .env.local." >&2
  exit 1
fi

run_supabase() {
  if command -v supabase >/dev/null 2>&1; then
    supabase "$@"
  else
    npm exec --yes supabase@latest -- "$@"
  fi
}

echo "Link project Supabase: $SUPABASE_PROJECT_REF"
run_supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "Push migration ke Supabase..."
run_supabase db push

echo "Selesai: schema Supabase tersinkron dengan migration terbaru."
