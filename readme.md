# GarduCilik

GarduCilik adalah simulasi edukasi berbasis web untuk mengenalkan beban listrik rumah, daya aktif dan daya semu, lonjakan arus awal, konsumsi energi, serta perilaku MCB dalam model sederhana.

## Status aplikasi

- Frontend: Next.js App Router, TypeScript, Tailwind CSS.
- Mesin simulasi yang berjalan di browser: engine TypeScript deterministik di `src/lib/simulation/engine.ts`, dengan fallback otomatis bila artefak WASM belum dibangun.
- Engine C++/WebAssembly: source dan binding Embind tersedia di `engine-cpp/`. Artefak `public/wasm/` dihasilkan oleh build Emscripten dan tidak di-commit.
- PWA: manifest, ikon, service worker, halaman offline, dan cache aset build.
- Backend kelas: REST API Go/Fiber dan PostgreSQL di `backend/` untuk akun guru/siswa, kelas, skenario, hasil sesi, dan leaderboard.

## Menjalankan frontend

Persyaratan: Node.js versi yang didukung Next.js 16.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Tanpa backend, level lokal tetap dapat dimainkan. Fungsi akun, kelas, skenario server, submit hasil, dan leaderboard memerlukan backend aktif.

Konfigurasikan alamat API opsional melalui `.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Untuk memeriksa aplikasi:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Service worker hanya didaftarkan pada build produksi. Jalankan `npm run build` lalu `npm start` untuk mencoba cache offline. Navigasi menggunakan network-first, aset bernama hash menggunakan cache-first, dan respons API tidak dicache; saat offline, data akun/peringkat tidak ditampilkan sebagai data terbaru.

## Build engine WASM (opsional)

Engine TypeScript sudah cukup untuk memainkan simulasi. Untuk memakai engine
C++/WebAssembly, bangun artefaknya dari `engine-cpp/`:

```powershell
cd engine-cpp
.\build.ps1          # bila em++ tersedia di PATH
.\build.ps1 -Docker  # memakai image emscripten/emsdk
```

Hasilnya adalah `public/wasm/grid_engine.js` dan `grid_engine.wasm`. Loader
`src/lib/simulation/wasm-loader.ts` akan memakai WASM bila artefak tersedia,
atau kembali ke engine TypeScript dengan status `fallback` bila tidak. Detail
kontrak dan cara menjalankan tes ada di [engine-cpp/README.md](engine-cpp/README.md).

## Menjalankan backend

Lihat [backend/README.md](backend/README.md) untuk konfigurasi PostgreSQL, migrasi, endpoint, dan perintah menjalankan API. URL origin frontend dapat diatur melalui `FRONTEND_ORIGIN`; nilai lokal bawaan adalah `http://localhost:3000`.

## Deploy Vercel

Frontend produksi: <https://garducilik.vercel.app> (project Vercel `garducilik`).

```powershell
vercel link --yes --project garducilik
vercel deploy --prod --yes
```

Saat ini deployment berjalan dalam mode simulasi lokal karena backend belum
memiliki URL publik. Setelah backend di-host, tambahkan environment variable
produksi berikut lalu redeploy:

```powershell
vercel env add NEXT_PUBLIC_API_BASE_URL production
vercel deploy --prod --yes
```

Di sisi backend, set `FRONTEND_ORIGIN=https://garducilik.vercel.app` agar CORS
mengizinkan origin produksi. Jangan menaruh `JWT_SECRET`, kredensial database,
atau rahasia backend lain di environment frontend.

`.vercelignore` mengecualikan `backend/` dan `engine-cpp/` dari upload. Artefak
`public/wasm/` hanya ikut ter-deploy bila dibangun lokal sebelum `vercel deploy`;
deployment dari Git akan memakai fallback engine TypeScript karena artefak WASM
tidak di-commit.

## Batas model edukasi

Model beban, faktor daya, arus awal, panas kabel, dan trip MCB disederhanakan serta dipercepat agar mudah diamati dalam permainan. Hasilnya bukan panduan untuk merancang, memasang, memeriksa, atau mengambil keputusan keselamatan instalasi listrik nyata. Validasi hasil di backend hanya pemeriksaan kewajaran atas data yang dikirim klien, bukan proteksi anti-cheat penuh.

## Struktur utama

```text
src/
  app/                 Halaman Next.js, metadata PWA, halaman offline
  components/          Dashboard, kontrol, visualisasi, dan mode kelas
  data/                Level lokal
  hooks/               Lifecycle simulasi di browser
  lib/                 API client, format, dan engine TypeScript
  types/               Kontrak tipe simulasi
engine-cpp/            Engine C++/WebAssembly dan binding Embind
public/sw.js           Service worker
backend/               API Go/Fiber dan migrasi PostgreSQL
```
