
Karena inti simulasi fisikanya sudah berjalan di browser via C++ WebAssembly (supaya bebas latency saat kalkulasi 60 FPS), peran Backend di GarduCilik difokuskan pada fitur ekosistem pendidikan yang butuh penyimpanan data persisten, otentikasi, dan kontrol guru (Classroom Mode):

Manajemen Akun & Kelas: Role Siswa dan Guru (membuat kode kelas, memantau progres murid).

Penyimpanan Progres & Leaderboard: Menyimpan skor efisiensi kWh, rekor tanpa MCB trip, dan lencana (badges) ke database.

Custom Scenario Builder: Guru bisa menyusun soal/skenario rumah sendiri (misalnya: "Rumah 900 VA dengan 6 alat elektronik, target hemat di bawah 1.5 kWh") yang disimpan dalam format JSON dan dikirim ke engine C++ WASM di klien.

Validasi Skor (Anti-Cheat Ringan): Memverifikasi log simulasi sebelum masuk ke papan peringkat kelas.

Untuk stack backend-nya, kombinasi Go (Fiber/Gin) atau Node.js/FastAPI dengan PostgreSQL sangat pas. Di bawah ini contoh dokumentasi backend/README.md menggunakan Go (Fiber) + PostgreSQL (bisa disesuaikan kalau mau pakai FastAPI atau Express/NestJS).

Dokumentasi Backend (backend/README.md)
Markdown

# ⚙️ GarduCilik Backend API

Layanan backend RESTful API untuk **GarduCilik** yang menangani manajemen pengguna (Siswa & Guru), progres level, *leaderboard* efisiensi energi, serta distribusi skenario simulasi kustom untuk mode kelas.

> **Catatan Arsitektur:** Kalkulasi fisika kelistrikan *real-time* (60 FPS) dieksekusi di sisi klien melalui **C++ WebAssembly (`grid_engine.wasm`)**. Backend bertugas mengelola persistensi data, manajemen kelas, dan validasi hasil simulasi.

---

## 🛠️ Tech Stack

* **Language & Framework:** Go (Golang) 1.23+ dengan **Fiber v2** (atau Gin)
* **Database:** PostgreSQL 17 (memanfaatkan tipe data `JSONB` untuk konfigurasi skenario & denah level)
* **Authentication:** JWT (*JSON Web Token*) + PIN Kode Kelas untuk akses cepat siswa SD/SMP
* **Documentation:** Swagger / OpenAPI 3.0

---

## 🏗️ Arsitektur & Alur Data

