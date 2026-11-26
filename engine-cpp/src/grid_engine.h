#pragma once

#include <optional>
#include <string>
#include <vector>

namespace garducilik {

/** Profil lonjakan arus awal perangkat bermotor. */
struct InrushProfile {
  double multiplier = 1.0;
  double duration_seconds = 0.0;
};

struct ApplianceDefinition {
  std::string id;
  std::string name;
  std::string category;
  std::string room;
  double rated_power_w = 0.0;
  std::optional<double> power_factor;
  double standby_power_w = 0.0;
  std::optional<InrushProfile> inrush;
  bool initially_on = false;
  bool essential = false;
  std::string education_note;
};

/** Parameter model termal MCB; panas kabel memakai skala 0..trip_heat. */
struct BreakerThermalConfig {
  double trip_heat = 0.0;
  double warm_heat = 0.0;
  double hot_heat = 0.0;
  double critical_heat = 0.0;
  double heat_gain_per_second_at_double_load = 0.0;
  double overload_exponent = 0.0;
  double cooling_per_second = 0.0;
};

struct SimulationConfig {
  double voltage_v = 0.0;
  double frequency_hz = 0.0;
  double default_power_factor = 1.0;
  double warning_threshold = 0.0;
  double max_step_seconds = 0.0;
  BreakerThermalConfig breaker;
};

struct LevelConfig {
  std::string id;
  std::string name;
  std::string description;
  double meter_capacity_va = 0.0;
  double breaker_rating_va = 0.0;
  std::vector<ApplianceDefinition> appliances;
  SimulationConfig simulation;
};

struct ApplianceSnapshot {
  std::string id;
  std::string name;
  std::string category;
  std::string room;
  bool is_on = false;
  bool inrush_active = false;
  double inrush_remaining_seconds = 0.0;
  double active_power_w = 0.0;
  double apparent_power_va = 0.0;
  double current_a = 0.0;
  double power_factor = 1.0;
  double standby_power_w = 0.0;
};

struct MeterSnapshot {
  double voltage_v = 0.0;
  double frequency_hz = 0.0;
  double capacity_va = 0.0;
  double active_power_w = 0.0;
  double apparent_power_va = 0.0;
  double reactive_power_var = 0.0;
  double current_a = 0.0;
  double power_factor = 1.0;
  double energy_kwh = 0.0;
  double utilization_ratio = 0.0;
  std::string status;
};

struct BreakerSnapshot {
  double rating_va = 0.0;
  double wire_heat = 0.0;
  std::string heat_state;
  bool is_tripped = false;
  bool can_reset = false;
  int trip_count = 0;
  std::optional<double> last_trip_at_seconds;
  std::optional<std::string> last_trip_reason;
};

struct GridSnapshot {
  double elapsed_seconds = 0.0;
  std::string phase;
  std::string level_id;
  std::string level_name;
  double level_meter_capacity_va = 0.0;
  double level_breaker_rating_va = 0.0;
  MeterSnapshot meter;
  BreakerSnapshot breaker;
  std::vector<ApplianceSnapshot> appliances;
};

/**
 * Satu kejadian simulasi. Field yang tidak relevan dibiarkan kosong dan
 * binding hanya mengekspor field yang sesuai dengan tipe event.
 */
struct SimulationEvent {
  std::string type;
  double at_seconds = 0.0;

  // breaker-tripped
  std::string reason;
  std::optional<double> load_va;
  std::optional<double> rating_va;
  std::optional<double> wire_heat;

  // overload-warning
  std::optional<double> utilization_ratio;

  // inrush-started
  std::string appliance_id;
};

struct EngineResult {
  bool ok = false;
  /** Kosong saat ok=true; berisi kode error saat ok=false. */
  std::string error;
  GridSnapshot snapshot;
};

/**
 * Engine simulasi murni dan sinkron.
 *
 * Engine tidak memiliki timer sendiri. Pemanggil menghitung delta waktu lalu
 * memanggil advance(). Seluruh perhitungan memakai model edukatif yang
 * disederhanakan, bukan acuan instalasi listrik nyata.
 */
class GridEngine {
 public:
  explicit GridEngine(LevelConfig level);

  const LevelConfig& level() const { return level_; }

  GridSnapshot getSnapshot() const;
  GridSnapshot advance(double delta_seconds);

  EngineResult setApplianceOn(const std::string& id, bool is_on);
  EngineResult resetBreaker();
  EngineResult restartLevel();

  std::vector<SimulationEvent> drainEvents();

 private:
  struct InternalAppliance {
    ApplianceDefinition definition;
    bool is_on = false;
    double inrush_remaining_seconds = 0.0;
  };

  struct LoadTotals {
    std::vector<ApplianceSnapshot> appliances;
    double active_power_w = 0.0;
    double apparent_power_va = 0.0;
    double reactive_power_var = 0.0;
    double current_a = 0.0;
    double power_factor = 1.0;
  };

  struct State {
    double elapsed_seconds = 0.0;
    double energy_kwh = 0.0;
    double wire_heat = 0.0;
    bool is_tripped = false;
    int trip_count = 0;
    std::optional<double> last_trip_at_seconds;
    std::optional<std::string> last_trip_reason;
    bool warning_active = false;
    std::vector<SimulationEvent> events;
    std::vector<InternalAppliance> appliances;
  };

  static State createInitialState(const LevelConfig& level);

  LoadTotals calculateLoads() const;
  GridSnapshot buildSnapshot() const;
  void step(double delta_seconds);
  void recordTrip(double load_va);
  void updateWarning(double load_va);

  LevelConfig level_;
  State state_;
};

/** Melempar std::invalid_argument bila konfigurasi level tidak valid. */
void validateLevel(const LevelConfig& level);

}  // namespace garducilik
