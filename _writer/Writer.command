#!/bin/zsh
cd "${0:A:h}"
if curl -fsS http://localhost:4317/api/config >/dev/null 2>&1; then
  open 'http://localhost:4317'
  exit 0
fi
npm start &
writer_pid=$!
trap 'kill $writer_pid 2>/dev/null' EXIT INT TERM
for attempt in {1..100}; do
  if curl -fsS http://localhost:4317/api/config >/dev/null 2>&1; then
    open 'http://localhost:4317'
    break
  fi
  sleep 0.1
done
wait $writer_pid
