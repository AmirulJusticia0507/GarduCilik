/**
 * Binding Embind untuk engine simulasi GarduCilik.
 *
 * Kontrak JavaScript sengaja memakai string JSON pada input dan objek biasa
 * pada output agar loader TypeScript tidak perlu mengetahui tipe C++.
 */

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <cstddef>
#include <string>
#include <utility>
#include <vector>

#include "grid_engine.h"

namespace {

using emscripten::val;
using garducilik::ApplianceDefinition;
using garducilik::ApplianceSnapshot;
using garducilik::BreakerSnapshot;
using garducilik::BreakerThermalConfig;
using garducilik::EngineResult;
using garducilik::GridEngine;
using garducilik::GridSnapshot;
using garducilik::InrushProfile;
using garducilik::LevelConfig;
using garducilik::MeterSnapshot;
using garducilik::SimulationConfig;
using garducilik::SimulationEvent;

bool hasValue(const val& object, const char* key) {
  const val value = object[key];
  return !value.isUndefined() && !value.isNull();
}

double optionalNumber(const val& object, const char* key, double fallback) {
  return hasValue(object, key) ? object[key].as<double>() : fallback;
}

std::string optionalString(const val& object, const char* key) {
  return hasValue(object, key) ? object[key].as<std::string>() : std::string();
}

InrushProfile parseInrush(const val& value) {
  InrushProfile profile;
  profile.multiplier = value["multiplier"].as<double>();
  profile.duration_seconds = value["durationSeconds"].as<double>();
  return profile;
}

ApplianceDefinition parseAppliance(const val& value) {
  ApplianceDefinition appliance;
  appliance.id = value["id"].as<std::string>();
  appliance.name = value["name"].as<std::string>();
  appliance.category = value["category"].as<std::string>();
  appliance.room = value["room"].as<std::string>();
  appliance.rated_power_w = value["ratedPowerW"].as<double>();
  appliance.standby_power_w = value["standbyPowerW"].as<double>();
  appliance.initially_on = value["initiallyOn"].as<bool>();
  appliance.essential = hasValue(value, "essential")
                            ? value["essential"].as<bool>()
                            : false;
  appliance.education_note = optionalString(value, "educationNote");

  if (hasValue(value, "powerFactor")) {
    appliance.power_factor = value["powerFactor"].as<double>();
  }
  if (hasValue(value, "inrush")) {
    appliance.inrush = parseInrush(value["inrush"]);
  }

  return appliance;
}

BreakerThermalConfig parseBreaker(const val& value) {
  BreakerThermalConfig breaker;
  breaker.trip_heat = value["tripHeat"].as<double>();
  breaker.warm_heat = value["warmHeat"].as<double>();
  breaker.hot_heat = value["hotHeat"].as<double>();
  breaker.critical_heat = value["criticalHeat"].as<double>();
  breaker.heat_gain_per_second_at_double_load =
      value["heatGainPerSecondAtDoubleLoad"].as<double>();
  breaker.overload_exponent = value["overloadExponent"].as<double>();
  breaker.cooling_per_second = value["coolingPerSecond"].as<double>();
  return breaker;
}

SimulationConfig parseSimulation(const val& value) {
  SimulationConfig simulation;
  simulation.voltage_v = value["voltageV"].as<double>();
  simulation.frequency_hz = value["frequencyHz"].as<double>();
  simulation.default_power_factor = value["defaultPowerFactor"].as<double>();
  simulation.warning_threshold = value["warningThreshold"].as<double>();
  simulation.max_step_seconds = value["maxStepSeconds"].as<double>();
  simulation.breaker = parseBreaker(value["breaker"]);
  return simulation;
}

LevelConfig parseLevel(const std::string& config_json) {
  const val parsed =
      val::global("JSON").call<val>("parse", val(config_json));

  LevelConfig level;
  level.id = parsed["id"].as<std::string>();
  level.name = parsed["name"].as<std::string>();
  level.description = optionalString(parsed, "description");
  level.meter_capacity_va = parsed["meterCapacityVA"].as<double>();
  level.breaker_rating_va = parsed["breakerRatingVA"].as<double>();
  level.simulation = parseSimulation(parsed["simulation"]);

  const val appliances = parsed["appliances"];
  const unsigned length = appliances["length"].as<unsigned>();
  level.appliances.reserve(length);
  for (unsigned index = 0; index < length; ++index) {
    level.appliances.push_back(parseAppliance(appliances[index]));
  }

  return level;
}

val applianceToVal(const ApplianceSnapshot& appliance) {
  val object = val::object();
  object.set("id", appliance.id);
  object.set("name", appliance.name);
  object.set("category", appliance.category);
  object.set("room", appliance.room);
  object.set("isOn", appliance.is_on);
  object.set("inrushActive", appliance.inrush_active);
  object.set("inrushRemainingSeconds", appliance.inrush_remaining_seconds);
  object.set("activePowerW", appliance.active_power_w);
  object.set("apparentPowerVA", appliance.apparent_power_va);
  object.set("currentA", appliance.current_a);
  object.set("powerFactor", appliance.power_factor);
  object.set("standbyPowerW", appliance.standby_power_w);
  return object;
}

val meterToVal(const MeterSnapshot& meter) {
  val object = val::object();
  object.set("voltageV", meter.voltage_v);
  object.set("frequencyHz", meter.frequency_hz);
  object.set("capacityVA", meter.capacity_va);
  object.set("activePowerW", meter.active_power_w);
  object.set("apparentPowerVA", meter.apparent_power_va);
  object.set("reactivePowerVAR", meter.reactive_power_var);
  object.set("currentA", meter.current_a);
  object.set("powerFactor", meter.power_factor);
  object.set("energyKwh", meter.energy_kwh);
  object.set("utilizationRatio", meter.utilization_ratio);
  object.set("status", meter.status);
  return object;
}

val breakerToVal(const BreakerSnapshot& breaker) {
  val object = val::object();
  object.set("ratingVA", breaker.rating_va);
  object.set("wireHeat", breaker.wire_heat);
  object.set("heatState", breaker.heat_state);
  object.set("isTripped", breaker.is_tripped);
  object.set("canReset", breaker.can_reset);
  object.set("tripCount", breaker.trip_count);
  object.set("lastTripAtSeconds",
             breaker.last_trip_at_seconds.has_value()
                 ? val(*breaker.last_trip_at_seconds)
                 : val::null());
  object.set("lastTripReason",
             breaker.last_trip_reason.has_value()
                 ? val(*breaker.last_trip_reason)
                 : val::null());
  return object;
}

val snapshotToVal(const GridSnapshot& snapshot) {
  val level = val::object();
  level.set("id", snapshot.level_id);
  level.set("name", snapshot.level_name);
  level.set("meterCapacityVA", snapshot.level_meter_capacity_va);
  level.set("breakerRatingVA", snapshot.level_breaker_rating_va);

  val appliances = val::array();
  for (std::size_t index = 0; index < snapshot.appliances.size(); ++index) {
    appliances.set(index, applianceToVal(snapshot.appliances[index]));
  }

  val object = val::object();
  object.set("elapsedSeconds", snapshot.elapsed_seconds);
  object.set("phase", snapshot.phase);
  object.set("level", level);
  object.set("meter", meterToVal(snapshot.meter));
  object.set("breaker", breakerToVal(snapshot.breaker));
  object.set("appliances", appliances);
  return object;
}

val eventToVal(const SimulationEvent& event) {
  val object = val::object();
  object.set("type", event.type);
  object.set("atSeconds", event.at_seconds);

  if (event.type == "breaker-tripped") {
    object.set("reason", event.reason);
    if (event.load_va.has_value()) {
      object.set("loadVA", *event.load_va);
    }
    if (event.rating_va.has_value()) {
      object.set("ratingVA", *event.rating_va);
    }
    if (event.wire_heat.has_value()) {
      object.set("wireHeat", *event.wire_heat);
    }
  } else if (event.type == "overload-warning") {
    if (event.utilization_ratio.has_value()) {
      object.set("utilizationRatio", *event.utilization_ratio);
    }
  } else if (event.type == "inrush-started") {
    object.set("applianceId", event.appliance_id);
  }

  return object;
}

val resultToVal(const EngineResult& result) {
  val object = val::object();
  object.set("ok", result.ok);
  if (!result.ok) {
    object.set("error", result.error);
  }
  object.set("snapshot", snapshotToVal(result.snapshot));
  return object;
}

/**
 * Handle JavaScript untuk satu instance engine.
 *
 * Instance dialokasikan oleh createGridEngine() dan dimiliki oleh JS. Embind
 * menyediakan method delete() pada handle; loader saat ini membiarkan instance
 * hidup selama level aktif.
 */
class GridEngineHandle {
 public:
  explicit GridEngineHandle(const std::string& config_json)
      : engine_(parseLevel(config_json)) {}

