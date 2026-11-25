"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createGridEngine } from "../lib/simulation/engine";
import {
  loadGridEngine,
  type EngineLoadStatus,
} from "../lib/simulation/wasm-loader";
import type {
  ApplianceId,
  EngineResult,
  GridSnapshot,
  LevelConfig,
  SimulationEvent,
} from "../types/grid";

/** UI meter cukup diperbarui 20 kali per detik; engine tetap maju tiap frame. */
const PUBLISH_INTERVAL_MS = 50;

export type GridRuntimeStatus =
  | "loading"
  | "running"
  | "paused"
  | "tab-hidden"
  | "error";

export interface UseGridEngineResult {
  /** Snapshot terakhir yang dipublikasikan ke React. */
  snapshot: GridSnapshot;
  /**
   * Status lifecycle runtime, terpisah dari fase simulasi di snapshot.
   * `tab-hidden` berarti loop dijeda otomatis oleh browser.
   */
  runtimeStatus: GridRuntimeStatus;
  /** Event terbaru sejak update terakhir; dapat berisi lebih dari satu event. */
  events: readonly SimulationEvent[];
  isPaused: boolean;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  clearEvents: () => void;
  setApplianceOn: (id: ApplianceId, isOn: boolean) => EngineResult;
  toggleAppliance: (id: ApplianceId) => EngineResult;
  resetBreaker: () => EngineResult;
  restartLevel: () => EngineResult;
  /** Status sumber engine agar fallback lokal tidak disalahartikan sebagai WASM. */
  engineStatus: EngineLoadStatus;
  engineSource: "wasm" | "typescript";
  engineError: Error | null;
}

/**
 * Menghubungkan engine simulasi ke lifecycle React.
 *
 * - Waktu dihitung dari timestamp `requestAnimationFrame`, bukan interval.
 * - Delta waktu dibatasi oleh engine (`maxStepSeconds`) agar tab yang lama
 *   tidak terlihat tidak membuat simulasi melompat.
 * - Render React di-throttle, sedangkan engine tetap maju setiap frame.
 * - Loop berhenti saat komponen unmount, saat dijeda, atau saat tab tersembunyi.
 *
 * `level` dibaca saat komponen pertama kali di-mount. Untuk memulai level lain,
 * remount komponen pemakai hook (misalnya dengan mengubah `key`); ini menjaga
 * agar engine tidak dibuat ulang tanpa sengaja pada setiap render.
 */
export function useGridEngine(level: LevelConfig): UseGridEngineResult {
  const [engine, setEngine] = useState(() => createGridEngine(level));
  const [engineStatus, setEngineStatus] = useState<EngineLoadStatus>("loading");
  const [engineSource, setEngineSource] = useState<"wasm" | "typescript">(
    "typescript",
  );
  const [engineError, setEngineError] = useState<Error | null>(null);
  const [snapshot, setSnapshot] = useState<GridSnapshot>(() =>
    engine.getSnapshot(),
  );
  const [events, setEvents] = useState<readonly SimulationEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () =>
      typeof document === "undefined" ||
      document.visibilityState === "visible",
  );

  const lastTimestampRef = useRef<number | null>(null);
  const lastPublishRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Engine loading is an external async resource; these state updates are
    // intentional and are guarded by the cancellation flag below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEngineStatus("loading");
    setEngineError(null);

    void loadGridEngine(level).then((loaded) => {
      if (cancelled) {
        return;
      }
      setEngine(loaded.engine);
      setEngineStatus(loaded.status);
      setEngineSource(loaded.source);
      setEngineError(loaded.error);
      setSnapshot(loaded.engine.getSnapshot());
      setEvents([]);
      lastTimestampRef.current = null;
      lastPublishRef.current = 0;
    });

    return () => {
      cancelled = true;
    };
  }, [level]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === "visible");
      lastTimestampRef.current = null;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    lastTimestampRef.current = null;
    lastPublishRef.current = 0;
  }, [isPaused]);

  useEffect(() => {
    if (isPaused || !isDocumentVisible) {
      return;
    }

    let cancelled = false;

    const publish = () => {
      setSnapshot(engine.getSnapshot());

      const drained = engine.drainEvents();
      if (drained.length > 0) {
        setEvents(drained);
      }
    };

    const tick = (timestamp: number) => {
      if (cancelled) {
        return;
      }

      const previousTimestamp = lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      if (previousTimestamp !== null) {
        const deltaSeconds = Math.max(
          (timestamp - previousTimestamp) / 1000,
          0,
        );

        if (deltaSeconds > 0) {
          engine.advance(deltaSeconds);
        }
      }

      if (timestamp - lastPublishRef.current >= PUBLISH_INTERVAL_MS) {
        lastPublishRef.current = timestamp;
        publish();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      lastTimestampRef.current = null;
    };
  }, [engine, isPaused, isDocumentVisible]);

  const commitResult = useCallback(
    (result: EngineResult): EngineResult => {
      setSnapshot(result.snapshot);

      const drained = engine.drainEvents();
      if (drained.length > 0) {
        setEvents(drained);
      }

      return result;
    },
    [engine],
  );

  const setApplianceOn = useCallback(
    (id: ApplianceId, isOn: boolean): EngineResult =>
      commitResult(engine.setApplianceOn(id, isOn)),
    [commitResult, engine],
  );

  const toggleAppliance = useCallback(
    (id: ApplianceId): EngineResult => {
      const appliance = engine
        .getSnapshot()
        .appliances.find((item) => item.id === id);

      return commitResult(
        engine.setApplianceOn(id, appliance ? !appliance.isOn : true),
      );
    },
    [commitResult, engine],
  );

  const resetBreaker = useCallback(
    (): EngineResult => commitResult(engine.resetBreaker()),
    [commitResult, engine],
  );

  const restartLevel = useCallback((): EngineResult => {
    lastTimestampRef.current = null;
    lastPublishRef.current = 0;
    return commitResult(engine.restartLevel());
  }, [commitResult, engine]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const setPaused = useCallback((paused: boolean) => {
    setIsPaused(paused);
  }, []);

  const togglePaused = useCallback(() => {
    setIsPaused((paused) => !paused);
  }, []);

  const runtimeStatus: GridRuntimeStatus = engineStatus === "error"
    ? "error"
    : isPaused
      ? "paused"
      : isDocumentVisible
        ? "running"
        : "tab-hidden";

  return {
    snapshot,
    runtimeStatus,
    events,
    isPaused,
    setPaused,
    togglePaused,
    clearEvents,
    setApplianceOn,
    toggleAppliance,
    resetBreaker,
    restartLevel,
    engineStatus,
    engineSource,
    engineError,
  };
}
