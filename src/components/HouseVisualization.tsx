import type { ApplianceSnapshot, RoomId } from "../types/grid";
import { ROOM_LABELS } from "../lib/labels";

interface HouseVisualizationProps {
  appliances: readonly ApplianceSnapshot[];
  isPowered: boolean;
}

const ROOM_LAYOUT: readonly {
  id: RoomId;
  x: number;
  y: number;
  width: number;
  height: number;
}[] = [
  { id: "living-room", x: 24, y: 38, width: 225, height: 150 },
  { id: "kitchen", x: 249, y: 38, width: 180, height: 150 },
  { id: "bedroom", x: 24, y: 188, width: 225, height: 142 },
  { id: "bathroom", x: 249, y: 188, width: 180, height: 142 },
];

const ROOM_CENTERS: Record<RoomId, { x: number; y: number }> = {
  "living-room": { x: 136, y: 113 },
  kitchen: { x: 339, y: 113 },
  bedroom: { x: 136, y: 259 },
  bathroom: { x: 339, y: 259 },
  terrace: { x: 429, y: 300 },
  garage: { x: 429, y: 300 },
};

const APPLIANCE_ICON: Record<string, string> = {
  lighting: "✦",
  cooling: "❄",
  motor: "↻",
  kitchen: "♨",
  electronics: "▣",
  utility: "⚡",
};

export function HouseVisualization({
  appliances,
  isPowered,
}: HouseVisualizationProps) {
  const poweredAppliances = appliances.filter(
    (appliance) => appliance.isOn && isPowered,
  );
  const hasPoweredDevices = poweredAppliances.length > 0;

  return (
    <section
      aria-labelledby="house-visualization-heading"
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            Denah interaktif
          </p>
          <h2
            id="house-visualization-heading"
            className="mt-1 text-xl font-semibold text-slate-900"
          >
            Aliran listrik rumah
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          {isPowered
            ? "Pilih saklar di panel kontrol untuk mengubah aliran."
            : "MCB terputus; semua jalur listrik sedang padam."}
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-slate-50 p-2">
        <svg
          viewBox="0 0 470 365"
          role="img"
          aria-labelledby="house-svg-title house-svg-description"
          className="mx-auto block min-w-[430px] max-w-full"
        >
          <title id="house-svg-title">Denah rumah dan jalur listrik</title>
          <desc id="house-svg-description">
            Meter dan MCB menyalurkan listrik ke empat ruangan. Jalur hijau
            berarti listrik mengalir, sedangkan jalur abu-abu berarti padam.
          </desc>

          <path
            d="M72 345 H450 V302 H414 M450 302 V110 H410 M450 206 H207 M450 110 H207"
            fill="none"
            stroke={hasPoweredDevices ? "#10b981" : "#cbd5e1"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={hasPoweredDevices ? "transition-colors" : ""}
          />
          <rect x="18" y="329" width="108" height="28" rx="8" fill="#0f172a" />
          <text x="72" y="347" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">
            Meter + MCB
          </text>

          {ROOM_LAYOUT.map((room) => {
            const roomAppliances = appliances.filter(
              (appliance) => appliance.room === room.id,
            );
            const roomHasPower = roomAppliances.some(
              (appliance) => appliance.isOn && isPowered,
            );

            return (
              <g key={room.id}>
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  rx="14"
                  fill={roomHasPower ? "#ecfdf5" : "white"}
                  stroke={roomHasPower ? "#34d399" : "#cbd5e1"}
                  strokeWidth="2"
                />
                <text
                  x={room.x + 12}
                  y={room.y + 22}
                  fill="#334155"
                  fontSize="12"
                  fontWeight="700"
                >
                  {ROOM_LABELS[room.id]}
                </text>
                {roomAppliances.map((appliance, index) => {
                  const x = room.x + 18 + (index % 3) * 62;
                  const y = room.y + 48 + Math.floor(index / 3) * 48;
                  const isActive = appliance.isOn && isPowered;
                  const accessibleLabel = `${appliance.name}, ${
                    !isPowered ? "listrik terputus" : appliance.isOn ? "menyala" : "mati"
                  }`;

                  return (
                    <g key={appliance.id} aria-label={accessibleLabel}>
                      <circle
                        cx={x + 16}
                        cy={y + 12}
                        r="15"
                        fill={isActive ? "#a7f3d0" : "#e2e8f0"}
                      />
                      <text
                        x={x + 16}
                        y={y + 17}
                        textAnchor="middle"
                        fill={isActive ? "#047857" : "#64748b"}
                        fontSize="14"
                        fontWeight="700"
                      >
                        {APPLIANCE_ICON[appliance.category] ?? "•"}
                      </text>
                      <text
                        x={x + 16}
                        y={y + 37}
                        textAnchor="middle"
                        fill="#475569"
                        fontSize="8"
                      >
                        {appliance.name.length > 12
                          ? `${appliance.name.slice(0, 11)}…`
                          : appliance.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Warna hijau menandakan perangkat menerima listrik; abu-abu menandakan
        perangkat mati atau jalur terputus.
      </p>
    </section>
  );
}
