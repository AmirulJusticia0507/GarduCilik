import { describe, expect, it } from "vitest";
import type { ApplianceDefinition, LevelConfig } from "../../types/grid";
import { DEFAULT_SIMULATION_CONFIG } from "./defaults";
import { createGridEngine } from "./engine";

const lamp: ApplianceDefinition = {
  id: "lamp",
  name: "Lampu Ruang Tamu",
  category: "lighting",
  room: "living-room",
  ratedPowerW: 20,
  powerFactor: 1,
  standbyPowerW: 0,
  initiallyOn: false,
  essential: true,
};

const fridge: ApplianceDefinition = {
  id: "fridge",
  name: "Kulkas",
  category: "cooling",
  room: "kitchen",
  ratedPowerW: 100,
  powerFactor: 0.8,
  standbyPowerW: 5,
  inrush: { multiplier: 3, durationSeconds: 1.5 },
  initiallyOn: false,
  essential: true,
};

const pump: ApplianceDefinition = {
  id: "pump",
  name: "Pompa Air",
  category: "motor",
  room: "bathroom",
  ratedPowerW: 300,
  powerFactor: 0.75,
  standbyPowerW: 0,
  inrush: { multiplier: 4, durationSeconds: 1 },
  initiallyOn: false,
  essential: false,
};

const heater: ApplianceDefinition = {
  id: "heater",
  name: "Pemanas Air",
  category: "utility",
  room: "bathroom",
  ratedPowerW: 1000,
  powerFactor: 1,
  standbyPowerW: 0,
  initiallyOn: false,
  essential: false,
};

const tv: ApplianceDefinition = {
  id: "tv",
  name: "Televisi",
  category: "electronics",
  room: "living-room",
  ratedPowerW: 50,
  powerFactor: 0.9,
  standbyPowerW: 3,
  initiallyOn: false,
  essential: false,
};

const defaultAppliances = [lamp, fridge, pump, heater, tv];

function makeLevel(overrides: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: "test-level",
    name: "Level Uji",
    description: "Level untuk pengujian engine.",
    mission: {
      title: "Misi uji",
      description: "Misi untuk pengujian engine.",
      targetDurationSeconds: 60,
      targetMaxEnergyKwh: 0.1,
      targetMaxTrips: 0,
      requiredApplianceIds: ["lamp"],
    },
    meterCapacityVA: 1300,
    breakerRatingVA: 1300,
    appliances: defaultAppliances,
    ...overrides,
    simulation: {
      ...DEFAULT_SIMULATION_CONFIG,
      ...overrides.simulation,
      breaker: {
        ...DEFAULT_SIMULATION_CONFIG.breaker,
        ...overrides.simulation?.breaker,
      },
    },
  };
}

function advanceFor(
  engine: ReturnType<typeof createGridEngine>,
  seconds: number,
  frameSeconds = 0.25,
): void {
  let elapsed = 0;

  while (elapsed < seconds - 1e-9) {
    const step = Math.min(frameSeconds, seconds - elapsed);
    engine.advance(step);
    elapsed += step;
  }
}

function advanceUntil(
  engine: ReturnType<typeof createGridEngine>,
  predicate: () => boolean,
  maxSeconds = 300,
  frameSeconds = 0.25,
): boolean {
  let elapsed = 0;

  while (elapsed < maxSeconds - 1e-9) {
    if (predicate()) {
      return true;
    }

    engine.advance(frameSeconds);
    elapsed += frameSeconds;
  }

  return predicate();
}

