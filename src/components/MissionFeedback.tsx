import type { GridSnapshot, LevelConfig } from "../types/grid";
import { formatApparentPower, formatEnergy } from "../lib/format";

interface MissionFeedbackProps {
  snapshot: GridSnapshot;
  level: LevelConfig;
}

export function MissionFeedback({ snapshot, level }: MissionFeedbackProps) {
  const mission = level.mission;
  const requiredAppliances = mission.requiredApplianceIds.map(
    (id) => snapshot.appliances.find((appliance) => appliance.id === id),
  );
  const requiredOn = requiredAppliances.every(
    (appliance) => appliance?.isOn,
  );
  const isComplete =
    snapshot.phase !== "tripped" &&
    requiredOn &&
    snapshot.elapsedSeconds >= mission.targetDurationSeconds &&
    snapshot.meter.energyKwh <= mission.targetMaxEnergyKwh &&
    snapshot.breaker.tripCount <= mission.targetMaxTrips;

  const overload = snapshot.meter.status === "overload";
  const tripped = snapshot.phase === "tripped";
  const warning = snapshot.meter.status === "warning";

  const feedback = tripped
    ? {
        title: "MCB terpicu karena beban berlebih",
        message:
          "Dalam simulasi, panas pengaman mencapai batas setelah beban terlalu tinggi. Matikan beberapa perangkat, terutama alat berdaya besar, lalu reset MCB.",
        style: "border-red-200 bg-red-50 text-red-950",
      }
    : overload
      ? {
          title: "Beban sedang melampaui kapasitas",
          message:
            "Daya semu (VA) lebih tinggi daripada kapasitas meter. Kurangi beban sekarang; jika kondisi berlanjut, model panas simulasi dapat memicu MCB.",
          style: "border-orange-200 bg-orange-50 text-orange-950",
        }
      : warning
        ? {
            title: "Beban mendekati batas meter",
            message:
              "Kapasitas hampir penuh. Perangkat bermotor dapat memiliki lonjakan saat mulai menyala, jadi coba nyalakan alat secara bergantian.",
            style: "border-amber-200 bg-amber-50 text-amber-950",
          }
        : isComplete
          ? {
              title: "Misi selesai!",
              message:
                "Perangkat penting menyala, energi masih dalam target, dan MCB tidak pernah turun. Coba nyalakan alat lain satu per satu dan amati perubahan meter.",
              style: "border-emerald-200 bg-emerald-50 text-emerald-950",
            }
          : {
              title: "Lanjutkan misi rumah hemat energi",
              message: requiredOn
                ? "Perangkat penting sudah menyala. Pertahankan beban yang aman dan gunakan energi seperlunya."
                : "Nyalakan lampu ruang tamu, lampu dapur, dan kulkas. Perhatikan lonjakan singkat kulkas saat mulai bekerja.",
              style: "border-sky-200 bg-sky-50 text-sky-950",
            };

  return (
    <section
      aria-labelledby="mission-heading"
      aria-live="polite"
      className={`rounded-3xl border p-5 ${feedback.style}`}
    >
      <p className="text-xs font-bold tracking-[0.18em] uppercase">
        Misi simulasi · {level.meterCapacityVA.toLocaleString("id-ID")} VA
      </p>
      <h2 id="mission-heading" className="mt-2 text-lg font-bold">
        {mission.title}
      </h2>
      <h3 className="mt-3 text-sm font-bold">{feedback.title}</h3>
      <p className="mt-2 text-sm leading-relaxed">
        {feedback.message}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-white/70 p-3">
          <p className="text-xs opacity-70">Waktu misi</p>
          <p className="mt-1 font-bold">
            {Math.floor(snapshot.elapsedSeconds)} / {mission.targetDurationSeconds} dtk
          </p>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <p className="text-xs opacity-70">Daya saat ini</p>
          <p className="mt-1 font-bold">{formatApparentPower(snapshot.meter.apparentPowerVA)}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <p className="text-xs opacity-70">Energi</p>
          <p className="mt-1 font-bold">
            {formatEnergy(snapshot.meter.energyKwh)} / {formatEnergy(mission.targetMaxEnergyKwh)}
          </p>
        </div>
        <div className="col-span-2 rounded-xl bg-white/70 p-3 sm:col-span-1">
          <p className="text-xs opacity-70">MCB turun</p>
          <p className="mt-1 font-bold">{snapshot.breaker.tripCount} kali</p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed opacity-75">
        Model panas dan trip ini disederhanakan untuk pembelajaran, bukan untuk
        menilai instalasi listrik nyata.
      </p>
    </section>
  );
}
