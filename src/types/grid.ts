/**
 * Model domain simulasi kelistrikan GarduCilik.
 *
 * Konvensi satuan:
 * - daya aktif: watt (W)
 * - daya semu: volt-ampere (VA)
 * - daya reaktif: volt-ampere reaktif (VAR)
 * - arus: ampere (A)
 * - waktu: detik simulasi (bukan waktu dinding)
 * - energi: kilowatt-hour (kWh)
 * - panas kabel: skala 0–100 (bukan derajat Celsius)
 *
 * Model ini disederhanakan untuk tujuan edukasi. Nilai dan perilakunya tidak
 * boleh dipakai sebagai acuan pemasangan atau pengamanan instalasi nyata.
 */

export type ApplianceId = string;
export type LevelId = string;

/** Ruangan MVP yang dipakai untuk penempatan perangkat pada denah rumah. */
export type RoomId =
  | "living-room"
  | "kitchen"
  | "bedroom"
  | "bathroom"
  | "terrace"
  | "garage";

export type ApplianceCategory =
  | "lighting"
  | "cooling"
  | "motor"
  | "kitchen"
  | "electronics"
  | "utility";

/**
 * Profil lonjakan arus awal perangkat bermotor.
 * Contoh: multiplier 3 dan durationSeconds 1,5 berarti perangkat menarik tiga
 * kali daya nominal selama 1,5 detik pertama setelah dinyalakan.
 */
export interface InrushProfile {
  multiplier: number;
  durationSeconds: number;
}

export interface ApplianceDefinition {
  id: ApplianceId;
  /** Nama yang ditampilkan ke pemain, dalam bahasa Indonesia. */
  name: string;
  category: ApplianceCategory;
  room: RoomId;
  /** Daya aktif nominal saat beroperasi normal. */
  ratedPowerW: number;
  /** Rasio daya aktif terhadap daya semu, 0 < powerFactor <= 1. */
  powerFactor: number;
  /**
   * Daya yang tetap ditarik saat perangkat dimatikan tetapi masih tercolok.
   * Modelkan sebagai 0 bila perangkat benar-benar terputus.
   */
  standbyPowerW: number;
  inrush?: InrushProfile;
  /** Status saklar awal saat level dimulai. */
  initiallyOn: boolean;
  /** Perangkat penting yang perlu tetap menyala untuk misi. */
  essential: boolean;
  /** Penjelasan singkat untuk modal edukasi. */
  educationNote?: string;
}

export type BreakerTripReason = "overload";

export type BreakerHeatState =
  | "cool"
  | "warm"
  | "hot"
  | "critical"
  | "tripped";

/**
 * Parameter model termal MCB.
 *
 * Panas kabel dihitung dari rasio kelebihan beban terhadap rating MCB:
 * `overload = max(0, loadVA / ratingVA - 1)`.
 * Nilai `heatGainPerSecondAtDoubleLoad` adalah kenaikan panas per detik saat
 * beban mencapai dua kali rating (overload = 1). Beban yang hanya sedikit
 * melewati rating memanaskan kabel lebih lambat, sehingga trip tidak instan.
 */
export interface BreakerThermalConfig {
  /** Ambang panas yang memicu trip. */
  tripHeat: number;
  /** Ambang awal indikator "warm". */
  warmHeat: number;
  /** Ambang awal indikator "hot". */
  hotHeat: number;
  /** Ambang awal indikator "critical". */
  criticalHeat: number;
  /** Kenaikan panas per detik pada beban dua kali rating MCB. */
  heatGainPerSecondAtDoubleLoad: number;
  /** Eksponen kurva panas terhadap rasio kelebihan beban (I² untuk I²R). */
  overloadExponent: number;
  /** Laju pendinginan per detik pada panas maksimum. */
  coolingPerSecond: number;
}

export interface SimulationConfig {
  /** Tegangan nominal satu fasa dalam volt. */
  voltageV: number;
  /** Frekuensi nominal dalam hertz, untuk ditampilkan pada meter. */
  frequencyHz: number;
  /**
   * Power factor pengganti untuk perangkat yang tidak mendefinisikan nilai
   * spesifik. Tidak boleh nol.
   */
  defaultPowerFactor: number;
  /** Rasio beban/kapasitas meter yang mulai memunculkan peringatan, 0–1. */
  warningThreshold: number;
  /**
   * Batas maksimum delta waktu yang diproses dalam satu langkah. Mencegah
   * lompatan besar saat tab kembali aktif setelah lama tidak terlihat.
   */
  maxStepSeconds: number;
  breaker: BreakerThermalConfig;
}

export interface LevelConfig {
  id: LevelId;
  name: string;
  description: string;
  /** Kapasitas kontrak meteran PLN dalam VA. */
  meterCapacityVA: number;
  /** Rating pengaman MCB dalam VA; dapat berbeda dari kapasitas meter. */
  breakerRatingVA: number;
  appliances: readonly ApplianceDefinition[];
  simulation: SimulationConfig;
}