describe("createGridEngine — beban dan daya", () => {
  it("menghitung daya aktif, daya semu, arus, dan power factor perangkat", () => {
    const engine = createGridEngine(
      makeLevel({ appliances: [heater, lamp] }),
    );

    engine.setApplianceOn("heater", true);
    engine.setApplianceOn("lamp", true);
    const snapshot = engine.getSnapshot();

    expect(snapshot.meter.activePowerW).toBeCloseTo(1020, 6);
    expect(snapshot.meter.apparentPowerVA).toBeCloseTo(1020, 6);
    expect(snapshot.meter.currentA).toBeCloseTo(1020 / 220, 6);
    expect(snapshot.meter.powerFactor).toBeCloseTo(1, 6);
    expect(snapshot.meter.status).toBe("normal");
    expect(snapshot.phase).toBe("running");
  });

  it("menghitung daya standby perangkat yang dimatikan tetapi tercolok", () => {
    const engine = createGridEngine(makeLevel({ appliances: [fridge] }));
    const snapshot = engine.getSnapshot();

    expect(snapshot.meter.activePowerW).toBeCloseTo(5, 6);
    expect(snapshot.meter.apparentPowerVA).toBeCloseTo(5 / 0.8, 6);
    expect(snapshot.phase).toBe("running");
    expect(snapshot.appliances[0].standbyPowerW).toBe(5);
    expect(snapshot.appliances[0].isOn).toBe(false);
  });

  it("memakai defaultPowerFactor bila perangkat tidak menentukan nilainya", () => {
    const withoutPowerFactor: ApplianceDefinition = {
      ...lamp,
      id: "tanpa-pf",
      powerFactor: undefined,
      ratedPowerW: 100,
    };
    const engine = createGridEngine(
      makeLevel({ appliances: [withoutPowerFactor] }),
    );

    engine.setApplianceOn("tanpa-pf", true);
    const snapshot = engine.getSnapshot();

    expect(snapshot.meter.apparentPowerVA).toBeCloseTo(100 / 0.85, 6);
    expect(snapshot.appliances[0].powerFactor).toBeCloseTo(0.85, 6);
  });
});

describe("createGridEngine — inrush", () => {
  it("menaikkan daya selama inrush lalu kembali ke daya nominal", () => {
    const engine = createGridEngine(makeLevel({ appliances: [pump] }));

    engine.setApplianceOn("pump", true);
    const duringInrush = engine.getSnapshot();

    expect(duringInrush.appliances[0].inrushActive).toBe(true);
    expect(duringInrush.appliances[0].inrushRemainingSeconds).toBeCloseTo(1, 6);
    expect(duringInrush.appliances[0].activePowerW).toBeCloseTo(1200, 6);
    expect(duringInrush.appliances[0].apparentPowerVA).toBeCloseTo(1600, 6);

    advanceFor(engine, 0.5);
    expect(engine.getSnapshot().appliances[0].activePowerW).toBeCloseTo(
      1200,
      6,
    );

    advanceFor(engine, 0.5);
    const afterInrush = engine.getSnapshot();
    expect(afterInrush.appliances[0].inrushActive).toBe(false);
    expect(afterInrush.appliances[0].inrushRemainingSeconds).toBe(0);
    expect(afterInrush.appliances[0].activePowerW).toBeCloseTo(300, 6);
    expect(afterInrush.appliances[0].apparentPowerVA).toBeCloseTo(400, 6);
  });

  it("mengeluarkan event inrush satu kali saat perangkat dinyalakan", () => {
    const engine = createGridEngine(makeLevel({ appliances: [pump] }));

    engine.setApplianceOn("pump", true);
    engine.setApplianceOn("pump", true);

    const events = engine.drainEvents();
    expect(events.filter((event) => event.type === "inrush-started")).toHaveLength(
      1,
    );
    expect(engine.drainEvents()).toHaveLength(0);
  });
});

describe("createGridEngine — energi", () => {
  it("mengakumulasi energi kWh dari daya aktif", () => {
    const engine = createGridEngine(makeLevel({ appliances: [lamp] }));

    engine.setApplianceOn("lamp", true);
    advanceFor(engine, 1);

    expect(engine.getSnapshot().meter.energyKwh).toBeCloseTo(
      20 / 3_600_000,
      9,
    );
  });

  it("tidak menambah energi saat MCB trip", () => {
    const engine = createGridEngine(
      makeLevel({ appliances: [heater, pump], breakerRatingVA: 1000 }),
    );

    engine.setApplianceOn("heater", true);
    engine.setApplianceOn("pump", true);
    advanceUntil(engine, () => engine.getSnapshot().breaker.isTripped, 120);

    const energyAtTrip = engine.getSnapshot().meter.energyKwh;
    advanceFor(engine, 5);

    expect(engine.getSnapshot().meter.energyKwh).toBeCloseTo(energyAtTrip, 9);
  });
});

