import type {
  ApplianceDefinition,
  ApplianceId,
  ApplianceSnapshot,
  BreakerHeatState,
  BreakerSnapshot,
  EngineResult,
  GridEngine,
  GridSnapshot,
  LevelConfig,
  MeterStatus,
  SimulationEvent,
  SimulationPhase,
} from "../../types/grid";

/** Batas langkah integrasi internal agar transisi inrush dan trip tetap halus. */
const MAX_INTEGRATION_STEP_SECONDS = 0.05;
const EPSILON = 1e-9;

interface InternalApplianceState {
  definition: ApplianceDefinition;
  isOn: boolean;
  inrushRemainingSeconds: number;
}

interface EngineState {
  elapsedSeconds: number;
  energyKwh: number;
  wireHeat: number;
  isTripped: boolean;
  tripCount: number;
  lastTripAtSeconds: number | null;
  lastTripReason: "overload" | null;
  warningActive: boolean;
  events: SimulationEvent[];
  appliances: Map<ApplianceId, InternalApplianceState>;
}

interface LoadTotals {
  appliances: ApplianceSnapshot[];
  activePowerW: number;
  apparentPowerVA: number;
  reactivePowerVAR: number;
  currentA: number;
  powerFactor: number;
}

function resolvePowerFactor(
  definition: ApplianceDefinition,
  level: LevelConfig,
): number {
  return definition.powerFactor ?? level.simulation.defaultPowerFactor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function calculateLoads(state: EngineState, level: LevelConfig): LoadTotals {
  const { voltageV } = level.simulation;
  let activePowerW = 0;
  let apparentPowerVA = 0;

  const appliances = [...state.appliances.values()].map<ApplianceSnapshot>(
    (appliance) => {
      const definition = appliance.definition;
      const powerFactor = resolvePowerFactor(definition, level);
      let activePower = 0;
      let inrushActive = false;
      let inrushRemainingSeconds = 0;

      if (!state.isTripped) {
        inrushRemainingSeconds = appliance.inrushRemainingSeconds;

        if (appliance.isOn) {
          inrushActive =
            inrushRemainingSeconds > 0 && definition.inrush !== undefined;
          const multiplier =
            inrushActive && definition.inrush
              ? definition.inrush.multiplier
              : 1;
          activePower = definition.ratedPowerW * multiplier;
        } else {
          activePower = definition.standbyPowerW;
        }
      }

      const apparentPower = activePower / powerFactor;
      activePowerW += activePower;
      apparentPowerVA += apparentPower;

      return {
        id: definition.id,
        name: definition.name,
        category: definition.category,
        room: definition.room,
        isOn: appliance.isOn,
        inrushActive,
        inrushRemainingSeconds,
        activePowerW: activePower,
        apparentPowerVA: apparentPower,
        currentA: apparentPower / voltageV,
        powerFactor: apparentPower > 0 ? activePower / apparentPower : powerFactor,
        standbyPowerW: appliance.isOn ? 0 : definition.standbyPowerW,
      };
    },
  );

  const reactivePowerVAR = Math.sqrt(
    Math.max(0, apparentPowerVA ** 2 - activePowerW ** 2),
  );

  return {
    appliances,
    activePowerW,
    apparentPowerVA,
    reactivePowerVAR,
    currentA: apparentPowerVA / voltageV,
    powerFactor:
      apparentPowerVA > 0 ? clamp(activePowerW / apparentPowerVA, 0, 1) : 1,
  };
}

function derivePhase(state: EngineState, totals: LoadTotals): SimulationPhase {
  if (state.isTripped) {
    return "tripped";
  }

  return totals.activePowerW > 0 || totals.apparentPowerVA > 0
    ? "running"
    : "ready";
}

function determineMeterStatus(
  state: EngineState,
  level: LevelConfig,
  totals: LoadTotals,
): MeterStatus {
  if (state.isTripped) {
    return "tripped";
  }

  if (totals.apparentPowerVA <= 0) {
    return "idle";
  }

  const utilization = totals.apparentPowerVA / level.meterCapacityVA;
  if (utilization > 1) {
    return "overload";
  }

  if (utilization >= level.simulation.warningThreshold) {
    return "warning";
  }

  return "normal";
}

function determineHeatState(
  state: EngineState,
  level: LevelConfig,
): BreakerHeatState {
  if (state.isTripped) {
    return "tripped";
  }

  const { breaker } = level.simulation;
  if (state.wireHeat >= breaker.criticalHeat) {
    return "critical";
  }

  if (state.wireHeat >= breaker.hotHeat) {
    return "hot";
  }

  if (state.wireHeat >= breaker.warmHeat) {
    return "warm";
  }

  return "cool";
}

function buildBreakerSnapshot(
  state: EngineState,
  level: LevelConfig,
): BreakerSnapshot {
  return {
    ratingVA: level.breakerRatingVA,
    wireHeat: state.wireHeat,
    heatState: determineHeatState(state, level),
    isTripped: state.isTripped,
    canReset: state.isTripped,
    tripCount: state.tripCount,
    lastTripAtSeconds: state.lastTripAtSeconds,
    lastTripReason: state.lastTripReason,
  };
}

function buildSnapshot(state: EngineState, level: LevelConfig): GridSnapshot {
  const totals = calculateLoads(state, level);
  const utilizationRatio =
    level.meterCapacityVA > 0
      ? totals.apparentPowerVA / level.meterCapacityVA
      : 0;

  return {
    elapsedSeconds: state.elapsedSeconds,
    phase: derivePhase(state, totals),
    level: {
      id: level.id,
      name: level.name,
      meterCapacityVA: level.meterCapacityVA,
      breakerRatingVA: level.breakerRatingVA,
    },
    meter: {
      voltageV: level.simulation.voltageV,
      frequencyHz: level.simulation.frequencyHz,
      capacityVA: level.meterCapacityVA,
      activePowerW: totals.activePowerW,
      apparentPowerVA: totals.apparentPowerVA,
      reactivePowerVAR: totals.reactivePowerVAR,
      currentA: totals.currentA,
      powerFactor: totals.powerFactor,
      energyKwh: state.energyKwh,
      utilizationRatio,
      status: determineMeterStatus(state, level, totals),
    },
    breaker: buildBreakerSnapshot(state, level),
    appliances: totals.appliances,
  };
}

function recordTrip(
  state: EngineState,
  level: LevelConfig,
  loadVA: number,
): void {
  state.isTripped = true;
  state.tripCount += 1;
  state.lastTripAtSeconds = state.elapsedSeconds;
  state.lastTripReason = "overload";
  state.wireHeat = level.simulation.breaker.tripHeat;
  state.warningActive = false;

  for (const appliance of state.appliances.values()) {
    appliance.inrushRemainingSeconds = 0;
  }

  state.events.push({
    type: "breaker-tripped",
    atSeconds: state.elapsedSeconds,
    reason: "overload",
    loadVA,
    ratingVA: level.breakerRatingVA,
    wireHeat: state.wireHeat,
  });
}

function updateWarning(
  state: EngineState,
  level: LevelConfig,
  loadVA: number,
): void {
  const utilizationRatio = loadVA / level.meterCapacityVA;
  const aboveThreshold = utilizationRatio >= level.simulation.warningThreshold;

  if (aboveThreshold && !state.warningActive) {
    state.warningActive = true;
    state.events.push({
      type: "overload-warning",
      atSeconds: state.elapsedSeconds,
      utilizationRatio,
    });
    return;
  }

  if (!aboveThreshold) {
    state.warningActive = false;
  }
}

function createInitialState(level: LevelConfig): EngineState {
  const appliances = new Map<ApplianceId, InternalApplianceState>();

  for (const definition of level.appliances) {
    const hasActiveInrush = definition.initiallyOn && definition.inrush;
    appliances.set(definition.id, {
      definition,
      isOn: definition.initiallyOn,
      inrushRemainingSeconds: hasActiveInrush
        ? definition.inrush?.durationSeconds ?? 0
        : 0,
    });
  }

  return {
    elapsedSeconds: 0,
    energyKwh: 0,
    wireHeat: 0,
    isTripped: false,
    tripCount: 0,
    lastTripAtSeconds: null,
    lastTripReason: null,
    warningActive: false,
    events: [],
    appliances,
  };
}

function assertFinitePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} harus berupa angka positif.`);
  }
}

function assertNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} tidak boleh negatif.`);
  }
}

