import { DEFAULT_SIMULATION_CONFIG } from "./simulation/defaults";
import { INITIAL_LEVEL } from "../data/levels";
import type { ApplianceDefinition, LevelConfig, RoomId } from "../types/grid";

export interface ApiScenario {
  id: string;
  creator_id?: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  is_public: boolean;
  grid_config: {
    mcb_limit_va: number;
    duration_seconds: number;
    target_max_kwh: number;
    has_solar: boolean;
    appliances: {
      id: string;
      watt: number;
      inrush: number;
      standby_watt?: number;
    }[];
  };
}

export interface ApiSession {
  token: string;
  scenarioId: string;
  classroomId?: string;
}

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? `Permintaan gagal (${response.status})`);
  }

  return response.json() as Promise<T>;
}

const knownAppliances = new Map(
  INITIAL_LEVEL.appliances.map((appliance) => [appliance.id, appliance]),
);

const fallbackRoomByIndex: readonly RoomId[] = [
  "living-room",
  "kitchen",
  "bedroom",
  "bathroom",
  "terrace",
  "garage",
];

export function scenarioToLevel(scenario: ApiScenario): LevelConfig {
  const appliances: ApplianceDefinition[] = scenario.grid_config.appliances.map(
    (item, index) => {
      const known = knownAppliances.get(item.id);
      return {
        id: item.id,
        name: known?.name ?? item.id.replaceAll("-", " "),
        category: known?.category ?? "utility",
        room: known?.room ?? fallbackRoomByIndex[index % fallbackRoomByIndex.length],
        ratedPowerW: item.watt,
        powerFactor: known?.powerFactor ?? 1,
        standbyPowerW: item.standby_watt ?? 0,
        inrush:
          item.inrush > 1
            ? {
                multiplier: item.inrush,
                durationSeconds: known?.inrush?.durationSeconds ?? 1.5,
              }
            : undefined,
        initiallyOn: known?.initiallyOn ?? false,
        essential: known?.essential ?? false,
        educationNote: known?.educationNote,
      };
    },
  );
  const requiredApplianceIds = appliances
    .filter((appliance) => appliance.essential)
    .map((appliance) => appliance.id);

  return {
    ...INITIAL_LEVEL,
    id: scenario.id,
    name: scenario.title,
    description: `Skenario ${scenario.difficulty} dari kelas. Batas simulasi ${scenario.grid_config.mcb_limit_va.toLocaleString("id-ID")} VA.`,
    mission: {
      title: scenario.title,
      description: `Selesaikan simulasi selama ${scenario.grid_config.duration_seconds} detik, jaga energi di bawah ${scenario.grid_config.target_max_kwh} kWh, dan hindari MCB trip.`,
      targetDurationSeconds: scenario.grid_config.duration_seconds,
      targetMaxEnergyKwh: scenario.grid_config.target_max_kwh,
      targetMaxTrips: 0,
      requiredApplianceIds:
        requiredApplianceIds.length > 0
          ? requiredApplianceIds
          : appliances.slice(0, 1).map((appliance) => appliance.id),
    },
    meterCapacityVA: scenario.grid_config.mcb_limit_va,
    breakerRatingVA: scenario.grid_config.mcb_limit_va,
    appliances,
    simulation: DEFAULT_SIMULATION_CONFIG,
  };
}
