#!/bin/zsh
cd "${0:A:h}"
url="http://localhost:${PORT:-4317}"
if curl -fsS "$url/api/config" >/dev/null 2>&1; then
  open "$url"
  exit 0
fi
pnpm start &
writer_pid=$!
trap 'kill $writer_pid 2>/dev/null' EXIT INT TERM
for attempt in {1..100}; do
  if curl -fsS "$url/api/config" >/dev/null 2>&1; then
    open "$url"
    break
  fi
  sleep 0.1
done
wait $writer_pid