function assertProbability(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} harus berada pada rentang 0–1.`);
  }
}

function validateLevel(level: LevelConfig): void {
  if (!level.id.trim() || !level.name.trim()) {
    throw new Error("Level harus memiliki id dan nama.");
  }

  assertFinitePositive("Kapasitas meter", level.meterCapacityVA);
  assertFinitePositive("Rating MCB", level.breakerRatingVA);
  assertFinitePositive("Tegangan", level.simulation.voltageV);
  assertFinitePositive("Frekuensi", level.simulation.frequencyHz);
  assertFinitePositive("maxStepSeconds", level.simulation.maxStepSeconds);
  assertProbability("defaultPowerFactor", level.simulation.defaultPowerFactor);
  assertProbability("warningThreshold", level.simulation.warningThreshold);

  const breaker = level.simulation.breaker;
  assertFinitePositive("tripHeat", breaker.tripHeat);
  assertNonNegative("warmHeat", breaker.warmHeat);
  assertNonNegative("hotHeat", breaker.hotHeat);
  assertNonNegative("criticalHeat", breaker.criticalHeat);
  assertNonNegative(
    "heatGainPerSecondAtDoubleLoad",
    breaker.heatGainPerSecondAtDoubleLoad,
  );
  assertNonNegative("coolingPerSecond", breaker.coolingPerSecond);
  assertFinitePositive("overloadExponent", breaker.overloadExponent);

  if (
    !(
      breaker.warmHeat < breaker.hotHeat &&
      breaker.hotHeat < breaker.criticalHeat &&
      breaker.criticalHeat < breaker.tripHeat
    )
  ) {
    throw new Error(
      "Ambang panas MCB harus berurutan: warm < hot < critical < trip.",
    );
  }

  if (level.appliances.length === 0) {
    throw new Error("Level harus memiliki minimal satu perangkat.");
  }

  const applianceIds = new Set<ApplianceId>();

  for (const appliance of level.appliances) {
    if (!appliance.id.trim()) {
      throw new Error("Setiap perangkat harus memiliki id.");
    }

    if (applianceIds.has(appliance.id)) {
      throw new Error(`Id perangkat duplikat: ${appliance.id}.`);
    }
    applianceIds.add(appliance.id);

    if (!appliance.name.trim()) {
      throw new Error(`Perangkat ${appliance.id} harus memiliki nama.`);
    }

    assertFinitePositive(
      `Daya nominal ${appliance.id}`,
      appliance.ratedPowerW,
    );
    assertNonNegative(
      `Daya standby ${appliance.id}`,
      appliance.standbyPowerW,
    );

    if (appliance.powerFactor !== undefined) {
      assertFinitePositive(
        `Power factor ${appliance.id}`,
        appliance.powerFactor,
      );

      if (appliance.powerFactor > 1) {
        throw new Error(`Power factor ${appliance.id} tidak boleh melebihi 1.`);
      }
    }

    if (appliance.inrush) {
      if (
        !Number.isFinite(appliance.inrush.multiplier) ||
        appliance.inrush.multiplier < 1
      ) {
        throw new Error(
          `Multiplier inrush ${appliance.id} harus minimal 1.`,
        );
      }

      assertFinitePositive(
        `Durasi inrush ${appliance.id}`,
        appliance.inrush.durationSeconds,
      );
    }
  }
}

/**
 * Membuat engine simulasi baru dari konfigurasi level.
 *
 * Engine bersifat sinkron dan deterministik: seluruh perubahan waktu hanya
 * terjadi melalui `advance()`. Konfigurasi divalidasi sekali di awal agar
 * kesalahan data level tidak menghasilkan angka fisika yang tidak masuk akal.
 */
export function createGridEngine(level: LevelConfig): GridEngine {
  validateLevel(level);

  let state = createInitialState(level);

  function step(deltaSeconds: number): void {
    const totals = calculateLoads(state, level);

    if (!state.isTripped) {
      state.energyKwh +=
        (totals.activePowerW * deltaSeconds) / 3_600_000;
    }

    state.elapsedSeconds += deltaSeconds;

    if (!state.isTripped) {
      for (const appliance of state.appliances.values()) {
        if (appliance.isOn && appliance.inrushRemainingSeconds > 0) {
          appliance.inrushRemainingSeconds = Math.max(
            0,
            appliance.inrushRemainingSeconds - deltaSeconds,
          );
        }
      }
    }

    const breaker = level.simulation.breaker;
    const overloadRatio = state.isTripped
      ? 0
      : Math.max(
          0,
          totals.apparentPowerVA / level.breakerRatingVA - 1,
        );
    const heatGain = state.isTripped
      ? 0
      : breaker.heatGainPerSecondAtDoubleLoad *
        Math.pow(overloadRatio, breaker.overloadExponent);
    const cooling =
      breaker.coolingPerSecond * (state.wireHeat / breaker.tripHeat);

    state.wireHeat = clamp(
      state.wireHeat + (heatGain - cooling) * deltaSeconds,
      0,
      breaker.tripHeat,
    );

    if (!state.isTripped && state.wireHeat >= breaker.tripHeat - EPSILON) {
      recordTrip(state, level, totals.apparentPowerVA);
      return;
    }

    if (state.isTripped) {
      state.warningActive = false;
      return;
    }

    updateWarning(state, level, totals.apparentPowerVA);
  }

  return {
    level,

    getSnapshot(): GridSnapshot {
      return buildSnapshot(state, level);
    },

    advance(deltaSeconds: number): GridSnapshot {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
        return buildSnapshot(state, level);
      }

      const maximumStep = level.simulation.maxStepSeconds;
      const integrationStep = Math.min(
        MAX_INTEGRATION_STEP_SECONDS,
        maximumStep,
      );
      let remaining = Math.min(deltaSeconds, maximumStep);

      while (remaining > EPSILON) {
        const currentStep = Math.min(integrationStep, remaining);
        step(currentStep);
        remaining -= currentStep;
      }

      return buildSnapshot(state, level);
    },

    setApplianceOn(id: ApplianceId, isOn: boolean): EngineResult {
      const appliance = state.appliances.get(id);

      if (!appliance) {
        return {
          ok: false,
          error: "appliance-not-found",
          snapshot: buildSnapshot(state, level),
        };
      }

      if (appliance.isOn === isOn) {
        return { ok: true, snapshot: buildSnapshot(state, level) };
      }

      appliance.isOn = isOn;

      if (!isOn) {
        appliance.inrushRemainingSeconds = 0;
      } else if (!state.isTripped && appliance.definition.inrush) {
        appliance.inrushRemainingSeconds =
          appliance.definition.inrush.durationSeconds;
        state.events.push({
          type: "inrush-started",
          atSeconds: state.elapsedSeconds,
          applianceId: id,
        });
      }

      return { ok: true, snapshot: buildSnapshot(state, level) };
    },

    resetBreaker(): EngineResult {
      if (!state.isTripped) {
        return {
          ok: false,
          error: "breaker-not-tripped",
          snapshot: buildSnapshot(state, level),
        };
      }

      state.isTripped = false;
      state.wireHeat = 0;
      state.warningActive = false;
      state.events.push({
        type: "breaker-reset",
        atSeconds: state.elapsedSeconds,
      });

      // Perangkat yang saklarnya masih menyala akan menarik arus awal lagi
      // ketika MCB ditutup. Ini adalah salah satu perilaku yang dipelajari.
      for (const appliance of state.appliances.values()) {
        if (appliance.isOn && appliance.definition.inrush) {
          appliance.inrushRemainingSeconds =
            appliance.definition.inrush.durationSeconds;
          state.events.push({
            type: "inrush-started",
            atSeconds: state.elapsedSeconds,
            applianceId: appliance.definition.id,
          });
        }
      }

      return { ok: true, snapshot: buildSnapshot(state, level) };
    },

    restartLevel(): EngineResult {
      state = createInitialState(level);
      state.events.push({ type: "level-restarted", atSeconds: 0 });
      return { ok: true, snapshot: buildSnapshot(state, level) };
    },

    drainEvents(): readonly SimulationEvent[] {
      const events = state.events;
      state.events = [];
      return events;
    },
  };
}
