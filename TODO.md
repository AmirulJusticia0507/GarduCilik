# TODO GarduCilik

Rencana kerja berdasarkan `readme.md` dan `dokumentasi_backend.md`. Implementasi frontend Next.js/PWA, engine TypeScript, engine C++/WASM, dan API Go sudah tersedia; artefak WASM dibangun lokal dan tidak di-commit.

## Fondasi

- [x] **T1 — Siapkan fondasi frontend Next.js + PWA**: inisialisasi Next.js App Router, TypeScript, Tailwind CSS, skrip dev/build, dan struktur `src/`. Tambahkan manifest web app, ikon, metadata instalasi, service worker, serta strategi cache shell aplikasi agar fitur simulasi sisi klien dapat dibuka offline.
- [x] **T2 — Tetapkan kontrak data bersama**: definisikan skema konfigurasi level/perangkat, status simulasi, hasil sesi, aturan validasi, dan kontrak TypeScript yang selaras dengan format JSON `grid_config` pada dokumentasi backend.

## Engine simulasi C++ / WebAssembly

- [x] **T3 — Implementasikan engine simulasi C++**: buat struktur `engine-cpp/`, model perangkat dan level, kalkulasi daya aktif/semu, power factor, inrush sementara, akumulasi kWh, panas kabel, serta kurva trip MCB dengan parameter yang terdokumentasi. **Selesai:** `engine-cpp/src/grid_engine.h`/`grid_engine.cpp` memuat validasi konfigurasi, snapshot, event, trip/reset, dan restart; tes native ada di `engine-cpp/tests/engine_test.cpp`.
- [x] **T4 — Bangun binding dan artefak WebAssembly**: sediakan binding Embind dan build Emscripten yang menghasilkan modul JavaScript/WASM untuk frontend, beserta cara build yang dapat diulang. **Selesai:** `engine-cpp/src/embind_binding.cpp` mengekspor `createGridEngine`; `engine-cpp/build.sh` dan `build.ps1` menghasilkan `public/wasm/grid_engine.js` + `.wasm` (diabaikan Git); kontrak dan cara build didokumentasikan di `engine-cpp/README.md`.
- [x] **T5 — Integrasikan lifecycle engine ke frontend**: buat `useGridEngine` untuk memuat modul WASM, menerapkan konfigurasi JSON, menjalankan tick simulasi, mengelola status dan error, serta membersihkan `requestAnimationFrame` saat komponen dilepas. **Selesai:** loader WASM client-only dengan `locateFile`, konfigurasi JSON, status `loading/ready/fallback/error`, fallback engine TypeScript yang eksplisit saat artefak belum tersedia, RAF pause/visibility, dan cleanup saat unmount.

## Backend Go / PostgreSQL

- [x] **T6 — Siapkan fondasi backend Go**: buat struktur `backend/`, aplikasi Fiber, konfigurasi environment, koneksi PostgreSQL, health endpoint, migrasi awal, `.env.example`, dan dokumentasi menjalankan server. **Selesai:** `backend/cmd/api`, config/store PostgreSQL, migrasi `001_init_schema.sql`, health check, dan README backend.
- [x] **T6.1 — Tambahkan Taskfile.dev untuk backend**: sediakan `Taskfile.yml` dengan task untuk menjalankan API, menjalankan tes Go, memformat kode, dan menerapkan migrasi PostgreSQL; dokumentasikan instalasi Task dan contoh pemakaiannya. Pertahankan perintah Go langsung sebagai fallback. **Selesai:** `backend/Taskfile.yml` menyediakan `run`, `test`, `vet`, `fmt`, `tidy`, `migrate`, dan `check`; dokumentasi serta fallback CLI ditambahkan di `backend/README.md`.
- [x] **T7 — Implementasikan model akun dan kelas**: buat skema serta endpoint autentikasi guru, siswa bergabung memakai kode kelas, pembuatan kelas, middleware JWT, dan pemeriksaan role. **Selesai:** register/login guru, join siswa via kode, classroom creation, JWT HS256, role guard, dan tabel membership.
- [x] **T8 — Implementasikan layanan skenario**: buat model dan endpoint daftar/detail skenario serta pembuatan skenario guru dengan validasi konfigurasi sebelum JSON dikirim ke engine WASM. **Selesai:** endpoint list/detail/create scenario dan validasi grid config/appliance.
- [x] **T9 — Implementasikan submit progres dan leaderboard**: buat penyimpanan session log, validasi kewajaran skor/durasi/konsumsi di backend, dan leaderboard kelas. **Selesai:** submit session siswa, sanity check terhadap durasi/kWh, perhitungan stars/score, penyimpanan log, dan leaderboard kelas.

