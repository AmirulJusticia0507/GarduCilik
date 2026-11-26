#include "grid_engine.h"

#include <algorithm>
#include <cmath>
#include <set>
#include <stdexcept>
#include <utility>

namespace garducilik {
namespace {

/** Batas langkah integrasi internal agar transisi inrush dan trip tetap halus. */
constexpr double kMaxIntegrationStepSeconds = 0.05;
constexpr double kEpsilon = 1e-9;

double clamp(double value, double minimum, double maximum) {
  return std::min(maximum, std::max(minimum, value));
}

double resolvePowerFactor(const ApplianceDefinition& definition,
                          const LevelConfig& level) {
  return definition.power_factor.value_or(
      level.simulation.default_power_factor);
}

bool isBlank(const std::string& value) {
  return value.find_first_not_of(" \t\r\n") == std::string::npos;
}

void assertFinitePositive(const char* name, double value) {
  if (!std::isfinite(value) || value <= 0.0) {
    throw std::invalid_argument(std::string(name) +
                                " harus berupa angka positif.");
  }
}

void assertNonNegative(const char* name, double value) {
  if (!std::isfinite(value) || value < 0.0) {
    throw std::invalid_argument(std::string(name) + " tidak boleh negatif.");
  }
}

void assertProbability(const char* name, double value) {
  if (!std::isfinite(value) || value < 0.0 || value > 1.0) {
    throw std::invalid_argument(std::string(name) +
                                " harus berada pada rentang 0-1.");
  }
}

std::string heatStateFor(double wire_heat, bool is_tripped,
                         const LevelConfig& level) {
  if (is_tripped) {
    return "tripped";
  }

  const auto& breaker = level.simulation.breaker;
  if (wire_heat >= breaker.critical_heat) {
    return "critical";
  }
  if (wire_heat >= breaker.hot_heat) {
    return "hot";
  }
  if (wire_heat >= breaker.warm_heat) {
    return "warm";
  }
  return "cool";
}

LevelConfig validateAndMove(LevelConfig level) {
  validateLevel(level);
  return level;
}

std::string meterStatusFor(double apparent_power_va, double utilization,
                           bool is_tripped, const LevelConfig& level) {
  if (is_tripped) {
    return "tripped";
  }
  if (apparent_power_va <= 0.0) {
    return "idle";
  }
  if (utilization > 1.0) {
    return "overload";
  }
  if (utilization >= level.simulation.warning_threshold) {
    return "warning";
  }
  return "normal";
}

}  // namespace

void validateLevel(const LevelConfig& level) {
  if (isBlank(level.id) || isBlank(level.name)) {
    throw std::invalid_argument("Level harus memiliki id dan nama.");
  }

  assertFinitePositive("Kapasitas meter", level.meter_capacity_va);
  assertFinitePositive("Rating MCB", level.breaker_rating_va);
  assertFinitePositive("Tegangan", level.simulation.voltage_v);
  assertFinitePositive("Frekuensi", level.simulation.frequency_hz);
  assertFinitePositive("maxStepSeconds", level.simulation.max_step_seconds);
  assertProbability("defaultPowerFactor",
                    level.simulation.default_power_factor);
  assertProbability("warningThreshold", level.simulation.warning_threshold);

  const auto& breaker = level.simulation.breaker;
  assertFinitePositive("tripHeat", breaker.trip_heat);
  assertNonNegative("warmHeat", breaker.warm_heat);
  assertNonNegative("hotHeat", breaker.hot_heat);
  assertNonNegative("criticalHeat", breaker.critical_heat);
  assertNonNegative("heatGainPerSecondAtDoubleLoad",
                    breaker.heat_gain_per_second_at_double_load);
  assertNonNegative("coolingPerSecond", breaker.cooling_per_second);
  assertFinitePositive("overloadExponent", breaker.overload_exponent);

  if (!(breaker.warm_heat < breaker.hot_heat &&
        breaker.hot_heat < breaker.critical_heat &&
        breaker.critical_heat < breaker.trip_heat)) {
    throw std::invalid_argument(
        "Ambang panas MCB harus berurutan: warm < hot < critical < trip.");
  }

  if (level.appliances.empty()) {
    throw std::invalid_argument("Level harus memiliki minimal satu perangkat.");
  }

  std::set<std::string> appliance_ids;

  for (const auto& appliance : level.appliances) {
    if (isBlank(appliance.id)) {
      throw std::invalid_argument("Setiap perangkat harus memiliki id.");
    }

    if (!appliance_ids.insert(appliance.id).second) {
      throw std::invalid_argument("Id perangkat duplikat: " + appliance.id +
                                  ".");
    }

    if (isBlank(appliance.name)) {
      throw std::invalid_argument("Perangkat " + appliance.id +
                                  " harus memiliki nama.");
    }

    assertFinitePositive(("Daya nominal " + appliance.id).c_str(),
                         appliance.rated_power_w);
    assertNonNegative(("Daya standby " + appliance.id).c_str(),
                      appliance.standby_power_w);

    if (appliance.power_factor.has_value()) {
      assertFinitePositive(("Power factor " + appliance.id).c_str(),
                           *appliance.power_factor);
      if (*appliance.power_factor > 1.0) {
        throw std::invalid_argument("Power factor " + appliance.id +
                                    " tidak boleh melebihi 1.");
      }
    }

    if (appliance.inrush.has_value()) {
      if (!std::isfinite(appliance.inrush->multiplier) ||
          appliance.inrush->multiplier < 1.0) {
        throw std::invalid_argument("Multiplier inrush " + appliance.id +
                                    " harus minimal 1.");
      }
      assertFinitePositive(("Durasi inrush " + appliance.id).c_str(),
                           appliance.inrush->duration_seconds);
    }
  }
}

GridEngine::GridEngine(LevelConfig level)
    : level_(validateAndMove(std::move(level))),
      state_(createInitialState(level_)) {}

GridEngine::State GridEngine::createInitialState(const LevelConfig& level) {
  State state;
  state.appliances.reserve(level.appliances.size());

  for (const auto& definition : level.appliances) {
    InternalAppliance appliance;
    appliance.definition = definition;
    appliance.is_on = definition.initially_on;
    if (definition.initially_on && definition.inrush.has_value()) {
      appliance.inrush_remaining_seconds =
          definition.inrush->duration_seconds;
    }
    state.appliances.push_back(std::move(appliance));
  }

  return state;
}

GridEngine::LoadTotals GridEngine::calculateLoads() const {
  LoadTotals totals;
  totals.appliances.reserve(state_.appliances.size());

  const double voltage = level_.simulation.voltage_v;

  for (const auto& appliance : state_.appliances) {
    const auto& definition = appliance.definition;
    const double power_factor = resolvePowerFactor(definition, level_);

    double active_power = 0.0;
    bool inrush_active = false;
    double inrush_remaining_seconds = 0.0;

    if (!state_.is_tripped) {
      inrush_remaining_seconds = appliance.inrush_remaining_seconds;

      if (appliance.is_on) {
        inrush_active = inrush_remaining_seconds > kEpsilon &&
                        definition.inrush.has_value();
        const double multiplier =
            inrush_active ? definition.inrush->multiplier : 1.0;
        active_power = definition.rated_power_w * multiplier;
      } else {
        active_power = definition.standby_power_w;
      }
    }

    const double apparent_power = active_power / power_factor;
    totals.active_power_w += active_power;
    totals.apparent_power_va += apparent_power;

    ApplianceSnapshot snapshot;
    snapshot.id = definition.id;
    snapshot.name = definition.name;
    snapshot.category = definition.category;
    snapshot.room = definition.room;
    snapshot.is_on = appliance.is_on;
    snapshot.inrush_active = inrush_active;
    snapshot.inrush_remaining_seconds = inrush_remaining_seconds;
    snapshot.active_power_w = active_power;
    snapshot.apparent_power_va = apparent_power;
    snapshot.current_a = apparent_power / voltage;
    snapshot.power_factor =
        apparent_power > 0.0 ? active_power / apparent_power : power_factor;
    snapshot.standby_power_w =
        appliance.is_on ? 0.0 : definition.standby_power_w;
    totals.appliances.push_back(std::move(snapshot));
  }

  totals.reactive_power_var =
      std::sqrt(std::max(0.0, totals.apparent_power_va * totals.apparent_power_va -
                                  totals.active_power_w * totals.active_power_w));
  totals.current_a = totals.apparent_power_va / voltage;
  totals.power_factor =
      totals.apparent_power_va > 0.0
          ? clamp(totals.active_power_w / totals.apparent_power_va, 0.0, 1.0)
          : 1.0;

  return totals;
}

GridSnapshot GridEngine::buildSnapshot() const {
  const LoadTotals totals = calculateLoads();

  GridSnapshot snapshot;
  snapshot.elapsed_seconds = state_.elapsed_seconds;
  snapshot.phase = state_.is_tripped
                       ? "tripped"
                       : ((totals.active_power_w > 0.0 ||
                           totals.apparent_power_va > 0.0)
                              ? "running"
                              : "ready");
  snapshot.level_id = level_.id;
  snapshot.level_name = level_.name;
  snapshot.level_meter_capacity_va = level_.meter_capacity_va;
  snapshot.level_breaker_rating_va = level_.breaker_rating_va;

  const double utilization =
      level_.meter_capacity_va > 0.0
          ? totals.apparent_power_va / level_.meter_capacity_va
          : 0.0;

  snapshot.meter.voltage_v = level_.simulation.voltage_v;
  snapshot.meter.frequency_hz = level_.simulation.frequency_hz;
  snapshot.meter.capacity_va = level_.meter_capacity_va;
  snapshot.meter.active_power_w = totals.active_power_w;
  snapshot.meter.apparent_power_va = totals.apparent_power_va;
  snapshot.meter.reactive_power_var = totals.reactive_power_var;
  snapshot.meter.current_a = totals.current_a;
  snapshot.meter.power_factor = totals.power_factor;
  snapshot.meter.energy_kwh = state_.energy_kwh;
  snapshot.meter.utilization_ratio = utilization;
  snapshot.meter.status = meterStatusFor(totals.apparent_power_va, utilization,
                                         state_.is_tripped, level_);

  snapshot.breaker.rating_va = level_.breaker_rating_va;
  snapshot.breaker.wire_heat = state_.wire_heat;
  snapshot.breaker.heat_state =
      heatStateFor(state_.wire_heat, state_.is_tripped, level_);
  snapshot.breaker.is_tripped = state_.is_tripped;
  snapshot.breaker.can_reset = state_.is_tripped;
  snapshot.breaker.trip_count = state_.trip_count;
  snapshot.breaker.last_trip_at_seconds = state_.last_trip_at_seconds;
  snapshot.breaker.last_trip_reason = state_.last_trip_reason;

  snapshot.appliances = totals.appliances;
  return snapshot;
}

void GridEngine::recordTrip(double load_va) {
  state_.is_tripped = true;
  state_.trip_count += 1;
  state_.last_trip_at_seconds = state_.elapsed_seconds;
  state_.last_trip_reason = std::string("overload");
  state_.wire_heat = level_.simulation.breaker.trip_heat;
  state_.warning_active = false;

  for (auto& appliance : state_.appliances) {
    appliance.inrush_remaining_seconds = 0.0;
  }

  SimulationEvent event;
  event.type = "breaker-tripped";
  event.at_seconds = state_.elapsed_seconds;
  event.reason = "overload";
  event.load_va = load_va;
  event.rating_va = level_.breaker_rating_va;
  event.wire_heat = state_.wire_heat;
  state_.events.push_back(std::move(event));
}

void GridEngine::updateWarning(double load_va) {
  const double utilization = load_va / level_.meter_capacity_va;
  const bool above_threshold =
      utilization >= level_.simulation.warning_threshold;

  if (above_threshold && !state_.warning_active) {
    state_.warning_active = true;
    SimulationEvent event;
    event.type = "overload-warning";
    event.at_seconds = state_.elapsed_seconds;
    event.utilization_ratio = utilization;
    state_.events.push_back(std::move(event));
    return;
  }

  if (!above_threshold) {
    state_.warning_active = false;
  }
}

void GridEngine::step(double delta_seconds) {
  const LoadTotals totals = calculateLoads();

  if (!state_.is_tripped) {
    state_.energy_kwh +=
        (totals.active_power_w * delta_seconds) / 3600000.0;
  }

  state_.elapsed_seconds += delta_seconds;

  if (!state_.is_tripped) {
    for (auto& appliance : state_.appliances) {
      if (appliance.is_on && appliance.inrush_remaining_seconds > 0.0) {
        double remaining =
            std::max(0.0, appliance.inrush_remaining_seconds - delta_seconds);
        // Hindari sisa floating-point sangat kecil yang membuat inrush
        // terlihat masih aktif pada snapshot berikutnya.
        appliance.inrush_remaining_seconds =
            remaining <= kEpsilon ? 0.0 : remaining;
      }
    }
  }

  const auto& breaker = level_.simulation.breaker;
  const double overload_ratio =
      state_.is_tripped
          ? 0.0
          : std::max(0.0, totals.apparent_power_va /
                                  level_.breaker_rating_va -
                              1.0);
  const double heat_gain =
      state_.is_tripped
          ? 0.0
          : breaker.heat_gain_per_second_at_double_load *
                std::pow(overload_ratio, breaker.overload_exponent);
  const double cooling =
      breaker.cooling_per_second * (state_.wire_heat / breaker.trip_heat);

  state_.wire_heat =
      clamp(state_.wire_heat + (heat_gain - cooling) * delta_seconds, 0.0,
            breaker.trip_heat);

  if (!state_.is_tripped &&
      state_.wire_heat >= breaker.trip_heat - kEpsilon) {
    recordTrip(totals.apparent_power_va);
    return;
  }

  if (state_.is_tripped) {
    state_.warning_active = false;
    return;
  }

  updateWarning(totals.apparent_power_va);
}

GridSnapshot GridEngine::getSnapshot() const { return buildSnapshot(); }

GridSnapshot GridEngine::advance(double delta_seconds) {
  if (!std::isfinite(delta_seconds) || delta_seconds < 0.0) {
    return buildSnapshot();
  }

  const double maximum_step = level_.simulation.max_step_seconds;
  const double integration_step =
      std::min(kMaxIntegrationStepSeconds, maximum_step);
  double remaining = std::min(delta_seconds, maximum_step);

  while (remaining > kEpsilon) {
    const double current_step = std::min(integration_step, remaining);
    step(current_step);
    remaining -= current_step;
  }

  return buildSnapshot();
}

EngineResult GridEngine::setApplianceOn(const std::string& id, bool is_on) {
  EngineResult result;

  auto found = std::find_if(
      state_.appliances.begin(), state_.appliances.end(),
      [&id](const InternalAppliance& appliance) {
        return appliance.definition.id == id;
      });

  if (found == state_.appliances.end()) {
    result.ok = false;
    result.error = "appliance-not-found";
    result.snapshot = buildSnapshot();
    return result;
  }

  if (found->is_on == is_on) {
    result.ok = true;
    result.snapshot = buildSnapshot();
    return result;
  }

  found->is_on = is_on;

  if (!is_on) {
    found->inrush_remaining_seconds = 0.0;
  } else if (!state_.is_tripped && found->definition.inrush.has_value()) {
    found->inrush_remaining_seconds =
        found->definition.inrush->duration_seconds;
    SimulationEvent event;
    event.type = "inrush-started";
    event.at_seconds = state_.elapsed_seconds;
    event.appliance_id = id;
    state_.events.push_back(std::move(event));
  }

  result.ok = true;
  result.snapshot = buildSnapshot();
  return result;
}

EngineResult GridEngine::resetBreaker() {
  EngineResult result;

  if (!state_.is_tripped) {
    result.ok = false;
    result.error = "breaker-not-tripped";
    result.snapshot = buildSnapshot();
    return result;
  }

  state_.is_tripped = false;
  state_.wire_heat = 0.0;
  state_.warning_active = false;

  SimulationEvent reset_event;
  reset_event.type = "breaker-reset";
  reset_event.at_seconds = state_.elapsed_seconds;
  state_.events.push_back(std::move(reset_event));

  // Perangkat yang saklarnya masih menyala akan menarik arus awal lagi ketika
  // MCB ditutup. Ini salah satu perilaku yang dipelajari dalam simulasi.
  for (auto& appliance : state_.appliances) {
    if (appliance.is_on && appliance.definition.inrush.has_value()) {
      appliance.inrush_remaining_seconds =
          appliance.definition.inrush->duration_seconds;
      SimulationEvent event;
      event.type = "inrush-started";
      event.at_seconds = state_.elapsed_seconds;
      event.appliance_id = appliance.definition.id;
      state_.events.push_back(std::move(event));
    }
  }

  result.ok = true;
  result.snapshot = buildSnapshot();
  return result;
}

EngineResult GridEngine::restartLevel() {
  state_ = createInitialState(level_);

  SimulationEvent event;
  event.type = "level-restarted";
  event.at_seconds = 0.0;
  state_.events.push_back(std::move(event));

  EngineResult result;
  result.ok = true;
  result.snapshot = buildSnapshot();
  return result;
}

std::vector<SimulationEvent> GridEngine::drainEvents() {
  std::vector<SimulationEvent> events = std::move(state_.events);
  state_.events.clear();
  return events;
}

}  // namespace garducilik
