import { SimulationDashboard } from "../components/SimulationDashboard";
import { INITIAL_LEVEL } from "../data/levels";

export default function Home() {
  return (
    <main className="min-h-dvh bg-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-emerald-700 uppercase">
              GarduCilik
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {INITIAL_LEVEL.name}
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
              {INITIAL_LEVEL.description}
            </p>
          </div>
          <p className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
            Level 1 · 1.300 VA
          </p>
        </header>

        <SimulationDashboard />

        <footer className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-relaxed text-slate-600">
          <strong className="font-semibold text-slate-800">
            Catatan edukasi:
          </strong>{" "}
          Simulasi ini menyederhanakan perilaku kelistrikan untuk pembelajaran.
          Nilainya bukan panduan pemasangan, perhitungan, atau keputusan
          keselamatan instalasi listrik di dunia nyata.
        </footer>
      </div>
    </main>
  );
}
