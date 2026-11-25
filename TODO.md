# TODO GarduCilik

Daftar ini disusun dari konsep di `readme.md`. Repository saat ini baru berisi dokumen konsep; tandai task selesai hanya setelah implementasi benar-benar tersedia.

## Task

- [ ] **T1 — Siapkan fondasi aplikasi Next.js**: inisialisasi Next.js App Router, TypeScript, Tailwind CSS, skrip pengembangan/build, dan struktur `src/` dasar.
- [ ] **T2 — Rancang model domain simulasi**: definisikan tipe perangkat, konfigurasi level, status meter/MCB, dan kontrak API TypeScript untuk engine.
- [ ] **T3 — Implementasikan engine simulasi awal**: buat kalkulasi beban VA, power factor, inrush sementara, akumulasi energi, serta model panas dan trip MCB yang parameterisasinya jelas.
- [ ] **T4 — Hubungkan engine ke lifecycle UI**: buat hook `useGridEngine` dengan pembaruan waktu yang stabil, pembersihan animation frame, dan penanganan status simulasi.
- [ ] **T5 — Buat panel kontrol dan meter**: implementasikan meter PLN, indikator konsumsi/kapasitas, saklar perangkat, dan kontrol reset MCB.
- [ ] **T6 — Buat tampilan rumah interaktif**: tampilkan perangkat, jalur aliran listrik, serta status kabel/MCB dengan aksesibilitas dan layout responsif.
- [ ] **T7 — Tambahkan umpan balik edukatif dan misi MVP**: buat modal edukasi untuk kondisi beban berlebih/trip serta skenario level awal 1300 VA.
- [ ] **T8 — Rapikan dokumentasi dan verifikasi rilis lokal**: perbaiki encoding README, sesuaikan instruksi instalasi dengan file yang benar-benar ada, dan jalankan pemeriksaan build yang tersedia.

## Catatan urutan

- Kerjakan task berurutan karena task UI bergantung pada fondasi dan kontrak simulasi.
- Setelah satu task selesai, perbarui statusnya, commit, push ke upstream yang sudah dikonfigurasi, lalu langsung lanjutkan ke task belum selesai berikutnya sesuai `AGENTS.md`.
- Jika push tidak dapat dilakukan atau prasyarat repository belum tersedia, catat blocker; jangan mengklaim push berhasil.
