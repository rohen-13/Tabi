#!/bin/zsh
cd "${0:A:h}" || exit 1
if [[ -x "$HOME/.docker/bin/docker" ]]; then
  export PATH="$HOME/.docker/bin:$PATH"
fi
if command -v docker >/dev/null 2>&1 && [[ -f .env ]]; then
  if ! docker info >/dev/null 2>&1; then
    echo 'Start Docker Desktop, wait for the engine, then open this launcher again.'
    read '?Press Enter to close.'
    exit 1
  fi
  if docker compose up -d --build --wait; then
    echo 'Tabi is running with PostgreSQL: http://127.0.0.1:5173'
    echo 'Stop later with: docker compose stop'
  fi
  read '?Press Enter to close this window. Containers keep running.'
  exit 0
fi
if ! command -v node >/dev/null 2>&1; then
  tabi_runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
  if [[ -x "$tabi_runtime/node" ]]; then
    export PATH="$tabi_runtime:$PATH"
  else
    echo 'Install Node.js 24, then run npm ci and npm run dev in this folder.'
    read '?Press Enter to close.'
    exit 1
  fi
fi
if [[ ! -f node_modules/tsx/dist/cli.mjs ]]; then
  echo 'Dependencies are missing. Run npm ci in this folder first.'
  read '?Press Enter to close.'
  exit 1
fi
echo 'Open http://127.0.0.1:5173 in your browser. Press Ctrl+C to stop.'
node node_modules/tsx/dist/cli.mjs server/index.ts
