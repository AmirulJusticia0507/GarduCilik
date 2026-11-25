# GarduCilik Backend API

Backend REST API menggunakan Go, Fiber, dan PostgreSQL.

## Menjalankan lokal

```powershell
Copy-Item .env.example .env
# isi DATABASE_URL dan JWT_SECRET di .env
psql $env:DATABASE_URL -f migrations/001_init_schema.sql
go run ./cmd/api
```

Health check tersedia di `GET /health`. Endpoint API menggunakan prefix `/api/v1`.

Backend hanya menyimpan konfigurasi skenario dan hasil sesi. Kalkulasi real-time
tetap dilakukan oleh engine klien; validasi submit adalah sanity check, bukan
jaminan anti-cheat penuh.
