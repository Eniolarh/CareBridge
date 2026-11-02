#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NETWORK="${NETWORK:-testnet}"
CONTRACT_ID="${CONTRACT_ID:-}"

if [[ -z "$CONTRACT_ID" && -f "app/.env.local" ]]; then
  CONTRACT_ID="$(grep -E '^NEXT_PUBLIC_CONTRACT_ID=' app/.env.local | head -n1 | cut -d= -f2- | tr -d '\r')"
fi

if [[ -z "$CONTRACT_ID" ]]; then
  echo "Set CONTRACT_ID or run deploy.sh/deploy.ps1 first." >&2
  exit 1
fi

if ! command -v stellar >/dev/null 2>&1; then
  echo "Stellar CLI is required to generate bindings." >&2
  exit 1
fi

echo "Generating TypeScript bindings for $CONTRACT_ID..."
stellar contract bindings typescript \
  --contract-id "$CONTRACT_ID" \
  --network "$NETWORK" \
  --output-dir "app/lib/generated" \
  --overwrite

echo "Bindings written to app/lib/generated"
echo "Note: app/lib/carebridge.ts is a hand-written client that mirrors the contract ABI."
