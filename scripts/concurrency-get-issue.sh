#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/concurrency-get-issue.sh [CONCURRENCY] [ISSUE_KEY] [RUN_SECS]
# Defaults: CONCURRENCY=20, ISSUE_KEY="TEST-1", RUN_SECS=0 (one-shot)

CONCURRENCY="${1:-20}"
ISSUE_KEY="${2:-TEST-1}"
RUN_SECS="${3:-0}"

BASE_URL=${BASE_URL:-"http://localhost:3000"}

require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1"; exit 1; }; }
require_cmd curl
require_cmd jq

echo "==> Logging in as admin..."
LOGIN=$(curl -sS -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"New1234!"}')
TOKEN=$(echo "$LOGIN" | jq -r .token)
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then echo "Login failed"; echo "$LOGIN"; exit 1; fi

echo "==> Fetching Hub Key..."
KEYS=$(curl -sS "$BASE_URL/api/oauth/keys" -H "x-auth-token: $TOKEN")
KEY_ID=$(echo "$KEYS" | jq -r '.data[] | select(.user.githubUsername=="jungchihoon") | .id' | head -n1)
if [[ -z "$KEY_ID" || "$KEY_ID" == "null" ]]; then echo "No key found for jungchihoon"; exit 1; fi
FULL=$(curl -sS "$BASE_URL/api/oauth/keys/$KEY_ID/full-value" -H "x-auth-token: $TOKEN")
HUBKEY=$(echo "$FULL" | jq -r .data.keyValue)
if [[ -z "$HUBKEY" || "$HUBKEY" == "null" ]]; then echo "Full key fetch failed"; exit 1; fi

echo "==> Warm-up tools/list..."
curl -sS -X POST "$BASE_URL/mcp" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Mcp-Protocol-Version: 2025-06-18' \
  -H "Authorization: Bearer $HUBKEY" \
  -d '{"jsonrpc":"2.0","id":999,"method":"tools/list","params":{}}' >/dev/null

TMPDIR=$(mktemp -d)
echo "==> Running $CONCURRENCY concurrent calls to get_issue (issue_key=$ISSUE_KEY)"

worker() {
  IDX="$1"
  BODY=$(jq -nc --arg key "$ISSUE_KEY" --argjson id "$IDX" '{jsonrpc:"2.0",id:$id,method:"tools/call",params:{name:"get_issue",arguments:{issue_key:$key}}}')
  START=$(date +%s%3N)
  RESP=$(curl -sS -X POST "$BASE_URL/mcp" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -H 'Mcp-Protocol-Version: 2025-06-18' \
    \
    -H "Authorization: Bearer $HUBKEY" \
    -d "$BODY") || true
  END=$(date +%s%3N)
  DUR=$((END-START))
  echo "$RESP" > "$TMPDIR/$IDX.json"
  OK=$(echo "$RESP" | jq -r '(.result.isError|not) // false' 2>/dev/null || echo false)
  echo "$IDX,$DUR,$OK" >> "$TMPDIR/results.csv"
}

export -f worker
export BASE_URL HUBKEY TMPDIR ISSUE_KEY

if [[ "$RUN_SECS" -gt 0 ]]; then
  echo "==> Timed run for $RUN_SECS seconds (best-effort)"
  END_TS=$(( $(date +%s) + RUN_SECS ))
  IDX=1
  while [[ $(date +%s) -lt $END_TS ]]; do
    for ((i=1;i<=CONCURRENCY;i++)); do IDx=$((IDX+i)); IDX=$IDx; worker "$IDx" & done
    wait
  done
else
  seq 1 "$CONCURRENCY" | xargs -P "$CONCURRENCY" -I{} bash -lc 'worker "$@"' _ {}
fi

TOTAL=$(wc -l < "$TMPDIR/results.csv" | xargs)
PASS=$(grep -c ',true$' "$TMPDIR/results.csv" || true)
echo "==> DONE: total=$TOTAL, ok=$PASS, tmp=$TMPDIR"


