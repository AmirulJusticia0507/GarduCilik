const foundationItems = [
  {
    title: "Next.js App Router",
    description: "Struktur halaman dan layout berada di dalam direktori src/app.",
  },
  {
    title: "TypeScript strict",
    description: "Pemeriksaan tipe ketat aktif untuk kontrak engine dan komponen UI.",
  },
  {
    title: "Tailwind CSS v4",
    description: "Styling utility-first siap dipakai untuk panel meter dan rumah interaktif.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="text-sm font-semibold tracking-[0.2em] text-grid-700 uppercase">
          GarduCilik
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Simulasi energi rumah yang aman untuk belajar
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
          Fondasi aplikasi sudah siap. Tahap berikutnya adalah model domain
          simulasi, engine beban listrik, lalu antarmuka meteran dan rumah
          interaktif.
        </p>
      </header>

      <section aria-labelledby="fondasi-heading" className="space-y-4">
        <h2
          id="fondasi-heading"
          className="text-sm font-semibold tracking-wide text-slate-500 uppercase"
        >
          Fondasi terpasang
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {foundationItems.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="rounded-2xl border border-grid-100 bg-grid-50 p-5 text-sm leading-relaxed text-grid-900">
        <strong className="font-semibold">Catatan edukasi:</strong> simulasi ini
        menyederhanakan perilaku kelistrikan untuk tujuan pembelajaran dan bukan
        panduan pemasangan instalasi listrik di dunia nyata.
      </footer>
    </main>
  );
}