```text
+-----------------------+       REST API (JSON)       +-----------------------+
|   Next.js Frontend    | <-------------------------> |   Go Backend API      |
|  + C++ WASM Engine    |                             |  - Auth & Role Guard  |
+-----------------------+                             |  - Scenario Provider  |
            |                                         |  - Score Validator    |
            | Load Config JSON                        +-----------+-----------+
            v                                                     |
  [ Inisialisasi GridEngine ]                                     v
  (Batas VA, Daftar Alat, Cuaca)                      +-----------------------+
                                                      |    PostgreSQL 17      |
                                                      |  - users & classrooms |
                                                      |  - scenarios (JSONB)  |
                                                      |  - session_logs       |
                                                      +-----------------------+
📁 Struktur Direktori (backend/)
Plaintext


backend/
├── cmd/
│   └── api/
│       └── main.go                # Entry point server & dependency injection
├── internal/
│   ├── config/
│   │   └── env.go                 # Konfigurasi environment & koneksi DB
│   ├── models/
│   │   ├── user.go                # Model User (Student / Teacher)
│   │   ├── classroom.go           # Model Kelas & Kode Gabung
│   │   ├── scenario.go            # Model Skenario Level (JSONB config)
│   │   └── session_log.go         # Model Riwayat & Skor Simulasi
│   ├── handlers/
│   │   ├── auth_handler.go        # Login Guru & Join Kelas Siswa (PIN)
│   │   ├── scenario_handler.go    # CRUD skenario level kustom
│   │   └── progress_handler.go    # Submit hasil simulasi & Leaderboard
│   ├── services/
│   │   └── validator_service.go   # Validasi logika skor & deteksi anomali kWh
│   └── middleware/
│       └── jwt_auth.go            # Proteksi endpoint & Role-Based Access
├── migrations/
│   └── 001_init_schema.sql        # Skema tabel PostgreSQL
├── .env.example
├── go.mod
└── README.md
🗄️ Skema Database (PostgreSQL)
SQL


-- 1. Tabel Pengguna (Guru & Siswa)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE, -- Nullable untuk akun siswa via PIN kelas
    password_hash TEXT,
    role VARCHAR(20) CHECK (role IN ('teacher', 'student')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Kelas (Mode Sekolah)
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    join_code VARCHAR(8) UNIQUE NOT NULL, -- Contoh: "PLN-402"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Skenario Level (Bawaan & Kustom Guru)
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    is_public BOOLEAN DEFAULT TRUE,
    -- Konfigurasi langsung di-parse oleh C++ WASM Engine
    grid_config JSONB NOT NULL,
    /* Contoh isi grid_config:
       {
         "mcb_limit_va": 1300,
         "duration_seconds": 180,
         "target_max_kwh": 0.45,
         "has_solar": false,
         "appliances": [
           {"id": "kulkas", "watt": 120, "inrush": 2.5},
           {"id": "setrika", "watt": 350, "inrush": 1.0},
           {"id": "pompa_air", "watt": 250, "inrush": 3.0}
         ]
       }
    */
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Hasil Simulasi & Skor Siswa
CREATE TABLE session_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    total_kwh_used NUMERIC(8, 4) NOT NULL,
    trip_count INT DEFAULT 0,
    stars_earned INT CHECK (stars_earned BETWEEN 0 AND 3),
    score INT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);
🔌 Daftar Endpoint Utama API
Authentication & Classroom
Method	Endpoint	Akses	Deskripsi
POST	/api/v1/auth/teacher/login	Publik	Login guru menggunakan email & password.
POST	/api/v1/auth/student/join	Publik	Siswa masuk cukup dengan memasukkan name dan join_code kelas.
POST	/api/v1/classrooms	Guru	Membuat ruang kelas baru dan generate join_code otomatis.

Scenarios (Level Config)
Method	Endpoint	Akses	Deskripsi
GET	/api/v1/scenarios	Semua	Mengambil daftar level bawaan dan level yang ditugaskan guru.
GET	/api/v1/scenarios/:id	Semua	Mengambil JSON grid_config untuk di-load ke GridEngine (WASM).
POST	/api/v1/scenarios	Guru	Membuat skenario tantangan listrik baru untuk kelas.

Progress & Leaderboard
Method	Endpoint	Akses	Deskripsi
POST	/api/v1/sessions/submit	Siswa	Mengirim hasil simulasi (total_kwh_used, trip_count, durasi) untuk divalidasi dan disimpan.
GET	/api/v1/classrooms/:id/leaderboard	Semua	Menampilkan peringkat siswa paling hemat energi (kWh terendah & 0 trip).

🛡️ Validasi Skor (validator_service.go)
Untuk mencegah manipulasi skor dari sisi klien sebelum masuk ke leaderboard, backend melakukan pemeriksaan kewajaran (sanity check):

Batas Minimum kWh Teoretis: Memastikan total_kwh_used tidak lebih rendah dari konsumsi wajib perangkat yang harus menyala (misal: kulkas wajib menyala sepanjang simulasi).

Konsistensi Durasi: Memastikan waktu penyelesaian tidak lebih cepat dari durasi minimum skenario.

🚀 Menjalankan Server Secara Lokal
1. Konfigurasi Environment
Salin file .env.example menjadi .env:

Bash


cp .env.example .env
Isi variabel berikut:

Cuplikan kode


PORT=8080
DATABASE_URL=postgres://user:password@localhost:5432/garducilik?sslmode=disable
JWT_SECRET=rahasia_super_aman_garducilik
2. Jalankan Migrasi Database & Server
Bash


psql $DATABASE_URL -f migrations/001_init_schema.sql
go mod tidy
go run cmd/api/main.go
Server akan berjalan di http://localhost:8080.


<ElicitationsGroup message="Mau lanjut ke bagian mana?">
  <Elicitation label="Buatkan kode Go (Fiber) untuk handler & validator skor" query="Buatkan implementasi kode Go menggunakan Fiber untuk endpoint submit skor simulasi dan logika validator_service.go di backend GarduCilik."/>
  <Elicitation label="Buatkan kode Next.js + Tailwind yang terhubung dengan C++ WASM" query="Buatkan contoh kode lengkap frontend Next.js dan Tailwind CSS (useGridEngine hook dan halaman arena simulasi) yang me-load konfigurasi dari backend dan menjalankannya di C++ WASM."/>
</ElicitationsGroup>
```
