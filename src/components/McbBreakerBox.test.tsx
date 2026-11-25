// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INITIAL_LEVEL } from "../data/levels";
import { createGridEngine } from "../lib/simulation/engine";
import type { BreakerSnapshot } from "../types/grid";
import { McbBreakerBox } from "./McbBreakerBox";

const baseBreaker = createGridEngine(INITIAL_LEVEL).getSnapshot().breaker;

afterEach(() => {
  cleanup();
});

describe("McbBreakerBox", () => {
  it("menonaktifkan tombol saat MCB belum trip", () => {
    render(<McbBreakerBox breaker={baseBreaker} onReset={vi.fn()} />);

    const button = screen.getByRole("button", { name: "MCB aktif" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Dingin")).toBeTruthy();
    expect(
      screen.getByRole("progressbar", { name: "Panas kabel MCB" }),
    ).toBeTruthy();
  });

  it("mengaktifkan reset dan memanggil handler saat MCB trip", () => {
    const onReset = vi.fn();
    const tripped: BreakerSnapshot = {
      ...baseBreaker,
      isTripped: true,
      canReset: true,
      heatState: "tripped",
      wireHeat: 100,
      tripCount: 1,
      lastTripAtSeconds: 12,
      lastTripReason: "overload",
    };

    render(<McbBreakerBox breaker={tripped} onReset={onReset} />);

    expect(screen.getByText("Terputus")).toBeTruthy();
    expect(screen.getByText(/Sudah trip 1 kali/i)).toBeTruthy();
    expect(screen.getByText(/Aliran listrik terputus/i)).toBeTruthy();

    const button = screen.getByRole("button", { name: "Reset MCB" });
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("menampilkan status kritis pada panas kabel tinggi", () => {
    render(
      <McbBreakerBox
        breaker={{
          ...baseBreaker,
          wireHeat: 90,
          heatState: "critical",
        }}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("Kritis")).toBeTruthy();
    expect(screen.getByText("90 / 100")).toBeTruthy();
  });
});
