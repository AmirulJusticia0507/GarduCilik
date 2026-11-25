import {
  formatApparentPower,
  formatPower,
} from "../lib/format";
import { ROOM_LABELS } from "../lib/labels";
import type { ApplianceSnapshot } from "../types/grid";

export interface ApplianceControlProps {
  appliance: ApplianceSnapshot;
  isTripped: boolean;
  onToggle: () => void;
}

export function ApplianceControl({
  appliance,
  isTripped,
  onToggle,
}: ApplianceControlProps) {
  const losesPower = isTripped && appliance.isOn;
  const statusLabel = losesPower
    ? "Terputus"
    : appliance.isOn
      ? "Menyala"
      : appliance.standbyPowerW > 0
        ? "Standby"
        : "Mati";

  const detail = losesPower
    ? "Tidak ada aliran daya"
    : appliance.isOn
      ? `${formatPower(appliance.activePowerW)} · ${formatApparentPower(
          appliance.apparentPowerVA,
        )}`
      : appliance.standbyPowerW > 0
        ? `Standby ${formatPower(appliance.standbyPowerW)}`
        : "Tidak menarik daya";

  return (
    <li
      className={`flex h-full flex-col justify-between rounded-2xl border p-4 transition-colors ${
        appliance.isOn
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {ROOM_LABELS[appliance.room]}
          </p>
          <h4 className="mt-1 truncate font-semibold text-slate-900">
            {appliance.name}
          </h4>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={appliance.isOn}
          aria-label={`${
            appliance.isOn ? "Matikan" : "Nyalakan"
          } ${appliance.name}`}
          onClick={onToggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
            appliance.isOn ? "bg-emerald-600" : "bg-slate-300"
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              appliance.isOn ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            losesPower
              ? "bg-red-100 text-red-800"
              : appliance.isOn
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {statusLabel}
        </span>
        {appliance.inrushActive ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            Arus awal
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm tabular-nums text-slate-600">{detail}</p>
      {appliance.isOn && !losesPower ? (
        <p className="mt-1 text-xs text-slate-500">
          Faktor daya {appliance.powerFactor.toFixed(2)}
        </p>
      ) : null}
    </li>
  );
}
