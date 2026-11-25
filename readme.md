
Markdown

# ⚡ GarduCilik — Interactive Home Energy & Electrical Grid Simulator

**GarduCilik** adalah game simulasi edukasi berbasis web yang dirancang untuk mengajarkan literasi kelistrikan rumah tangga, efisiensi energi, dan keselamatan instalasi listrik kepada anak-anak (usia SD–SMP).

Aplikasi ini menggabungkan **C++ (WebAssembly)** sebagai *physics & electrical simulation engine* yang berjalan secara *real-time* di sisi klien dengan **Next.js (App Router) & Tailwind CSS** untuk antarmuka pengguna yang interaktif, visual, dan responsif.

---

## 🎯 Latar Belakang & Tujuan Edukasi

Anak-anak sering berinteraksi dengan perangkat elektronik di rumah tanpa memahami konsep kapasitas daya (VA), lonjakan arus awal (*inrush current*), penyebab MCB turun (*jeglek*), maupun risiko bahaya kelistrikan. **GarduCilik** mengubah konsep abstrak tersebut menjadi simulasi visual interaktif:

1. **Manajemen Beban Daya:** Memahami batas kapasitas meteran PLN (900 VA, 1300 VA, 2200 VA) dan cara mengatur jadwal penggunaan alat berdaya besar.
2. **Fenomena *Inrush Current*:** Mempelajari mengapa perangkat bermotor listrik (kulkas, pompa air, AC) menarik daya sesaat jauh lebih tinggi saat pertama kali dinyalakan.
3. **Kurva Termal & Magnetik MCB:** Memahami bahwa MCB tidak langsung memutus arus pada beban berlebih tipis, melainkan memanas secara bertahap sebelum *trip*.
4. **Efisiensi & Energi Terbarukan:** Mengelola penggunaan energi harian (kWh), mendeteksi pemborosan daya, serta menyeimbangkan suplai panel surya (*solar panel*) dan baterai.

---

## 🏗️ Arsitektur Sistem

GarduCilik menggunakan arsitektur **Zero-Backend Compute**, di mana seluruh kalkulasi fisika kelistrikan dieksekusi langsung di browser melalui WebAssembly (`.wasm`) dengan performa mendekati *native*.

