import { describe, expect, it } from "vitest";
import { INITIAL_LEVEL } from "../data/levels";
import { scenarioToLevel, type ApiScenario } from "./api";

const scenario: ApiScenario = {
  id: "scenario-1",
  title: "Rumah 900 VA",
  difficulty: "easy",
  is_public: true,
  grid_config: {
    mcb_limit_va: 900,
    duration_seconds: 90,
    target_max_kwh: 0.04,
    has_solar: false,
    appliances: [
      { id: "fridge", watt: 130, inrush: 3, standby_watt: 0 },
      { id: "lampu-unik", watt: 12, inrush: 1 },
    ],
  },
};

describe("scenarioToLevel", () => {
  it("adapts API configuration to the local engine contract", () => {
    const level = scenarioToLevel(scenario);

    expect(level.id).toBe("scenario-1");
    expect(level.meterCapacityVA).toBe(900);
    expect(level.mission.targetDurationSeconds).toBe(90);
    expect(level.mission.targetMaxEnergyKwh).toBe(0.04);
    expect(level.appliances[0]).toMatchObject({
      name: "Kulkas",
      room: "kitchen",
      ratedPowerW: 130,
      inrush: { multiplier: 3, durationSeconds: 1.5 },
    });
    expect(level.appliances[1]).toMatchObject({
      name: "lampu unik",
      room: "kitchen",
      category: "utility",
    });
  });

  it("keeps the local level configuration independent", () => {
    expect(scenarioToLevel(scenario).appliances[0]).not.toBe(
      INITIAL_LEVEL.appliances.find((item) => item.id === "fridge"),
    );
    expect(INITIAL_LEVEL.appliances.find((item) => item.id === "fridge")?.name).toBe("Kulkas");
  });
});
