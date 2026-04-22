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

  local line
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$file" | tail -n 1 || true)"
  [[ -z "$line" ]] && return 1

  local value="${line#*=}"
  value="${value%$'\r'}"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  # trim leading/trailing whitespace
  value="$(printf '%s' "$value" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  printf '%s' "$value"
}

ENV_FILE=".env.local"
CLI_TOKEN_FILE="$HOME/.supabase/access-token"

LINKED_REF_FILE="supabase/.temp/project-ref"

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  SUPABASE_PROJECT_REF="$(read_env_key "SUPABASE_PROJECT_REF" "$ENV_FILE" || true)"
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" && -n "${SUPABASE_PROJECT_ID:-}" ]]; then
  SUPABASE_PROJECT_REF="$SUPABASE_PROJECT_ID"
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" && -f "$LINKED_REF_FILE" ]]; then
  SUPABASE_PROJECT_REF="$(tr -d '\n\r' < "$LINKED_REF_FILE")"
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  # Prefer local `supabase login` session token when available.
  if [[ ! -s "$CLI_TOKEN_FILE" ]]; then
    SUPABASE_ACCESS_TOKEN="$(read_env_key "SUPABASE_ACCESS_TOKEN" "$ENV_FILE" || true)"
  fi
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" && -n "${SUPABASE_TOKEN:-}" && ! -s "$CLI_TOKEN_FILE" ]]; then
  SUPABASE_ACCESS_TOKEN="$SUPABASE_TOKEN"
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  SUPABASE_DB_PASSWORD="$(read_env_key "SUPABASE_DB_PASSWORD" "$ENV_FILE" || true)"
fi

if [[ -z "${VITE_SUPABASE_URL:-}" ]]; then
  VITE_SUPABASE_URL="$(read_env_key "VITE_SUPABASE_URL" "$ENV_FILE" || true)"
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" && ! -s "$CLI_TOKEN_FILE" ]]; then
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
  local env_cmd=(env -u SUPABASE_PROJECT_ID -u VITE_SUPABASE_URL -u SUPABASE_PROJECT_REF)
  if [[ -s "$CLI_TOKEN_FILE" ]]; then
    env_cmd+=( SUPABASE_ACCESS_TOKEN= SUPABASE_TOKEN= )
  fi

  if command -v supabase >/dev/null 2>&1; then
    "${env_cmd[@]}" supabase "$@"
  else
    "${env_cmd[@]}" npm exec --yes supabase@latest -- "$@"
  fi
}

echo "Link project Supabase: $SUPABASE_PROJECT_REF"
run_supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "Push migration ke Supabase..."
run_supabase db push

echo "Selesai: schema Supabase tersinkron dengan migration terbaru."
