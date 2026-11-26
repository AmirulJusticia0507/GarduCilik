/**
 * Uji asap artefak WASM di Node.
 *
 * Pemakaian: node tests/wasm_smoke_test.cjs build/grid_engine_node.js
 */

"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");

const modulePath = process.argv[2];

if (!modulePath) {
  console.error("Path modul WASM belum diberikan.");
  process.exit(1);
}

const level = {
  id: "smoke-level",
  name: "Level Uji WASM",
  description: "Level minimal untuk uji asap.",
  mission: {
    title: "Uji",
    description: "Uji",
    targetDurationSeconds: 60,
    targetMaxEnergyKwh: 1,
    targetMaxTrips: 0,
    requiredApplianceIds: [],
  },
  meterCapacityVA: 1300,
  breakerRatingVA: 1300,
  appliances: [
    {
      id: "lamp",
      name: "Lampu",
      category: "lighting",
      room: "living-room",
      ratedPowerW: 100,
      standbyPowerW: 0,
      initiallyOn: false,
      essential: false,
    },
  ],
  simulation: {
    voltageV: 220,
    frequencyHz: 50,
    defaultPowerFactor: 1,
    warningThreshold: 0.8,
    maxStepSeconds: 0.25,
    breaker: {
      tripHeat: 100,
      warmHeat: 35,
      hotHeat: 60,
      criticalHeat: 85,
      heatGainPerSecondAtDoubleLoad: 16,
      overloadExponent: 1,
      coolingPerSecond: 1.2,
    },
  },
};

async function main() {
  const factory = require(path.resolve(modulePath));
  const module = await factory();

  assert.equal(
    typeof module.createGridEngine,
    "function",
    "modul harus mengekspor createGridEngine",
  );

  const engine = module.createGridEngine(JSON.stringify(level));
  assert.equal(typeof engine.advance, "function", "engine harus punya advance");

  const initial = engine.getSnapshot();
  assert.equal(initial.phase, "ready");
  assert.equal(initial.meter.status, "idle");
  assert.equal(initial.appliances.length, 1);

  const switched = engine.setApplianceOn("lamp", true);
  assert.equal(switched.ok, true);
  assert.equal(switched.snapshot.meter.activePowerW, 100);

  for (let index = 0; index < 4; index += 1) {
    engine.advance(0.25);
  }
  const after = engine.getSnapshot();
  assert.ok(
    Math.abs(after.elapsedSeconds - 1) < 1e-9,
    "waktu harus maju satu detik",
  );
  assert.ok(
    Math.abs(after.meter.energyKwh - 100 / 3600000) < 1e-12,
    "energi harus terakumulasi",
  );

  const missing = engine.setApplianceOn("tidak-ada", true);
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "appliance-not-found");

  const events = engine.drainEvents();
  assert.ok(Array.isArray(events), "drainEvents harus mengembalikan array");

  if (typeof engine.delete === "function") {
    engine.delete();
  }

  console.log("Uji asap WASM lulus.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
