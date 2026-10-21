#!/usr/bin/env bash
# macOS/Linux twin of serve.ps1: start the web app on port 3110 (Stencil's agent port, CLAUDE.md) in dev mode,
# run a command against it, always stop it.
#   .claude/skills/run-web/serve.sh -- "node .claude/skills/run-web/shoot.mjs --out $TMPDIR/shell-390.png"
# Dev mode only: a static export (output: 'export') can't be served by next start, and the app has no date
# override, so the team template's --prod and --dev-today are left out.
# Stops only the server it started (its own process group), never another listener on the port.
set -euo pipefail
PORT=3110
[ "${1:-}" = "--" ] && shift
CMD="${1:-}"
[ -n "$CMD" ] || { echo "usage: serve.sh -- \"<command>\"" >&2; exit 2; }
# Without lsof a busy port would look free; refuse instead of guessing.
command -v lsof >/dev/null || { echo "lsof not found; install it (it ships with macOS; on Linux e.g. apt install lsof)" >&2; exit 1; }
WEB="$(cd "$(dirname "$0")/../../../web" && pwd)"

listening() { lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true; }
if [ -n "$(listening)" ]; then
  echo "port $PORT is already in use; never stop a server you didn't start - ask the user (3000 belongs to the user)" >&2
  exit 1
fi

# Its own process group (set -m), so cleanup reaches pnpm and the next server under it, and nothing else.
set -m
(cd "$WEB" && exec pnpm dev --port "$PORT") >/dev/null 2>&1 &
SERVER=$!
set +m

cleanup() {
  kill -TERM -- "-$SERVER" 2>/dev/null || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    kill -0 -- "-$SERVER" 2>/dev/null || break
    sleep 0.3
  done
  kill -KILL -- "-$SERVER" 2>/dev/null || true
  echo "port $PORT listeners left: $(listening | wc -l | tr -d ' ')"
}
trap cleanup EXIT

# About a minute: 120 polls of 0.5 s, each request capped at 5 s.
ok=0
for _ in $(seq 1 120); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:$PORT/" || true)" = 200 ]; then ok=1; break; fi
  kill -0 "$SERVER" 2>/dev/null || { echo "the server exited before answering on $PORT" >&2; exit 1; }
  sleep 0.5
done
[ "$ok" = 1 ] || { echo "server on $PORT did not answer 200 within about a minute" >&2; exit 1; }
echo "web (dev) up on http://localhost:$PORT"
bash -c "$CMD"