```text
+-------------------------------------------------------------------+
|                        Browser Client                             |
|                                                                   |
|  +-----------------------------+   +---------------------------+  |
|  |   Next.js + Tailwind CSS    |   |   HTML5 Canvas / SVG      |  |
|  |  - Meteran kWh & Beban VA   |   |  - Denah Rumah 2D         |  |
|  |  - Saklar MCB & Kontrol     |   |  - Animasi Aliran Arus    |  |
|  |  - Modal Edukasi & Misi     |   |  - Indikator Panas Kabel  |  |
|  +--------------+--------------+   +-------------+-------------+  |
|                 |                                |                |
|                 +---------------+----------------+                |
|                                 | (60 FPS Loop / Embind API)      |
|                                 v                                 |
|  +-------------------------------------------------------------+  |
|  |             C++ Simulation Engine (WebAssembly)             |  |
|  |  - Kalkulasi Daya Aktif (Watt) & Daya Semu (VA)             |  |
|  |  - Simulasi Inrush Current & Power Factor                   |  |
|  |  - Akumulasi Suhu Kabel & Logika Trip MCB                   |  |
|  |  - Simulasi Solar Panel & State of Charge (SoC) Baterai     |  |
|  +-------------------------------------------------------------+  |
+-------------------------------------------------------------------+
🛠️ Tech Stack
Simulation Core: C++17, Emscripten SDK (emcc + embind)

Frontend Framework: Next.js 15+ (App Router, TypeScript)

Styling & UI: Tailwind CSS, Lucide Icons

2D Rendering: HTML5 Canvas API / Interactive SVG

📁 Struktur Direktori
Plaintext


gardu-cilik/
├── engine-cpp/                    # Source code engine simulasi C++
│   ├── include/
│   │   ├── GridEngine.hpp         # Deklarasi kelas utama simulator
│   │   └── Models.hpp             # Struct Appliance, SolarSystem, LevelConfig
│   ├── src/
│   │   ├── GridEngine.cpp         # Implementasi kalkulasi beban, suhu, & MCB
│   │   └── bindings.cpp           # Binding C++ ke JavaScript via Embind
│   └── build.sh                   # Script kompilasi ke WebAssembly
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout aplikasi
│   │   └── page.tsx               # Halaman utama arena simulasi
│   ├── components/
│   │   ├── HouseViewport.tsx      # Visualisasi ruangan & aliran listrik
│   │   ├── PlnMeterPanel.tsx      # UI Meteran kWh digital & indikator VA
│   │   ├── McbBreakerBox.tsx      # Panel saklar MCB & bar suhu kabel
│   │   ├── ApplianceControl.tsx   # Kartu kontrol perangkat elektronik
│   │   └── EduFeedbackModal.tsx   # Popup penjelasan edukatif saat trip/misi selesai
│   ├── hooks/
│   │   └── useGridEngine.ts       # Custom hook lifecycle WASM & requestAnimationFrame
│   └── types/
│       └── grid.d.ts              # Definisi tipe TypeScript untuk modul WASM
├── public/
│   └── wasm/
│       ├── grid_engine.js         # Glue code hasil kompilasi Emscripten
│       └── grid_engine.wasm       # Binary WebAssembly
├── package.json
└── README.md
⚙️ Spesifikasi Model Fisika (C++ Engine)
Konversi Daya Aktif ke Daya Semu:

VA
total
=
∑
(
P
base
×
M
inrush
)
PF
VA 
total

 = 
PF
∑(P 
base

 ×M 
inrush

 )

 
P
base
P 
base

 : Daya nominal perangkat (Watt)

M
inrush
M 
inrush

 : Pengali lonjakan awal (misal 
2.5
×
2.5× selama 1.5 detik pertama untuk pompa air/kulkas)

PF
PF: Power Factor rata-rata instalasi rumah tangga (
0.85
0.85)

Simulasi Panas Kabel & Trip MCB:

Jika 
VA
total
>
Batas MCB
VA 
total

 >Batas MCB, variabel wireHeat (
0
−
100
0−100) meningkat secara proporsional terhadap rasio kelebihan beban.

Jika wireHeat >= 100, status isTripped berubah menjadi true dan seluruh aliran daya terputus hingga pemain menurunkan beban dan menekan saklar reset MCB.

Akumulasi Konsumsi Energi:

Δ
kWh
=
P
total
1000
×
Δ
t
3600
ΔkWh= 
1000
P 
total

 

 × 
3600
Δt

 
🚀 Panduan Instalasi & Pengembangan Lokal
Prasyarat
Node.js v20 atau lebih baru

Emscripten SDK (emsdk) terinstal dan aktif di terminal (emcc -v)

1. Clone Repositori
Bash


git clone [https://github.com/username/gardu-cilik.git](https://github.com/username/gardu-cilik.git)
cd gardu-cilik
2. Kompilasi Engine C++ ke WebAssembly
Bash


cd engine-cpp
chmod +x build.sh
./build.sh
cd ..
Output akan otomatis tersimpan ke public/wasm/grid_engine.js dan public/wasm/grid_engine.wasm.

3. Jalankan Frontend Next.js
Bash


npm install
npm run dev
Buka http://localhost:3000 di browser untuk mulai memainkan simulasi.

🗺️ Roadmap Pengembangan
[x] Fase 1 (MVP): Kalkulasi beban dasar, simulasi inrush current, kurva trip MCB, dan denah rumah 1 lantai (batas 1300 VA).

[ ] Fase 2 (Solar & Baterai): Integrasi panel surya atap, indikator cuaca dinamis (cerah/berawan/hujan), dan manajemen baterai cadangan.

[ ] Fase 3 (Mode Detektif Energi): Tantangan berbasis waktu untuk mematikan perangkat standby (vampire power) dan kebocoran arus.

[ ] Fase 4 (Mode Kelas / Guru): Fitur pembuatan skenario kustom oleh guru dan papan peringkat efisiensi energi antarsiswa.

📄 Lisensi
Didistribusikan di bawah lisensi MIT License. Lihat LICENSE untuk informasi lebih lanjut.


<ElicitationsGroup message="Mau langsung lanjut ke implementasi kodenya?">
  <Elicitation label="Buatkan kode Next.js + Tailwind (useGridEngine.ts & UI Meteran)" query="Buatkan implementasi lengkap custom hook useGridEngine.ts dan komponen UI Meteran PLN + Saklar MCB menggunakan Next.js TypeScript dan Tailwind CSS."/>
  <Elicitation label="Buatkan dokumen Game Design Document (GDD) detail level 1-5" query="Buatkan Game Design Document (GDD) lengkap berisi daftar perangkat elektronik, nilai Watt, aturan inrush current, dan skenario misi untuk Level 1 sampai Level 5 di GarduCilik."/>
</ElicitationsGroup>
```
