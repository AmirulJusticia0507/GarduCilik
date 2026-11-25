import { DEFAULT_SIMULATION_CONFIG } from "../lib/simulation/defaults";
import type { LevelConfig } from "../types/grid";

/**
 * Level awal MVP: rumah satu lantai dengan meteran 1300 VA.
 *
 * Nilai daya mendekati perangkat rumah tangga umum, tetapi disederhanakan untuk
 * simulasi edukasi. Perangkat yang dimatikan dapat tetap menarik daya standby
 * agar pemain mengenali konsumsi "vampire power".
 */
export const INITIAL_LEVEL: LevelConfig = {
  id: "level-1-1300va",
  name: "Rumah Hemat Energi",
  description:
    "Kelola perangkat rumah agar beban tetap di bawah kapasitas meteran 1300 VA dan MCB tidak turun.",
  mission: {
    title: "Pagi yang nyaman, listrik tetap aman",
    description:
      "Nyalakan lampu ruang tamu, lampu dapur, dan kulkas. Jaga beban di bawah 1.300 VA dan hindari MCB turun selama simulasi.",
    targetDurationSeconds: 60,
    targetMaxEnergyKwh: 0.05,
    targetMaxTrips: 0,
    requiredApplianceIds: ["lamp-living-room", "lamp-kitchen", "fridge"],
  },
  meterCapacityVA: 1300,
  breakerRatingVA: 1300,
  appliances: [
    {
      id: "lamp-living-room",
      name: "Lampu Ruang Tamu",
      category: "lighting",
      room: "living-room",
      ratedPowerW: 18,
      powerFactor: 1,
      standbyPowerW: 0,
      initiallyOn: false,
      essential: true,
      educationNote:
        "Lampu LED kecil memakai daya jauh lebih rendah daripada lampu pijar. Matikan saat ruangan tidak dipakai.",
    },
    {
      id: "tv",
      name: "Televisi",
      category: "electronics",
      room: "living-room",
      ratedPowerW: 80,
      powerFactor: 0.9,
      standbyPowerW: 5,
      initiallyOn: false,
      essential: false,
      educationNote:
        "Televisi yang dimatikan dengan remote masih menarik daya standby bila tercolok. Cabut atau matikan sakelar utamanya.",
    },
    {
      id: "fan",
      name: "Kipas Angin",
      category: "motor",
      room: "living-room",
      ratedPowerW: 45,
      powerFactor: 0.9,
      standbyPowerW: 0,
      inrush: { multiplier: 2.5, durationSeconds: 0.6 },
      initiallyOn: false,
      essential: false,
      educationNote:
        "Motor kipas menarik arus awal lebih besar saat dinyalakan, lalu kembali ke daya normal.",
    },
    {
      id: "lamp-kitchen",
      name: "Lampu Dapur",
      category: "lighting",
      room: "kitchen",
      ratedPowerW: 12,
      powerFactor: 1,
      standbyPowerW: 0,
      initiallyOn: false,
      essential: true,
      educationNote:
        "Penerangan dapur termasuk kebutuhan penting, tetapi tetap bisa diatur agar tidak menyala tanpa perlu.",
    },
    {
      id: "fridge",
      name: "Kulkas",
      category: "cooling",
      room: "kitchen",
      ratedPowerW: 130,
      powerFactor: 0.85,
      standbyPowerW: 0,
      inrush: { multiplier: 3, durationSeconds: 1.5 },
      initiallyOn: false,
      essential: true,
      educationNote:
        "Kompresor kulkas membutuhkan lonjakan arus saat mulai bekerja. Hindari menyalakan banyak perangkat bermotor bersamaan.",
    },
    {
      id: "rice-cooker",
      name: "Rice Cooker",
      category: "kitchen",
      room: "kitchen",
      ratedPowerW: 450,
      powerFactor: 1,
      standbyPowerW: 1,
      initiallyOn: false,
      essential: false,
      educationNote:
        "Alat pemanas berdaya besar. Nyalakan bergantian dengan setrika atau pompa air agar beban tidak menumpuk.",
    },
    {
      id: "water-pump",
      name: "Pompa Air",
      category: "motor",
      room: "bathroom",
      ratedPowerW: 300,
      powerFactor: 0.75,
      standbyPowerW: 0,
      inrush: { multiplier: 4, durationSeconds: 1 },
      initiallyOn: false,
      essential: false,
      educationNote:
        "Pompa air adalah salah satu perangkat dengan arus awal paling besar. Nyalakan saat perangkat pemanas sudah dimatikan.",
    },
    {
      id: "iron",
      name: "Setrika",
      category: "utility",
      room: "bedroom",
      ratedPowerW: 450,
      powerFactor: 1,
      standbyPowerW: 0,
      initiallyOn: false,
      essential: false,
      educationNote:
        "Setrika memakai daya besar dan menjadi panas. Simulasikan mematikan perangkat lain sebelum menyalakannya.",
    },
    {
      id: "phone-charger",
      name: "Charger Ponsel",
      category: "electronics",
      room: "bedroom",
      ratedPowerW: 10,
      powerFactor: 0.9,
      standbyPowerW: 1,
      initiallyOn: false,
      essential: false,
      educationNote:
        "Charger yang masih tercolok dapat menarik daya kecil meskipun ponsel sudah penuh.",
    },
  ],
  simulation: DEFAULT_SIMULATION_CONFIG,
};
