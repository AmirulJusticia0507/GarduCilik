import {
  formatApparentPower,
  formatCurrent,
  formatEnergy,
  formatPercent,
  formatPower,
  formatPowerFactor,
} from "../lib/format";
import { METER_STATUS_LABELS } from "../lib/labels";
import type { GridSnapshot, MeterStatus } from "../types/grid";

const meterTones: Record<
  MeterStatus,
  { badge: string; bar: string; message: string }
> = {
  idle: {
    badge: "bg-slate-100 text-slate-700",
    bar: "bg-slate-400",
    message: "Belum ada beban. Nyalakan perangkat untuk memulai simulasi.",
  },
  normal: {
    badge: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
    message: "Beban berada dalam batas aman meteran.",
  },
  warning: {
    badge: "bg-amber-100 text-amber-800",
    bar: "bg-amber-500",
    message:
      "Beban mendekati kapasitas meter. Kurangi perangkat berdaya besar.",
  },
  overload: {
    badge: "bg-orange-100 text-orange-800",
    bar: "bg-orange-500",
    message:
      "Beban melebihi kapasitas meter. Kabel memanas dan MCB dapat trip.",
  },
  tripped: {
    badge: "bg-red-100 text-red-800",
    bar: "bg-red-500",
    message:
      "MCB memutus aliran listrik. Matikan perangkat berlebih lalu reset MCB.",
  },
};

export interface PlnMeterPanelProps {
  snapshot: GridSnapshot;
}

export function PlnMeterPanel({ snapshot }: PlnMeterPanelProps) {
  const { meter } = snapshot;
  const tone = meterTones[meter.status];
  const utilizationPercent = meter.utilizationRatio * 100;
  const clampedPercent = Math.min(100, Math.max(0, utilizationPercent));

  return (
    <section
      aria-labelledby="pln-meter-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            Meteran PLN
          </p>
          <h2
            id="pln-meter-heading"
            className="mt-1 text-xl font-semibold text-slate-900"
          >
            {snapshot.level.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kapasitas {formatApparentPower(meter.capacityVA)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}
        >
          {METER_STATUS_LABELS[meter.status]}
        </span>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-950 px-5 py-4 text-emerald-100 shadow-inner">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
          Energi terpakai
        </p>
        <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
          {formatEnergy(meter.energyKwh)}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-xs font-medium text-slate-500">Daya aktif</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            {formatPower(meter.activePowerW)}
          </dd>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-xs font-medium text-slate-500">Daya semu</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            {formatApparentPower(meter.apparentPowerVA)}
          </dd>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-xs font-medium text-slate-500">Arus</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            {formatCurrent(meter.currentA)}
          </dd>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-xs font-medium text-slate-500">Faktor daya</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            {formatPowerFactor(meter.powerFactor)}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium text-slate-700">Beban / kapasitas</span>
          <span className="font-semibold text-slate-900">
            {formatPercent(utilizationPercent)}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Penggunaan kapasitas meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clampedPercent)}
          aria-valuetext={`${formatPercent(utilizationPercent)} dari kapasitas meter`}
          className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-200 ${tone.bar}`}
            style={{ width: `${clampedPercent}%` }}
          />
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700"
      >
        {tone.message}
      </p>
    </section>
  );
}
