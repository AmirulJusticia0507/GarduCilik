#!/usr/bin/env bash
# Bangun modul WebAssembly GarduCilik dengan Emscripten.
#
# Pemakaian:
#   ./build.sh
#   EMXX=/path/to/em++ OUT_DIR=../public/wasm ./build.sh
#
# Hasil build masuk ke public/wasm/ dan tidak di-commit (lihat .gitignore).

set -euo pipefail

cd "$(dirname "$0")"

EMXX="${EMXX:-em++}"
OUT_DIR="${OUT_DIR:-../public/wasm}"

if ! command -v "$EMXX" >/dev/null 2>&1; then
  echo "em++ tidak ditemukan. Instal Emscripten SDK atau jalankan lewat Docker:" >&2
  echo "  docker run --rm -v \"\$PWD/..:/src\" -w /src/engine-cpp emscripten/emsdk bash ./build.sh" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

"$EMXX" \
  -std=c++17 \
  -O3 \
  -I src \
  src/grid_engine.cpp \
  src/embind_binding.cpp \
  --bind \
  --no-entry \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sENVIRONMENT=web \
  -sALLOW_MEMORY_GROWTH=1 \
  -sASSERTIONS=0 \
  -o "$OUT_DIR/grid_engine.js"

echo "WASM dibuat: $OUT_DIR/grid_engine.js dan $OUT_DIR/grid_engine.wasm"
