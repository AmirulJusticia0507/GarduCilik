// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SIMULATION_CONFIG } from "../lib/simulation/defaults";
import type { LevelConfig } from "../types/grid";
import { useGridEngine } from "./useGridEngine";

const level: LevelConfig = {
  id: "hook-level",
  name: "Level Hook",
  description: "Level untuk pengujian hook.",
  meterCapacityVA: 1300,
  breakerRatingVA: 1300,
  appliances: [
    {
      id: "lamp",
      name: "Lampu",
      category: "lighting",
      room: "living-room",
      ratedPowerW: 20,
      powerFactor: 1,
      standbyPowerW: 0,
      initiallyOn: false,
      essential: true,
    },
    {
      id: "pump",
      name: "Pompa",
      category: "motor",
      room: "bathroom",
      ratedPowerW: 300,
      powerFactor: 0.75,
      standbyPowerW: 0,
      inrush: { multiplier: 4, durationSeconds: 1 },
      initiallyOn: false,
      essential: false,
    },
  ],
  simulation: DEFAULT_SIMULATION_CONFIG,
};

function advanceFrames(milliseconds: number): void {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useGridEngine", () => {
  it("memajukan engine lewat requestAnimationFrame dan mempublikasikan snapshot", () => {
    const { result } = renderHook(() => useGridEngine(level));

    act(() => {
      result.current.setApplianceOn("lamp", true);
    });

    expect(result.current.snapshot.meter.activePowerW).toBeCloseTo(20, 6);
    expect(result.current.snapshot.phase).toBe("running");

    advanceFrames(200);

    expect(result.current.snapshot.elapsedSeconds).toBeGreaterThan(0);
    expect(result.current.snapshot.meter.energyKwh).toBeGreaterThan(0);
    expect(result.current.runtimeStatus).toBe("running");
  });

  it("berhenti memajukan waktu saat dijeda dan melanjutkan setelahnya", () => {
    const { result } = renderHook(() => useGridEngine(level));

    advanceFrames(200);
    const elapsedBeforePause = result.current.snapshot.elapsedSeconds;

    act(() => {
      result.current.setPaused(true);
    });
    expect(result.current.runtimeStatus).toBe("paused");

    advanceFrames(500);
    expect(result.current.snapshot.elapsedSeconds).toBe(elapsedBeforePause);

    act(() => {
      result.current.setPaused(false);
    });
    advanceFrames(200);

    expect(result.current.snapshot.elapsedSeconds).toBeGreaterThan(
      elapsedBeforePause,
    );
  });

  it("membatalkan animation frame saat komponen unmount", () => {
    const cancelSpy = vi.spyOn(globalThis, "cancelAnimationFrame");
    const { result, unmount } = renderHook(() => useGridEngine(level));

    advanceFrames(150);
    const elapsedBeforeUnmount = result.current.snapshot.elapsedSeconds;

    unmount();
    expect(cancelSpy).toHaveBeenCalled();

    advanceFrames(500);
    expect(result.current.snapshot.elapsedSeconds).toBe(elapsedBeforeUnmount);
  });

  it("menghentikan loop saat tab tersembunyi dan melanjutkan saat terlihat", () => {
    let visibility: DocumentVisibilityState = "visible";
    const visibilitySpy = vi
      .spyOn(document, "visibilityState", "get")
      .mockImplementation(() => visibility);

    const { result } = renderHook(() => useGridEngine(level));

    advanceFrames(150);
    const elapsedWhileVisible = result.current.snapshot.elapsedSeconds;

    visibility = "hidden";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.runtimeStatus).toBe("tab-hidden");
    advanceFrames(400);
    expect(result.current.snapshot.elapsedSeconds).toBe(elapsedWhileVisible);

    visibility = "visible";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advanceFrames(200);

    expect(result.current.runtimeStatus).toBe("running");
    expect(result.current.snapshot.elapsedSeconds).toBeGreaterThan(
      elapsedWhileVisible,
    );

    visibilitySpy.mockRestore();
  });

  it("mengubah saklar perangkat dan mengumpulkan event inrush", () => {
    const { result } = renderHook(() => useGridEngine(level));

    act(() => {
      const command = result.current.toggleAppliance("pump");
      expect(command.ok).toBe(true);
    });

    expect(result.current.snapshot.appliances[1]).toMatchObject({
      id: "pump",
      isOn: true,
      inrushActive: true,
    });
    expect(
      result.current.events.some((event) => event.type === "inrush-started"),
    ).toBe(true);

    act(() => {
      result.current.toggleAppliance("pump");
    });

    expect(result.current.snapshot.appliances[1].isOn).toBe(false);
    expect(result.current.snapshot.meter.activePowerW).toBe(0);
  });

  it("mengembalikan error reset MCB dan mereset level", () => {
    const { result } = renderHook(() => useGridEngine(level));

    act(() => {
      result.current.setApplianceOn("lamp", true);
    });
    advanceFrames(200);

    act(() => {
      const reset = result.current.resetBreaker();
      expect(reset.ok).toBe(false);
      expect(reset.error).toBe("breaker-not-tripped");
    });

    act(() => {
      const restart = result.current.restartLevel();
      expect(restart.ok).toBe(true);
    });

    expect(result.current.snapshot.elapsedSeconds).toBe(0);
    expect(result.current.snapshot.meter.energyKwh).toBe(0);
    expect(result.current.snapshot.appliances[0].isOn).toBe(false);
    expect(result.current.events.map((event) => event.type)).toContain(
      "level-restarted",
    );
  });

  it("menjaga referensi level yang stabil agar engine tidak dibuat ulang", () => {
    const { result, rerender } = renderHook(() => useGridEngine(level));

    act(() => {
      result.current.setApplianceOn("lamp", true);
    });
    advanceFrames(150);
    const elapsed = result.current.snapshot.elapsedSeconds;

    rerender();

    expect(result.current.snapshot.elapsedSeconds).toBeGreaterThanOrEqual(
      elapsed,
    );
    expect(result.current.snapshot.appliances[0].isOn).toBe(true);
  });
});
