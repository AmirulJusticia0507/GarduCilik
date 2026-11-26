#!/usr/bin/env bash
# Jalankan tes native engine C++.
#
# Urutan pencarian compiler: $CXX, c++, g++, clang++. Bila tidak ada, tes
# dibangun dengan em++ ke Node (berguna di container emscripten/emsdk).

set -euo pipefail

cd "$(dirname "$0")"

OUT_DIR="${OUT_DIR:-build}"
mkdir -p "$OUT_DIR"

CXX_BIN="${CXX:-}"
if [ -z "$CXX_BIN" ]; then
  for candidate in c++ g++ clang++; do
    if command -v "$candidate" >/dev/null 2>&1; then
      CXX_BIN="$candidate"
      break
    fi
  done
fi

if [ -n "$CXX_BIN" ]; then
  "$CXX_BIN" -std=c++17 -O2 -I src \
    src/grid_engine.cpp tests/engine_test.cpp \
    -o "$OUT_DIR/engine_test"
  "$OUT_DIR/engine_test"
  exit 0
fi

EMXX="${EMXX:-em++}"
if command -v "$EMXX" >/dev/null 2>&1; then
  "$EMXX" -std=c++17 -O2 -I src \
    src/grid_engine.cpp tests/engine_test.cpp \
    -sENVIRONMENT=node \
    -sEXIT_RUNTIME=1 \
    -o "$OUT_DIR/engine_test.js"
  node "$OUT_DIR/engine_test.js"
  exit 0
fi

echo "Tidak ada compiler C++ (c++/g++/clang++) maupun em++." >&2
echo "Instal salah satunya, atau jalankan lewat Docker emscripten/emsdk." >&2
exit 1
