// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { INITIAL_LEVEL } from "../data/levels";
import { createGridEngine } from "../lib/simulation/engine";
import type { GridSnapshot, MeterStatus } from "../types/grid";
import { PlnMeterPanel } from "./PlnMeterPanel";

const baseSnapshot = createGridEngine(INITIAL_LEVEL).getSnapshot();

function snapshotWithMeter(
  status: MeterStatus,
  overrides: Partial<GridSnapshot["meter"]> = {},
): GridSnapshot {
  return {
    ...baseSnapshot,
    meter: {
      ...baseSnapshot.meter,
      status,
      ...overrides,
    },
  };
}

afterEach(() => {
  cleanup();
});

describe("PlnMeterPanel", () => {
  it("menampilkan kapasitas, energi, dan pembacaan daya meter", () => {
    render(<PlnMeterPanel snapshot={baseSnapshot} />);

    expect(
      screen.getByRole("heading", { name: "Rumah Hemat Energi" }),
    ).toBeTruthy();
    expect(screen.getByText("Kapasitas 1.300 VA")).toBeTruthy();
    expect(screen.getByText("Aman")).toBeTruthy();
    expect(screen.getByText("Energi terpakai")).toBeTruthy();

    const progress = screen.getByRole("progressbar", {
      name: "Penggunaan kapasitas meter",
    });
    expect(progress.getAttribute("aria-valuenow")).toBe(
      String(Math.round(baseSnapshot.meter.utilizationRatio * 100)),
    );
  });

  it("menampilkan peringatan saat beban mendekati kapasitas", () => {
    render(
      <PlnMeterPanel
        snapshot={snapshotWithMeter("warning", {
          utilizationRatio: 0.86,
          status: "warning",
        })}
      />,
    );

    expect(screen.getByText("Waspada")).toBeTruthy();
    expect(
      screen.getByText(/Beban mendekati kapasitas meter/i),
    ).toBeTruthy();
    expect(screen.getByText("86%")).toBeTruthy();
  });

  it("menjepit lebar bar tetapi tetap menampilkan persentase overload", () => {
    render(
      <PlnMeterPanel
        snapshot={snapshotWithMeter("overload", {
          utilizationRatio: 1.3,
          apparentPowerVA: 1690,
          status: "overload",
        })}
      />,
    );

    expect(screen.getByText("Overload")).toBeTruthy();
    expect(screen.getByText("130%")).toBeTruthy();

    const progress = screen.getByRole("progressbar", {
      name: "Penggunaan kapasitas meter",
    });
    expect(progress.getAttribute("aria-valuenow")).toBe("100");
    expect(progress.getAttribute("aria-valuetext")).toContain("130%");
  });

  it("menampilkan pesan khusus saat MCB trip", () => {
    render(
      <PlnMeterPanel
        snapshot={snapshotWithMeter("tripped", {
          activePowerW: 0,
          apparentPowerVA: 0,
          utilizationRatio: 0,
          status: "tripped",
        })}
      />,
    );

    expect(screen.getByText("MCB Trip")).toBeTruthy();
    expect(screen.getByText(/MCB memutus aliran listrik/i)).toBeTruthy();
  });
});
