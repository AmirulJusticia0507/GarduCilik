# TODO GarduCilik

Rencana kerja berdasarkan `readme.md` dan `dokumentasi_backend.md`. Repository saat ini berisi dokumentasi konsep; implementasi aplikasi, engine, dan API belum tersedia.

## Fondasi

- [x] **T1 — Siapkan fondasi frontend Next.js + PWA**: inisialisasi Next.js App Router, TypeScript, Tailwind CSS, skrip dev/build, dan struktur `src/`. Tambahkan manifest web app, ikon, metadata instalasi, service worker, serta strategi cache shell aplikasi agar fitur simulasi sisi klien dapat dibuka offline.
- [x] **T2 — Tetapkan kontrak data bersama**: definisikan skema konfigurasi level/perangkat, status simulasi, hasil sesi, aturan validasi, dan kontrak TypeScript yang selaras dengan format JSON `grid_config` pada dokumentasi backend.

## Engine simulasi C++ / WebAssembly

- [x] **T3 — Implementasikan engine simulasi C++**: buat struktur `engine-cpp/`, model perangkat dan level, kalkulasi daya aktif/semu, power factor, inrush sementara, akumulasi kWh, panas kabel, serta kurva trip MCB dengan parameter yang terdokumentasi.
- [x] **T4 — Bangun binding dan artefak WebAssembly**: sediakan binding Embind dan build Emscripten yang menghasilkan modul JavaScript/WASM untuk frontend, beserta cara build yang dapat diulang.
- [ ] **T5 — Integrasikan lifecycle engine ke frontend**: buat `useGridEngine` untuk memuat modul WASM, menerapkan konfigurasi JSON, menjalankan tick simulasi, mengelola status dan error, serta membersihkan `requestAnimationFrame` saat komponen dilepas.

## Backend Go / PostgreSQL

- [ ] **T6 — Siapkan fondasi backend Go**: buat struktur `backend/`, aplikasi Fiber, konfigurasi environment, koneksi PostgreSQL, health endpoint, migrasi awal, `.env.example`, dan dokumentasi menjalankan server.
- [ ] **T7 — Implementasikan model akun dan kelas**: buat skema serta endpoint autentikasi guru, siswa bergabung memakai kode kelas, pembuatan kelas, middleware JWT, dan pemeriksaan role.
- [ ] **T8 — Implementasikan layanan skenario**: buat model dan endpoint daftar/detail skenario serta pembuatan skenario guru dengan validasi konfigurasi sebelum JSON dikirim ke engine WASM.
- [ ] **T9 — Implementasikan submit progres dan leaderboard**: buat penyimpanan session log, validasi kewajaran skor/durasi/konsumsi di backend, dan leaderboard kelas.

## Produk dan pengalaman belajar

- [x] **T10 — Buat panel meter dan kontrol perangkat**: tampilkan kapasitas VA, konsumsi, saklar perangkat, status MCB, dan kontrol reset. **Selesai:** dashboard level 1300 VA, meter PLN, indikator kapasitas, saklar perangkat, panel MCB/reset, dan tes komponen.
- [ ] **T11 — Buat visualisasi rumah interaktif**: tampilkan denah/perangkat serta jalur aliran listrik dan status kabel secara responsif dan aksesibel.
- [ ] **T12 — Tambahkan umpan balik edukatif dan misi awal**: jelaskan kondisi overload/trip dan buat skenario awal 1300 VA dengan sasaran belajar yang jelas.
- [ ] **T13 — Hubungkan akun, skenario, dan progres ke frontend**: tambahkan alur guru/siswa, pemuatan skenario API, submit hasil, serta tampilan leaderboard; pastikan simulasi inti tetap dapat dimainkan offline dengan skenario lokal yang tersedia.

## Dokumentasi dan rilis lokal

- [ ] **T14 — Rapikan dokumentasi dan verifikasi aplikasi**: perbaiki encoding README, selaraskan dokumentasi root/backend dengan implementasi, jelaskan batas simulasi edukatif, dan jalankan pemeriksaan build yang sudah dikonfigurasi.

## Catatan urutan dan alur kerja

- Kerjakan task berurutan; kontrak data T2 menjadi acuan bersama untuk C++/WASM dan API backend.
- Backend menyimpan akun, kelas, skenario, dan hasil sesi. Kalkulasi fisika real-time tetap dilakukan oleh engine C++/WASM di browser.
- Validasi skor backend adalah pemeriksaan kewajaran, bukan jaminan anti-cheat penuh karena simulasi dan input awal berada di klien.
- PWA mendukung instalasi dan akses offline. Jangan menampilkan data cache sebagai progres/leaderboard terbaru; tandai status offline dan sinkronkan data saat koneksi tersedia.
- Setelah satu task selesai, perbarui statusnya, commit, push ke upstream yang sudah dikonfigurasi, lalu langsung lanjut ke task belum selesai berikutnya sesuai `AGENTS.md`.
- Jika Git/upstream, kredensial, dependensi, atau layanan yang dibutuhkan menghalangi pekerjaan, catat blocker dan jangan mengklaim task sudah di-push.
