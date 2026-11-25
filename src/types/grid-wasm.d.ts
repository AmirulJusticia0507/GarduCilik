import type { LevelConfig } from "./grid";

/** Bentuk modul Embind yang dihasilkan build Emscripten. */
export interface GridWasmModule {
  createGridEngine?: (configJson: string) => unknown;
  default?: () => Promise<GridWasmModule>;
  destroy?: () => void;
}

export type GridWasmFactory = (
  level: LevelConfig,
) => Promise<import("./grid").GridEngine>;