export interface ApplianceSnapshot {
  id: ApplianceId;
  name: string;
  room: RoomId;
  isOn: boolean;
  inrushActive: boolean;
  inrushRemainingSeconds: number;
  /** Daya aktif aktual setelah memperhitungkan inrush dan status trip. */
  activePowerW: number;
  /** Daya semu aktual setelah memperhitungkan power factor. */
  apparentPowerVA: number;
  currentA: number;
  powerFactor: number;
  /** Daya standby yang masih ditarik saat saklar mati. */
  standbyPowerW: number;
}

export type MeterStatus =
  | "idle"
  | "normal"
  | "warning"
  | "overload"
  | "tripped";

export interface MeterSnapshot {
  voltageV: number;
  frequencyHz: number;
  capacityVA: number;
  activePowerW: number;
  apparentPowerVA: number;
  reactivePowerVAR: number;
  currentA: number;
  /** Power factor total, dihitung dari daya aktif / daya semu. */
  powerFactor: number;
  energyKwh: number;
  /** Rasio daya semu terhadap kapasitas meter; dapat melewati 1. */
  utilizationRatio: number;
  status: MeterStatus;
}

export interface BreakerSnapshot {
  ratingVA: number;
  /** Panas kabel 0–100. */
  wireHeat: number;
  heatState: BreakerHeatState;
  isTripped: boolean;
  canReset: boolean;
  tripCount: number;
  lastTripAtSeconds: number | null;
  lastTripReason: BreakerTripReason | null;
}

export type SimulationPhase = "ready" | "running" | "tripped" | "completed";

/** Ringkasan kondisi simulasi yang aman dikirim ke komponen UI. */
export interface GridSnapshot {
  /** Waktu simulasi yang sudah berjalan, dalam detik. */
  elapsedSeconds: number;
  phase: SimulationPhase;
  level: {
    id: LevelId;
    name: string;
    meterCapacityVA: number;
    breakerRatingVA: number;
  };
  meter: MeterSnapshot;
  breaker: BreakerSnapshot;
  appliances: readonly ApplianceSnapshot[];
}

export interface SimulationEventBase {
  atSeconds: number;
}

/**
 * Kejadian yang dikonsumsi UI untuk umpan balik edukatif. Engine menyimpan
 * antrean event sampai `drainEvents()` dipanggil agar UI tidak melewatkan trip
 * yang terjadi di antara dua frame.
 */
export type SimulationEvent =
  | (SimulationEventBase & {
      type: "breaker-tripped";
      reason: BreakerTripReason;
      loadVA: number;
      ratingVA: number;
      wireHeat: number;
    })
  | (SimulationEventBase & {
      type: "breaker-reset";
    })
  | (SimulationEventBase & {
      type: "overload-warning";
      utilizationRatio: number;
    })
  | (SimulationEventBase & {
      type: "inrush-started";
      applianceId: ApplianceId;
    })
  | (SimulationEventBase & {
      type: "level-restarted";
    });

export type EngineCommandError =
  | "appliance-not-found"
  | "breaker-not-tripped"
  | "invalid-delta-seconds";

export interface EngineResult {
  ok: boolean;
  error?: EngineCommandError;
  snapshot: GridSnapshot;
}

/**
 * Kontrak engine simulasi murni dan sinkron.
 *
 * Engine tidak memiliki timer sendiri. Pemanggil (hook UI pada T4) yang
 * mengatur `requestAnimationFrame`, menghitung delta waktu, lalu memanggil
 * `advance(deltaSeconds)`. Dengan begitu engine deterministik dan mudah diuji.
 */
export interface GridEngine {
  readonly level: LevelConfig;

  /** Snapshot kondisi saat ini; objek baru agar UI tidak memutasi state engine. */
  getSnapshot(): GridSnapshot;

  /**
   * Memajukan simulasi sebesar delta waktu. Nilai negatif atau bukan bilangan
   * hingga ditolak tanpa mengubah state. Nilai besar dipotong ke
   * `simulation.maxStepSeconds` agar model termal tetap stabil.
   */
  advance(deltaSeconds: number): GridSnapshot;

  /** Menyalakan atau mematikan perangkat berdasarkan id. */
  setApplianceOn(id: ApplianceId, isOn: boolean): EngineResult;

  /**
   * Menutup kembali MCB setelah trip. Bila beban masih di atas rating, MCB
   * boleh trip lagi setelah panas terakumulasi kembali.
   */
  resetBreaker(): EngineResult;

  /** Mengembalikan level ke kondisi awal, termasuk energi dan panas kabel. */
  restartLevel(): EngineResult;

  /** Mengambil dan mengosongkan antrean event sejak pemanggilan terakhir. */
  drainEvents(): readonly SimulationEvent[];
}

export type CreateGridEngine = (level: LevelConfig) => GridEngine;