## Produk dan pengalaman belajar

- [x] **T10 — Buat panel meter dan kontrol perangkat**: tampilkan kapasitas VA, konsumsi, saklar perangkat, status MCB, dan kontrol reset. **Selesai:** dashboard level 1300 VA, meter PLN, indikator kapasitas, saklar perangkat, panel MCB/reset, dan tes komponen.
- [x] **T11 — Buat visualisasi rumah interaktif**: tampilkan denah/perangkat serta jalur aliran listrik dan status kabel secara responsif dan aksesibel. **Selesai:** denah SVG rumah responsif, label ruangan/perangkat yang dapat dibaca pembaca layar, serta status jalur mengikuti perangkat dan kondisi MCB.
- [x] **T12 — Tambahkan umpan balik edukatif dan misi awal**: jelaskan kondisi overload/trip dan buat skenario awal 1300 VA dengan sasaran belajar yang jelas. **Selesai:** misi rumah 1300 VA dengan perangkat wajib, target 60 detik/0,05 kWh/0 trip, umpan balik overload dan trip, serta penjelasan batas model edukatif.
- [x] **T13 — Hubungkan akun, skenario, dan progres ke frontend**: tambahkan alur guru/siswa, pemuatan skenario API, submit hasil, serta tampilan leaderboard; pastikan simulasi inti tetap dapat dimainkan offline dengan skenario lokal yang tersedia. **Selesai:** UI login/registrasi/join kelas, pembuatan kelas/skenario, adapter JSON API ke engine lokal, submit sesi, leaderboard, status API/offline, CORS terkonfigurasi, dan pendaftaran guru langsung mengembalikan JWT.

## Dokumentasi dan rilis lokal

- [x] **T14 — Rapikan dokumentasi dan verifikasi aplikasi**: perbaiki encoding README, selaraskan dokumentasi root/backend dengan implementasi, jelaskan batas simulasi edukatif, dan jalankan pemeriksaan build yang sudah dikonfigurasi. **Selesai:** README root/backend dan dokumentasi backend kini sesuai implementasi Next.js/PWA, engine TypeScript, dan API Go; batas model dan sifat sanity check dicantumkan; verifikasi typecheck, lint, 50 tes frontend, build produksi, serta tes Go dijalankan.
- [ ] **T15 — Deploy frontend ke Vercel**: siapkan konfigurasi project Next.js untuk Vercel, atur environment variable `NEXT_PUBLIC_API_BASE_URL` ke API yang sudah dideploy, pastikan build dan PWA berjalan pada domain produksi, lalu dokumentasikan langkah deploy dan verifikasi URL live. Backend Go/PostgreSQL harus di-host terpisah; jangan masukkan rahasia backend ke konfigurasi frontend publik. **Blocker:** memerlukan akun/kredensial Vercel dan URL backend yang sudah di-host; jangan deploy atau memasukkan rahasia tanpa konfirmasi pengguna.

## Catatan urutan dan alur kerja

- Kerjakan task berurutan; kontrak data T2 menjadi acuan bersama untuk C++/WASM dan API backend.
- Backend menyimpan akun, kelas, skenario, dan hasil sesi. Kalkulasi fisika real-time tetap dilakukan oleh engine C++/WASM di browser.
- Validasi skor backend adalah pemeriksaan kewajaran, bukan jaminan anti-cheat penuh karena simulasi dan input awal berada di klien.
- PWA mendukung instalasi dan akses offline. Jangan menampilkan data cache sebagai progres/leaderboard terbaru; tandai status offline dan sinkronkan data saat koneksi tersedia.
- Setelah satu task selesai, perbarui statusnya, commit, push ke upstream yang sudah dikonfigurasi, lalu langsung lanjut ke task belum selesai berikutnya sesuai `AGENTS.md`.
- Jika Git/upstream, kredensial, dependensi, atau layanan yang dibutuhkan menghalangi pekerjaan, catat blocker dan jangan mengklaim task sudah di-push.
