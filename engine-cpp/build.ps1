# Bangun modul WebAssembly GarduCilik dari PowerShell.
#
# Pemakaian:
#   .\build.ps1
#   .\build.ps1 -Docker
#
# -Docker memakai image emscripten/emsdk sehingga Emscripten tidak perlu
# dipasang langsung di Windows. Docker Desktop harus berjalan.

param(
    [switch]$Docker
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Resolve-Path (Join-Path $root "..")

if ($Docker) {
    docker run --rm -v "${repo}:/src" -w /src/engine-cpp emscripten/emsdk bash ./build.sh
    exit $LASTEXITCODE
}

$emxx = Get-Command em++ -ErrorAction SilentlyContinue
if (-not $emxx) {
    Write-Error "em++ tidak ditemukan. Pasang Emscripten SDK, atau jalankan: .\build.ps1 -Docker"
    exit 1
}

$outDir = Join-Path $repo "public\wasm"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$arguments = @(
    "-std=c++17",
    "-O3",
    "-I", "src",
    "src/grid_engine.cpp",
    "src/embind_binding.cpp",
    "--bind",
    "--no-entry",
    "-sMODULARIZE=1",
    "-sEXPORT_ES6=1",
    "-sENVIRONMENT=web",
    "-sALLOW_MEMORY_GROWTH=1",
    "-sASSERTIONS=0",
    "-o", (Join-Path $outDir "grid_engine.js")
)

Push-Location $root
try {
    & $emxx.Source @arguments
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}

Write-Host "WASM dibuat: public\wasm\grid_engine.js dan grid_engine.wasm"