  val getSnapshot() const { return snapshotToVal(engine_.getSnapshot()); }

  val advance(double delta_seconds) {
    return snapshotToVal(engine_.advance(delta_seconds));
  }

  val setApplianceOn(const std::string& id, bool is_on) {
    return resultToVal(engine_.setApplianceOn(id, is_on));
  }

  val resetBreaker() { return resultToVal(engine_.resetBreaker()); }

  val restartLevel() { return resultToVal(engine_.restartLevel()); }

  val drainEvents() {
    const std::vector<SimulationEvent> events = engine_.drainEvents();
    val array = val::array();
    for (std::size_t index = 0; index < events.size(); ++index) {
      array.set(index, eventToVal(events[index]));
    }
    return array;
  }

 private:
  GridEngine engine_;
};

GridEngineHandle* createGridEngine(const std::string& config_json) {
  return new GridEngineHandle(config_json);
}

}  // namespace

EMSCRIPTEN_BINDINGS(garducilik_grid_engine) {
  emscripten::class_<GridEngineHandle>("GridEngine")
      .function("getSnapshot", &GridEngineHandle::getSnapshot)
      .function("advance", &GridEngineHandle::advance)
      .function("setApplianceOn", &GridEngineHandle::setApplianceOn)
      .function("resetBreaker", &GridEngineHandle::resetBreaker)
      .function("restartLevel", &GridEngineHandle::restartLevel)
      .function("drainEvents", &GridEngineHandle::drainEvents);

  emscripten::function("createGridEngine", &createGridEngine,
                       emscripten::allow_raw_pointers());
}