describe("createGridEngine — panas dan trip MCB", () => {
  it("tidak trip pada beban yang hanya sedikit melewati rating", () => {
    const engine = createGridEngine(
      makeLevel({
        appliances: [heater, lamp],
        breakerRatingVA: 1000,
        meterCapacityVA: 1000,
      }),
    );

    engine.setApplianceOn("heater", true);
    engine.setApplianceOn("lamp", true);
    advanceFor(engine, 120);

    const snapshot = engine.getSnapshot();
    expect(snapshot.breaker.isTripped).toBe(false);
    expect(snapshot.breaker.wireHeat).toBeGreaterThan(20);
    expect(snapshot.breaker.wireHeat).toBeLessThan(35);
    expect(snapshot.breaker.heatState).toBe("cool");
  });

  it("memanaskan kabel dan trip saat beban berlebih bertahan", () => {
    const engine = createGridEngine(
      makeLevel({
        appliances: [heater, pump],
        breakerRatingVA: 1000,
        meterCapacityVA: 1000,
      }),
    );

    engine.setApplianceOn("heater", true);
    engine.setApplianceOn("pump", true);
    advanceFor(engine, 0.5);
    expect(engine.getSnapshot().breaker.isTripped).toBe(false);
    expect(engine.getSnapshot().breaker.wireHeat).toBeGreaterThan(0);

    const tripped = advanceUntil(
      engine,
      () => engine.getSnapshot().breaker.isTripped,
      120,
    );
    expect(tripped).toBe(true);

    const snapshot = engine.getSnapshot();
    expect(snapshot.phase).toBe("tripped");
    expect(snapshot.breaker.heatState).toBe("tripped");
    expect(snapshot.breaker.wireHeat).toBe(100);
    expect(snapshot.breaker.tripCount).toBe(1);
    expect(snapshot.breaker.canReset).toBe(true);
    expect(snapshot.breaker.lastTripReason).toBe("overload");
    expect(snapshot.meter.activePowerW).toBe(0);
    expect(snapshot.meter.apparentPowerVA).toBe(0);
    expect(
      snapshot.appliances.every((appliance) => appliance.activePowerW === 0),
    ).toBe(true);
  });

  it("menghasilkan event breaker-tripped berisi beban saat trip", () => {
    const engine = createGridEngine(
      makeLevel({
        appliances: [heater, pump],
        breakerRatingVA: 1000,
        meterCapacityVA: 1000,
      }),
    );

    engine.setApplianceOn("heater", true);
    engine.setApplianceOn("pump", true);
    advanceUntil(engine, () => engine.getSnapshot().breaker.isTripped, 120);

    const tripEvent = engine
      .drainEvents()
      .find((event) => event.type === "breaker-tripped");

    expect(tripEvent).toMatchObject({
      type: "breaker-tripped",
      reason: "overload",
      ratingVA: 1000,
    });
    expect(
      tripEvent && "loadVA" in tripEvent ? tripEvent.loadVA : 0,
    ).toBeGreaterThanOrEqual(1400);
  });

  it("mendinginkan kabel saat MCB sudah trip", () => {
    const engine = createGridEngine(
      makeLevel({
        appliances: [heater, pump],
        breakerRatingVA: 1000,
        meterCapacityVA: 1000,
      }),
    );

    engine.setApplianceOn("heater", true);
    engine.setApplianceOn("pump", true);
    advanceUntil(engine, () => engine.getSnapshot().breaker.isTripped, 120);

    advanceFor(engine, 5);
    expect(engine.getSnapshot().breaker.wireHeat).toBeLessThan(100);
  });
});

describe("createGridEngine — peringatan beban", () => {
  it("mengeluarkan satu event saat melewati ambang peringatan", () => {
    const engine = createGridEngine(makeLevel());

    engine.setApplianceOn("heater", true);
    engine.setApplianceOn("tv", true);
    engine.advance(0.25);

    const warningEvents = engine
      .drainEvents()
      .filter((event) => event.type === "overload-warning");
    expect(warningEvents).toHaveLength(1);
    expect(engine.getSnapshot().meter.status).toBe("warning");

    engine.advance(0.25);
    expect(
      engine
        .drainEvents()
        .filter((event) => event.type === "overload-warning"),
    ).toHaveLength(0);
  });

  it("mereset peringatan setelah beban turun di bawah ambang", () => {
    const engine = createGridEngine(makeLevel());

    engine.setApplianceOn("heater", true);
    engine.setApplianceOn("tv", true);
    engine.advance(0.25);
    engine.drainEvents();

    engine.setApplianceOn("tv", false);
    engine.advance(0.25);
    expect(engine.getSnapshot().meter.status).toBe("normal");

    engine.setApplianceOn("tv", true);
    engine.advance(0.25);
    expect(
      engine
        .drainEvents()
        .filter((event) => event.type === "overload-warning"),
    ).toHaveLength(1);
  });
});

