# Dokumentasi Backend GarduCilik

Dokumen ini mencerminkan implementasi yang ada di `backend/`. Backend mengelola fitur kelas dan penyimpanan; kalkulasi fisika berjalan di browser melalui mesin TypeScript lokal. Integrasi C++/WebAssembly belum ada pada source saat ini.

## Komponen

- Go dan Fiber untuk REST API.
- PostgreSQL untuk akun, kelas, keanggotaan, skenario JSONB, dan hasil sesi.
- JWT bearer token untuk tindakan guru/siswa yang dilindungi.
- Frontend Next.js menggunakan `NEXT_PUBLIC_API_BASE_URL` (bawaan `http://localhost:8080`).
- CORS dibatasi ke `FRONTEND_ORIGIN` (bawaan lokal `http://localhost:3000`).

Rincian pengoperasian dan daftar route dipelihara di [backend/README.md](backend/README.md).

## Alur frontend

1. Guru membuat akun atau login, lalu dapat membuat kelas dan kode gabung.
2. Siswa bergabung memakai nama panggilan dan kode kelas.
3. Frontend memuat skenario publik dan mengubah `grid_config` menjadi `LevelConfig` untuk engine lokal.
4. Siswa mengirim durasi, energi, jumlah trip, ID skenario, dan ID kelas setelah simulasi.
5. Backend melakukan pemeriksaan kewajaran, menghitung skor/bintang, menyimpan sesi, dan menyajikan leaderboard.

Level Rumah Hemat Energi tetap tersedia lokal, sehingga permainan inti tetap bisa dijalankan saat API atau jaringan tidak tersedia. Akun, pembaruan skenario, submit, serta leaderboard membutuhkan koneksi dan tidak dianggap tersimpan offline.

## Model data skenario

```json
{
  "mcb_limit_va": 1300,
  "duration_seconds": 60,
  "target_max_kwh": 0.05,
  "has_solar": false,
  "appliances": [
    { "id": "fridge", "watt": 130, "inrush": 3, "standby_watt": 0 }
  ]
}
```

Frontend memakai metadata perangkat yang dikenal untuk mengisi nama, ruang, kategori, faktor daya, dan durasi inrush. ID yang tidak dikenal tetap dapat dimainkan dengan metadata tampilan bawaan. Backend memvalidasi batas daya, waktu, energi, ID unik, dan pengali inrush dasar.

## Batasan dan keselamatan

Skor dihitung dari data yang dikirim klien. Pemeriksaan durasi dan energi hanya sanity check; pengguna dapat memalsukan nilai, konfigurasi, atau urutan tindakan. Jangan gunakan leaderboard ini sebagai bukti hasil yang tepercaya. Model listrik di aplikasi adalah model belajar yang disederhanakan, bukan alat desain atau panduan keselamatan instalasi nyata.
