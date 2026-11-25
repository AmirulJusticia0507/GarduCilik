import type { GridEngine, LevelConfig } from "../../types/grid";
import { createGridEngine } from "./engine";

export type EngineLoadStatus = "loading" | "ready" | "fallback" | "error";

export interface LoadedEngine {
  engine: GridEngine;
  status: Exclude<EngineLoadStatus, "loading">;
  error: Error | null;
  source: "wasm" | "typescript";
}

/**
 * Memuat glue module Emscripten secara client-only.
 *
 * Kontrak JSON sengaja dikirim sebagai string agar binding Embind tidak perlu
 * mengetahui tipe TypeScript. Jika artefak belum dibangun, simulator tetap
 * bisa dimainkan memakai engine TS deterministik dan UI menerima status
 * `fallback`; data simulasi tidak pernah dipalsukan sebagai hasil WASM.
 */
export async function loadGridEngine(level: LevelConfig): Promise<LoadedEngine> {
  try {
    const moduleName = "/wasm/grid_engine.js";
    const loaded = (await import(/* webpackIgnore: true */ moduleName)) as {
      default?: (options?: { locateFile?: (file: string) => string }) =>
        Promise<{
          createGridEngine?: (configJson: string) => GridEngine;
        }>;
    };
    const wasmModule: {
      createGridEngine?: (configJson: string) => GridEngine;
    } = loaded.default
      ? await loaded.default({
          locateFile: (file) => `/wasm/${file}`,
        })
      : (loaded as {
          createGridEngine?: (configJson: string) => GridEngine;
        });
    const factory = wasmModule.createGridEngine;

    if (typeof factory !== "function") {
      throw new Error("Modul WASM tidak menyediakan createGridEngine.");
    }

    const engine = factory(JSON.stringify(level));
    if (!engine || typeof engine.advance !== "function") {
      throw new Error("Engine WASM mengembalikan objek yang tidak valid.");
    }

    return { engine, status: "ready", error: null, source: "wasm" };
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    return {
      engine: createGridEngine(level),
      status: "fallback",
      error,
      source: "typescript",
    };
  }
}
