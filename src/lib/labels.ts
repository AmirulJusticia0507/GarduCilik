import type {
  BreakerHeatState,
  MeterStatus,
  RoomId,
} from "../types/grid";

export const ROOM_LABELS: Record<RoomId, string> = {
  "living-room": "Ruang Tamu",
  kitchen: "Dapur",
  bedroom: "Kamar",
  bathroom: "Kamar Mandi",
  terrace: "Teras",
  garage: "Garasi",
};

export const ROOM_ORDER: readonly RoomId[] = [
  "living-room",
  "kitchen",
  "bedroom",
  "bathroom",
  "terrace",
  "garage",
];

export const METER_STATUS_LABELS: Record<MeterStatus, string> = {
  idle: "Siap",
  normal: "Aman",
  warning: "Waspada",
  overload: "Overload",
  tripped: "MCB Trip",
};

export const HEAT_STATE_LABELS: Record<BreakerHeatState, string> = {
  cool: "Dingin",
  warm: "Hangat",
  hot: "Panas",
  critical: "Kritis",
  tripped: "Terputus",
};
