# GarduCilik

GarduCilik adalah simulasi edukasi berbasis web untuk mengenalkan beban listrik rumah, daya aktif dan daya semu, lonjakan arus awal, konsumsi energi, serta perilaku MCB dalam model sederhana.

## Status aplikasi

- Frontend: Next.js App Router, TypeScript, Tailwind CSS.
- Mesin simulasi yang saat ini berjalan di browser: TypeScript deterministik di `src/lib/simulation/engine.ts`.
- PWA: manifest, ikon, service worker, halaman offline, dan cache aset build.
- Backend kelas: REST API Go/Fiber dan PostgreSQL di `backend/` untuk akun guru/siswa, kelas, skenario, hasil sesi, dan leaderboard.
- Integrasi engine C++/WebAssembly belum tersedia pada source saat ini. README lama menyebut rancangan WASM, tetapi belum ada `engine-cpp/` maupun artefak WASM pada repository.

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

## Menjalankan backend

Lihat [backend/README.md](backend/README.md) untuk konfigurasi PostgreSQL, migrasi, endpoint, dan perintah menjalankan API. URL origin frontend dapat diatur melalui `FRONTEND_ORIGIN`; nilai lokal bawaan adalah `http://localhost:3000`.

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
public/sw.js           Service worker
backend/               API Go/Fiber dan migrasi PostgreSQL
```
