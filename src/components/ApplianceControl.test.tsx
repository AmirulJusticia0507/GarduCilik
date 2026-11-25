// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INITIAL_LEVEL } from "../data/levels";
import { createGridEngine } from "../lib/simulation/engine";
import type { ApplianceSnapshot } from "../types/grid";
import { ApplianceControl } from "./ApplianceControl";

const baseSnapshot = createGridEngine(INITIAL_LEVEL).getSnapshot();
const tv = baseSnapshot.appliances.find((item) => item.id === "tv");

if (!tv) {
  throw new Error("Fixture Televisi tidak ditemukan.");
}

afterEach(() => {
  cleanup();
});

describe("ApplianceControl", () => {
  it("menampilkan status mati beserta daya standby", () => {
    render(
      <ApplianceControl appliance={tv} isTripped={false} onToggle={vi.fn()} />,
    );

    expect(screen.getByText("Televisi")).toBeTruthy();
    expect(screen.getByText("Standby 5 W")).toBeTruthy();

    const toggle = screen.getByRole("switch", {
      name: "Nyalakan Televisi",
    });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("memanggil onToggle saat saklar ditekan", () => {
    const onToggle = vi.fn();
    render(
      <ApplianceControl appliance={tv} isTripped={false} onToggle={onToggle} />,
    );

    fireEvent.click(
      screen.getByRole("switch", { name: "Nyalakan Televisi" }),
    );
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("menampilkan status menyala dan daya aktual", () => {
    const onTv: ApplianceSnapshot = {
      ...tv,
      isOn: true,
      standbyPowerW: 0,
      activePowerW: 80,
      apparentPowerVA: 80 / 0.9,
    };

    render(
      <ApplianceControl appliance={onTv} isTripped={false} onToggle={vi.fn()} />,
    );

    expect(screen.getByText("Menyala")).toBeTruthy();
    expect(screen.getByText("80 W · 89 VA")).toBeTruthy();
    expect(
      screen.getByRole("switch", { name: "Matikan Televisi" }).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
  });

  it("menampilkan badge arus awal saat inrush aktif", () => {
    render(
      <ApplianceControl
        appliance={{
          ...tv,
          isOn: true,
          inrushActive: true,
          inrushRemainingSeconds: 0.4,
        }}
        isTripped={false}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText("Arus awal")).toBeTruthy();
  });

  it("menampilkan status terputus saat MCB trip", () => {
    render(
      <ApplianceControl
        appliance={{
          ...tv,
          isOn: true,
          activePowerW: 0,
          apparentPowerVA: 0,
        }}
        isTripped
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText("Terputus")).toBeTruthy();
    expect(screen.getByText("Tidak ada aliran daya")).toBeTruthy();
  });
});
