# GarduCilik Backend API

API REST Go dengan Fiber dan PostgreSQL untuk akun guru/siswa, kelas, skenario publik, hasil simulasi, dan leaderboard. Mesin simulasi tetap berjalan lokal di browser.

## Persyaratan

- Go sesuai versi pada `go.mod`.
- PostgreSQL dengan ekstensi `pgcrypto`.
- Frontend lokal di `http://localhost:3000` atau origin yang diatur pada `FRONTEND_ORIGIN`.

## Menjalankan secara lokal

Dari direktori `backend/`:

```powershell
Copy-Item .env.example .env
# Atur DATABASE_URL dan JWT_SECRET (minimal 32 karakter) di .env
psql $env:DATABASE_URL -f migrations/001_init_schema.sql
go run ./cmd/api
```

Health check: `GET http://localhost:8080/health`.

## Task runner

Backend menyediakan `Taskfile.yml` untuk perintah yang sering dipakai. Instal
Task dari [taskfile.dev](https://taskfile.dev/installation/), lalu jalankan
perintah dari direktori `backend/`:

```powershell
task --list       # daftar task
task migrate      # terapkan migrations/001_init_schema.sql
task run          # jalankan API
task test         # go test ./...
task vet          # go vet ./...
task fmt          # gofmt -w cmd internal
task check        # fmt + test + vet
```

Task `migrate` membutuhkan `DATABASE_URL` pada `.env` atau environment serta
program `psql` yang tersedia di PATH. Perintah Go langsung tetap menjadi
fallback jika Task belum diinstal:

```powershell
go run ./cmd/api
go test ./...
go vet ./...
gofmt -w cmd internal
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/001_init_schema.sql
```

Variabel konfigurasi: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_TTL`, `DB_MAX_CONNS`, dan `FRONTEND_ORIGIN`. CORS mengizinkan origin frontend yang ditentukan; nilai bawaan lokalnya `http://localhost:3000`.

## Endpoint yang tersedia

| Method | Endpoint | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/health` | Publik | Memeriksa koneksi database. |
| POST | `/api/v1/auth/teacher/register` | Publik | Membuat akun guru dan mengembalikan JWT. |
| POST | `/api/v1/auth/teacher/login` | Publik | Login guru dan mengembalikan JWT. |
| POST | `/api/v1/auth/student/join` | Publik | Membuat akun siswa, memasukkan ke kelas dengan kode, dan mengembalikan JWT serta ID kelas. |
| POST | `/api/v1/classrooms` | Guru | Membuat kelas dan kode gabung. |
| GET | `/api/v1/scenarios` | Publik | Daftar skenario publik. |
| GET | `/api/v1/scenarios/:id` | Publik | Detail skenario publik. |
| POST | `/api/v1/scenarios` | Guru | Membuat skenario dari `grid_config`. |
| POST | `/api/v1/sessions/submit` | Siswa | Menyimpan hasil sesi setelah sanity check. |
| GET | `/api/v1/classrooms/:id/leaderboard` | Publik | Membaca peringkat kelas. |

Endpoint yang dilindungi menerima `Authorization: Bearer <token>`. Payload skenario memuat `mcb_limit_va`, `duration_seconds`, `target_max_kwh`, `has_solar`, dan daftar perangkat dengan `id`, `watt`, `inrush`, serta `standby_watt` opsional. Frontend menerjemahkannya menjadi konfigurasi lokal engine.

Payload submit memuat `scenario_id`, `classroom_id` opsional, `total_kwh_used`, `trip_count`, dan `duration_seconds`. Backend menghitung skor dan bintang. Nilai yang dikirim klien tetap dapat dimanipulasi; pemeriksaan ini bukan bukti bahwa satu sesi benar-benar dijalankan dengan konfigurasi tersebut.

## Database

Skema awal berada di `migrations/001_init_schema.sql`: `users`, `classrooms`, `classroom_members`, `scenarios`, dan `session_logs`. Migrasi dapat dijalankan dengan `task migrate` atau langsung menggunakan `psql`.

Jangan gunakan nilai rahasia contoh untuk deployment. Simpan `JWT_SECRET` dan kredensial database di secret store lingkungan deployment.