describe("createGridEngine — reset dan restart", () => {
  it("menolak reset bila MCB belum trip", () => {
    const engine = createGridEngine(makeLevel());
    const result = engine.resetBreaker();

    expect(result.ok).toBe(false);
    expect(result.error).toBe("breaker-not-tripped");
  });

  it("menutup MCB dan memulai ulang inrush untuk perangkat yang masih menyala", () => {
    const engine = createGridEngine(
      makeLevel({
        appliances: [heater, pump],
        breakerRatingVA: 1000,
        meterCapacityVA: 1000,
      }),
    );

    engine.setApplianceOn("heater", true);
    engine.setApplianceOn("pump", true);
    advanceUntil(engine, () => engine.getSnapshot().breaker.isTripped, 120);
    engine.drainEvents();

    const result = engine.resetBreaker();
    expect(result.ok).toBe(true);
    expect(result.snapshot.breaker.isTripped).toBe(false);
    expect(result.snapshot.breaker.wireHeat).toBe(0);
    expect(result.snapshot.appliances.find((item) => item.id === "pump")).toMatchObject(
      {
        isOn: true,
        inrushActive: true,
      },
    );

    const eventTypes = engine.drainEvents().map((event) => event.type);
    expect(eventTypes).toContain("breaker-reset");
    expect(eventTypes).toContain("inrush-started");
  });

  it("mengembalikan seluruh state ke kondisi awal lewat restartLevel", () => {
    const engine = createGridEngine(
      makeLevel({
        appliances: [heater, pump],
        breakerRatingVA: 1000,
        meterCapacityVA: 1000,
      }),
    );

    engine.setApplianceOn("heater", true);
    engine.setApplianceOn("pump", true);
    advanceUntil(engine, () => engine.getSnapshot().breaker.isTripped, 120);
    engine.drainEvents();

    const result = engine.restartLevel();
    const snapshot = result.snapshot;

    expect(snapshot.elapsedSeconds).toBe(0);
    expect(snapshot.meter.energyKwh).toBe(0);
    expect(snapshot.breaker.wireHeat).toBe(0);
    expect(snapshot.breaker.tripCount).toBe(0);
    expect(snapshot.phase).toBe("ready");
    expect(snapshot.appliances.every((appliance) => !appliance.isOn)).toBe(true);
    expect(engine.drainEvents().map((event) => event.type)).toEqual([
      "level-restarted",
    ]);
  });
});

describe("createGridEngine — batas waktu dan validasi", () => {
  it("membatasi delta waktu ke maxStepSeconds", () => {
    const engine = createGridEngine(makeLevel());

    engine.advance(10);
    expect(engine.getSnapshot().elapsedSeconds).toBeCloseTo(0.25, 6);
  });

  it("mengabaikan delta waktu negatif atau bukan bilangan hingga", () => {
    const engine = createGridEngine(makeLevel());
    const before = engine.getSnapshot();

    engine.advance(-1);
    engine.advance(Number.NaN);

    expect(engine.getSnapshot()).toEqual(before);
  });

  it("mengembalikan error untuk id perangkat yang tidak dikenal", () => {
    const engine = createGridEngine(makeLevel());
    const result = engine.setApplianceOn("tidak-ada", true);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("appliance-not-found");
  });

  it("menolak level dengan id perangkat duplikat", () => {
    expect(() =>
      createGridEngine(
        makeLevel({ appliances: [lamp, { ...lamp, name: "Lampu Lain" }] }),
      ),
    ).toThrow(/duplikat/i);
  });

  it("menolak power factor di luar rentang 0–1", () => {
    expect(() =>
      createGridEngine(
        makeLevel({ appliances: [{ ...lamp, powerFactor: 1.2 }] }),
      ),
    ).toThrow(/power factor/i);
  });

  it("menolak ambang panas MCB yang tidak berurutan", () => {
    expect(() =>
      createGridEngine(
        makeLevel({
          simulation: {
            ...DEFAULT_SIMULATION_CONFIG,
            breaker: {
              ...DEFAULT_SIMULATION_CONFIG.breaker,
              warmHeat: 80,
              hotHeat: 60,
            },
          },
        }),
      ),
    ).toThrow(/ambang panas/i);
  });

  it("menolak level tanpa perangkat", () => {
    expect(() =>
      createGridEngine(makeLevel({ appliances: [] })),
    ).toThrow(/minimal satu perangkat/i);
  });
});
