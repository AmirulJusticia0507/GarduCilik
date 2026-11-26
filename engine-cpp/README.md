# Engine Simulasi C++ / WebAssembly

Engine ini menghitung perilaku kelistrikan rumah secara lokal di browser:
daya aktif/semu/reaktif, arus, power factor, inrush sementara, akumulasi kWh,
panas kabel, dan trip MCB. Modelnya **edukatif dan disederhanakan**, bukan
acuan pemasangan atau pengamanan instalasi listrik nyata.

Modul ini adalah padanan C++ dari `src/lib/simulation/engine.ts`. Frontend
tetap dapat berjalan tanpa artefak WASM; loader akan memakai engine TypeScript
sebagai fallback.

## Struktur

```
engine-cpp/
├── src/
│   ├── grid_engine.h        # model data + kontrak GridEngine
│   ├── grid_engine.cpp      # perhitungan simulasi murni
│   └── embind_binding.cpp   # binding Embind + parsing JSON input
├── tests/engine_test.cpp    # tes native tanpa framework eksternal
├── tests/wasm_smoke_test.cjs # uji asap artefak WASM di Node
├── build.sh                 # build WASM (bash)
├── build.ps1                # build WASM (PowerShell / Docker)
├── test.sh                  # jalankan tes native atau via em++
└── test-wasm.sh             # build varian Node + uji asap WASM
```

## Prasyarat build

- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html)
  dengan `em++` di `PATH`, atau
- Docker Desktop untuk memakai image `emscripten/emsdk`, atau
- compiler C++17 apa pun untuk menjalankan tes native.

## Build WASM

Dari direktori `engine-cpp/`:

```bash
./build.sh
```

PowerShell:

```powershell
.\build.ps1
```

Tanpa Emscripten lokal, gunakan Docker:

```powershell
.\build.ps1 -Docker
```

Perintah Docker yang setara:

```powershell
docker run --rm -v "${PWD}\..:/src" -w /src/engine-cpp emscripten/emsdk bash ./build.sh
```

Hasil build:

- `public/wasm/grid_engine.js`
- `public/wasm/grid_engine.wasm`

Direktori `public/wasm/` diabaikan Git karena merupakan artefak build. Setelah
artefak ada, `src/lib/simulation/wasm-loader.ts` akan otomatis memuatnya dan
`engineSource` berubah menjadi `"wasm"`. Tanpa artefak, UI memakai engine
TypeScript dengan status `"fallback"`.

## Tes

```bash
./test.sh
```

Skrip memilih compiler native (`$CXX`, `c++`, `g++`, atau `clang++`). Bila tidak
ada, tes dibangun dengan `em++` untuk Node. Untuk menjalankan tes di Docker:

```powershell
docker run --rm -v "${PWD}\..:/src" -w /src/engine-cpp emscripten/emsdk bash ./test.sh
```

Untuk memverifikasi artefak WASM yang benar-benar dibangun (bukan hanya kode
C++ native), jalankan:

```bash
./test-wasm.sh
```

Atau lewat Docker:

```powershell
docker run --rm -v "${PWD}\..:/src" -w /src/engine-cpp emscripten/emsdk bash ./test-wasm.sh
```

## Kontrak JavaScript

Loader memanggil factory Embind:

```js
const module = await createGridEngineModule({ locateFile: (file) => `/wasm/${file}` });
const engine = module.createGridEngine(JSON.stringify(levelConfig));
```

Objek `engine` menyediakan:

| Method | Hasil |
| --- | --- |
| `getSnapshot()` | objek `GridSnapshot` |
| `advance(deltaSeconds)` | `GridSnapshot` setelah waktu maju |
| `setApplianceOn(id, isOn)` | `EngineResult` `{ ok, error?, snapshot }` |
| `resetBreaker()` | `EngineResult` |
| `restartLevel()` | `EngineResult` |
| `drainEvents()` | array `SimulationEvent` |

Bentuk data mengikuti `src/types/grid.ts`. Input `levelConfig` memakai nama
field JSON yang sama dengan kontrak TypeScript (`meterCapacityVA`,
`ratedPowerW`, `inrush.multiplier`, dan seterusnya).

## Catatan implementasi

- Engine sinkron dan deterministik; waktu hanya maju melalui `advance()`.
- Delta waktu dipotong ke `simulation.maxStepSeconds` dan diintegrasikan dalam
  langkah maksimum 0,05 detik agar transisi inrush/trip tetap halus.
- Validasi konfigurasi dilakukan saat engine dibuat. Konfigurasi tidak valid
  melempar error, lalu loader frontend jatuh ke engine TypeScript.
- Instance C++ dialokasikan untuk satu level dan hidup selama level aktif.
  Embind menyediakan `delete()` pada handle; loader saat ini tidak memanggilnya
  karena satu instance hanya dibuat per pemuatan level.
- Jangan memakai angka dari engine ini sebagai instruksi instalasi listrik.
