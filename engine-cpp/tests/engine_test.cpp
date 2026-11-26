/**
 * Tes native untuk engine C++.
 *
 * Tidak memakai framework eksternal agar dapat dibangun dengan compiler C++17
 * apa pun (atau em++ lalu dijalankan dengan Node).
 */

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <stdexcept>
#include <string>

#include "grid_engine.h"

namespace {

using garducilik::ApplianceDefinition;
using garducilik::GridEngine;
using garducilik::InrushProfile;
using garducilik::LevelConfig;

int failures = 0;
int checks = 0;

void expect(bool condition, const std::string& message) {
  ++checks;
  if (!condition) {
    ++failures;
    std::cerr << "GAGAL: " << message << '\n';
  }
}

void expectNear(double actual, double expected, double tolerance,
                const std::string& message) {
  ++checks;
  if (!std::isfinite(actual) || std::fabs(actual - expected) > tolerance) {
    ++failures;
    std::cerr << "GAGAL: " << message << " (aktual=" << actual
              << ", harapan=" << expected << ")\n";
  }
}

ApplianceDefinition appliance(const std::string& id, double rated_power_w,
                              bool initially_on = false) {
  ApplianceDefinition definition;
  definition.id = id;
  definition.name = id;
  definition.category = "utility";
  definition.room = "living-room";
  definition.rated_power_w = rated_power_w;
  definition.standby_power_w = 0.0;
  definition.initially_on = initially_on;
  definition.essential = false;
  return definition;
}

LevelConfig makeLevel() {
  LevelConfig level;
  level.id = "test-level";
  level.name = "Level Tes";
  level.description = "Level untuk tes engine.";
  level.meter_capacity_va = 1300.0;
  level.breaker_rating_va = 1300.0;

  level.simulation.voltage_v = 220.0;
  level.simulation.frequency_hz = 50.0;
  level.simulation.default_power_factor = 1.0;
  level.simulation.warning_threshold = 0.8;
  level.simulation.max_step_seconds = 0.25;
  level.simulation.breaker.trip_heat = 100.0;
  level.simulation.breaker.warm_heat = 35.0;
  level.simulation.breaker.hot_heat = 60.0;
  level.simulation.breaker.critical_heat = 85.0;
  level.simulation.breaker.heat_gain_per_second_at_double_load = 16.0;
  level.simulation.breaker.overload_exponent = 1.0;
  level.simulation.breaker.cooling_per_second = 1.2;

  level.appliances.push_back(appliance("lamp", 100.0));
  level.appliances.push_back(appliance("kettle", 3000.0));

  ApplianceDefinition motor = appliance("motor", 100.0);
  InrushProfile inrush;
  inrush.multiplier = 3.0;
  inrush.duration_seconds = 0.5;
  motor.inrush = inrush;
  level.appliances.push_back(motor);

  return level;
}

void advanceSeconds(GridEngine& engine, double seconds, double step = 0.25) {
  for (double elapsed = 0.0; elapsed < seconds; elapsed += step) {
    engine.advance(step);
  }
}

void testInitialSnapshot() {
  GridEngine engine(makeLevel());
  const auto snapshot = engine.getSnapshot();

  expect(snapshot.phase == "ready", "fase awal harus ready");
  expect(snapshot.meter.status == "idle", "meter awal harus idle");
  expectNear(snapshot.elapsed_seconds, 0.0, 1e-12, "waktu awal nol");
  expectNear(snapshot.meter.energy_kwh, 0.0, 1e-12, "energi awal nol");
  expect(snapshot.appliances.size() == 3, "jumlah perangkat sesuai level");
}

void testEnergyAccumulation() {
  GridEngine engine(makeLevel());
  const auto on = engine.setApplianceOn("lamp", true);
  expect(on.ok, "menyalakan lamp harus berhasil");

  advanceSeconds(engine, 1.0);

  const auto snapshot = engine.getSnapshot();
  expectNear(snapshot.elapsed_seconds, 1.0, 1e-9, "waktu maju satu detik");
  expectNear(snapshot.meter.active_power_w, 100.0, 1e-9,
             "daya aktif lamp 100 W");
  expectNear(snapshot.meter.energy_kwh, 100.0 / 3600000.0, 1e-12,
             "energi terakumulasi sesuai daya dan waktu");
}

void testInrushDecays() {
  GridEngine engine(makeLevel());
  engine.setApplianceOn("motor", true);

  auto snapshot = engine.getSnapshot();
  expect(snapshot.appliances[2].inrush_active, "inrush aktif setelah start");
  expectNear(snapshot.appliances[2].active_power_w, 300.0, 1e-9,
             "daya inrush tiga kali nominal");

  engine.advance(0.25);
  snapshot = engine.getSnapshot();
  expectNear(snapshot.appliances[2].inrush_remaining_seconds, 0.25, 1e-9,
             "sisa inrush berkurang");

  engine.advance(0.25);
  snapshot = engine.getSnapshot();
  expect(!snapshot.appliances[2].inrush_active, "inrush selesai");
  expectNear(snapshot.appliances[2].active_power_w, 100.0, 1e-9,
             "daya kembali ke nominal");
}

void testOverloadTripsAndResets() {
  GridEngine engine(makeLevel());
  engine.setApplianceOn("kettle", true);

  bool tripped = false;
  for (int index = 0; index < 200 && !tripped; ++index) {
    engine.advance(0.25);
    tripped = engine.getSnapshot().breaker.is_tripped;
  }

  auto snapshot = engine.getSnapshot();
  expect(tripped, "beban berlebih harus memicu trip");
  expect(snapshot.breaker.trip_count == 1, "trip count bertambah");
  expect(snapshot.breaker.wire_heat > 99.0 &&
             snapshot.breaker.wire_heat <= 100.0,
         "panas kabel berada dekat ambang trip");
  expect(snapshot.phase == "tripped", "fase menjadi tripped");

  bool found_trip_event = false;
  for (const auto& event : engine.drainEvents()) {
    if (event.type == "breaker-tripped") {
      found_trip_event = true;
    }
  }
  expect(found_trip_event, "event breaker-tripped tersedia");

  const auto reset = engine.resetBreaker();
  expect(reset.ok, "reset MCB berhasil setelah trip");
  expectNear(reset.snapshot.breaker.wire_heat, 0.0, 1e-12,
             "panas kabel kembali nol");
  expect(!reset.snapshot.breaker.is_tripped, "MCB kembali tertutup");

  const auto reset_again = engine.resetBreaker();
  expect(!reset_again.ok, "reset kedua harus gagal");
  expect(reset_again.error == "breaker-not-tripped",
         "kode error reset kedua sesuai");
}

void testInvalidCommandsAndAdvance() {
  GridEngine engine(makeLevel());

  const auto missing = engine.setApplianceOn("tidak-ada", true);
  expect(!missing.ok, "perangkat tidak dikenal harus gagal");
  expect(missing.error == "appliance-not-found", "kode error sesuai");

  const auto before = engine.getSnapshot();
  const auto after_negative = engine.advance(-1.0);
  expectNear(after_negative.elapsed_seconds, before.elapsed_seconds, 1e-12,
             "delta negatif diabaikan");
  const auto after_nan = engine.advance(std::nan(""));
  expectNear(after_nan.elapsed_seconds, before.elapsed_seconds, 1e-12,
             "delta NaN diabaikan");
}

void testMaxStepClamp() {
  GridEngine engine(makeLevel());
  engine.setApplianceOn("lamp", true);

  const auto snapshot = engine.advance(10.0);
  expectNear(snapshot.elapsed_seconds, 0.25, 1e-9,
             "satu advance dibatasi maxStepSeconds");
}

void testRestartLevel() {
  GridEngine engine(makeLevel());
  engine.setApplianceOn("kettle", true);
  advanceSeconds(engine, 2.0);

  const auto restarted = engine.restartLevel();
  expect(restarted.ok, "restart level berhasil");
  expectNear(restarted.snapshot.elapsed_seconds, 0.0, 1e-12,
             "waktu kembali nol");
  expectNear(restarted.snapshot.meter.energy_kwh, 0.0, 1e-12,
             "energi kembali nol");
  expect(!restarted.snapshot.breaker.is_tripped, "MCB kembali normal");
  expect(!restarted.snapshot.appliances[1].is_on,
         "status saklar kembali ke awal");
}

void testValidationRejectsDuplicateIds() {
  LevelConfig level = makeLevel();
  level.appliances.push_back(appliance("lamp", 50.0));

  bool threw = false;
  try {
    GridEngine engine(level);
    (void)engine;
  } catch (const std::invalid_argument&) {
    threw = true;
  }
  expect(threw, "id perangkat duplikat harus ditolak");
}

}  // namespace

int main() {
  testInitialSnapshot();
  testEnergyAccumulation();
  testInrushDecays();
  testOverloadTripsAndResets();
  testInvalidCommandsAndAdvance();
  testMaxStepClamp();
  testRestartLevel();
  testValidationRejectsDuplicateIds();

  if (failures > 0) {
    std::cerr << failures << " dari " << checks << " pemeriksaan gagal.\n";
    return EXIT_FAILURE;
  }

  std::cout << "Semua " << checks << " pemeriksaan lulus.\n";
  return EXIT_SUCCESS;
}
