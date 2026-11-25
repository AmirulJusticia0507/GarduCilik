import type {
  BreakerThermalConfig,
  SimulationConfig,
} from "../../types/grid";

/**
 * Parameter termal awal untuk level MVP. Nilai sengaja dipercepat agar
 * pemain dapat mengamati kenaikan panas dan trip MCB dalam hitungan detik,
 * bukan menit seperti perangkat nyata.
 */
export const DEFAULT_BREAKER_THERMAL_CONFIG: BreakerThermalConfig = {
  tripHeat: 100,
  warmHeat: 35,
  hotHeat: 60,
  criticalHeat: 85,
  heatGainPerSecondAtDoubleLoad: 16,
  overloadExponent: 1,
  coolingPerSecond: 1.2,
};

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  voltageV: 220,
  frequencyHz: 50,
  defaultPowerFactor: 0.85,
  warningThreshold: 0.8,
  maxStepSeconds: 0.25,
  breaker: DEFAULT_BREAKER_THERMAL_CONFIG,
};
