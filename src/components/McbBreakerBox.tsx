import { formatApparentPower } from "../lib/format";
import { HEAT_STATE_LABELS } from "../lib/labels";
import type { BreakerHeatState, BreakerSnapshot } from "../types/grid";

const heatTones: Record<BreakerHeatState, { bar: string; badge: string }> = {
  cool: { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
  warm: { bar: "bg-amber-400", badge: "bg-amber-100 text-amber-800" },
  hot: { bar: "bg-orange-500", badge: "bg-orange-100 text-orange-800" },
  critical: { bar: "bg-red-500", badge: "bg-red-100 text-red-800" },
  tripped: { bar: "bg-red-600", badge: "bg-red-100 text-red-800" },
};

export interface McbBreakerBoxProps {
  breaker: BreakerSnapshot;
  onReset: () => void;
}

export function McbBreakerBox({ breaker, onReset }: McbBreakerBoxProps) {
  const tone = heatTones[breaker.heatState];
  const heatPercent = Math.min(100, Math.max(0, breaker.wireHeat));

  return (
    <section
      aria-labelledby="mcb-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            Panel MCB
          </p>
          <h2
            id="mcb-heading"
            className="mt-1 text-xl font-semibold text-slate-900"
          >
            Pengaman Listrik
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Rating {formatApparentPower(breaker.ratingVA)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}
        >
          {HEAT_STATE_LABELS[breaker.heatState]}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium text-slate-700">Panas kabel</span>
          <span className="font-semibold text-slate-900">
            {Math.round(breaker.wireHeat)} / 100
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Panas kabel MCB"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(heatPercent)}
          aria-valuetext={`${Math.round(breaker.wireHeat)} dari 100`}
          className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-200 ${tone.bar}`}
            style={{ width: `${heatPercent}%` }}
          />
        </div>
      </div>

      {breaker.tripCount > 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          Sudah trip {breaker.tripCount} kali pada level ini.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onReset}
        disabled={!breaker.canReset}
        className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
      >
        {breaker.canReset ? "Reset MCB" : "MCB aktif"}
      </button>

      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {breaker.isTripped
          ? "Aliran listrik terputus. Matikan perangkat berlebih terlebih dahulu, lalu reset MCB."
          : "MCB akan trip jika panas kabel mencapai 100. Beban yang hanya sedikit berlebih memanaskan kabel secara perlahan."}
      </p>
    </section>
  );
}
