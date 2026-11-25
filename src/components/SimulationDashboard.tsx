"use client";

import { INITIAL_LEVEL } from "../data/levels";
import { useGridEngine } from "../hooks/useGridEngine";
import { ROOM_LABELS, ROOM_ORDER } from "../lib/labels";
import { ApplianceControl } from "./ApplianceControl";
import { McbBreakerBox } from "./McbBreakerBox";
import { PlnMeterPanel } from "./PlnMeterPanel";

export function SimulationDashboard() {
  const {
    snapshot,
    runtimeStatus,
    isPaused,
    togglePaused,
    restartLevel,
    toggleAppliance,
    resetBreaker,
  } = useGridEngine(INITIAL_LEVEL);

  const rooms = ROOM_ORDER.map((room) => ({
    room,
    appliances: snapshot.appliances.filter(
      (appliance) => appliance.room === room,
    ),
  })).filter((group) => group.appliances.length > 0);

  const isTripped = snapshot.phase === "tripped";
  const statusLabel =
    runtimeStatus === "paused"
      ? "Simulasi dijeda"
      : runtimeStatus === "tab-hidden"
        ? "Menunggu tab aktif"
        : isTripped
          ? "MCB turun — aliran listrik terputus"
          : snapshot.meter.status === "overload"
            ? "Beban melebihi kapasitas"
            : "Simulasi berjalan";

  const statusDot =
    runtimeStatus !== "running"
      ? "bg-amber-500"
      : isTripped
        ? "bg-red-500"
        : snapshot.meter.status === "overload"
          ? "bg-orange-500"
          : "bg-emerald-500";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm font-medium text-slate-700"
        >
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${statusDot}`}
          />
          {statusLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={togglePaused}
            aria-pressed={isPaused}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          >
            {isPaused ? "Lanjutkan" : "Jeda"}
          </button>
          <button
            type="button"
            onClick={() => {
              restartLevel();
            }}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Mulai ulang
          </button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <PlnMeterPanel snapshot={snapshot} />

          <section
            aria-labelledby="appliance-control-heading"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                  Panel kontrol
                </p>
                <h2
                  id="appliance-control-heading"
                  className="mt-1 text-xl font-semibold text-slate-900"
                >
                  Saklar Perangkat
                </h2>
              </div>
              <p className="max-w-sm text-sm text-slate-500">
                Nyalakan perangkat satu per satu dan perhatikan daya semu (VA)
                pada meteran.
              </p>
            </div>

            <div className="mt-5 space-y-5">
              {rooms.map((group) => (
                <section
                  key={group.room}
                  aria-labelledby={`room-heading-${group.room}`}
                >
                  <h3
                    id={`room-heading-${group.room}`}
                    className="text-sm font-semibold text-slate-700"
                  >
                    {ROOM_LABELS[group.room]}
                  </h3>
                  <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                    {group.appliances.map((appliance) => (
                      <ApplianceControl
                        key={appliance.id}
                        appliance={appliance}
                        isTripped={isTripped}
                        onToggle={() => {
                          toggleAppliance(appliance.id);
                        }}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-5">
          <McbBreakerBox
            breaker={snapshot.breaker}
            onReset={() => {
              resetBreaker();
            }}
          />

          <section
            aria-labelledby="tip-heading"
            className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"
          >
            <h2
              id="tip-heading"
              className="text-sm font-semibold text-emerald-900"
            >
              Tips energi
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-emerald-900/80">
              Perangkat bermotor seperti kulkas dan pompa air menarik arus awal
              yang jauh lebih besar saat dinyalakan. Hindari menyalakannya
              bersamaan dengan alat pemanas berdaya besar.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
