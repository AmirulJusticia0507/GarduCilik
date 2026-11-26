#!/usr/bin/env bash
# Bangun varian Node dari engine lalu jalankan uji asap pada artefak WASM.

set -euo pipefail

cd "$(dirname "$0")"

EMXX="${EMXX:-em++}"
OUT_DIR="${OUT_DIR:-build}"

if ! command -v "$EMXX" >/dev/null 2>&1; then
  echo "em++ tidak ditemukan; jalankan lewat Docker emscripten/emsdk." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

"$EMXX" \
  -std=c++17 \
  -O2 \
  -I src \
  src/grid_engine.cpp \
  src/embind_binding.cpp \
  --bind \
  --no-entry \
  -sMODULARIZE=1 \
  -sENVIRONMENT=node \
  -sALLOW_MEMORY_GROWTH=1 \
  -o "$OUT_DIR/grid_engine_node.js"

node tests/wasm_smoke_test.cjs "$OUT_DIR/grid_engine_node.js"
