import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mode offline — GarduCilik",
  description:
    "GarduCilik tidak dapat memuat halaman baru saat perangkat sedang offline.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-semibold tracking-[0.2em] text-amber-700 uppercase">
        Mode offline
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Koneksi internet tidak tersedia
      </h1>
      <p className="text-lg leading-relaxed text-slate-600">
        Halaman ini disimpan agar aplikasi tetap bisa dibuka. Simulasi berjalan
        sepenuhnya di browser, tetapi kondisi permainan tidak disimpan dan tidak
        ditampilkan sebagai data waktu nyata saat offline.
      </p>
      <p className="text-sm leading-relaxed text-slate-500">
        Sambungkan kembali perangkat ke internet, lalu muat ulang halaman untuk
        memulai simulasi dari kondisi awal.
      </p>
      {/* Navigasi penuh (bukan client-side) agar service worker dapat
          menyajikan shell dari cache saat offline. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="w-fit rounded-full bg-grid-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-grid-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grid-700"
      >
        Coba buka simulasi
      </a>
    </main>
  );
}
