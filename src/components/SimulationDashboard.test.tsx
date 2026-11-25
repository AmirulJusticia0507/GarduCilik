// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SimulationDashboard } from "./SimulationDashboard";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SimulationDashboard", () => {
  it("menghubungkan saklar perangkat ke meteran PLN", () => {
    render(<SimulationDashboard />);

    const meter = screen.getByRole("region", {
      name: "Rumah Hemat Energi",
    });

    expect(within(meter).getByText("7 W")).toBeTruthy();
    expect(within(meter).getByText("Aman")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("switch", { name: "Nyalakan Televisi" }),
    );

    expect(
      screen.getByRole("switch", { name: "Matikan Televisi" }).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
    expect(within(meter).getByText("82 W")).toBeTruthy();

    fireEvent.click(screen.getByRole("switch", { name: "Matikan Televisi" }));
    expect(within(meter).getByText("7 W")).toBeTruthy();
  });

  it("menjeda simulasi tanpa mereset pembacaan", () => {
    render(<SimulationDashboard />);

    const pauseButton = screen.getByRole("button", { name: "Jeda" });
    fireEvent.click(pauseButton);

    expect(screen.getByRole("button", { name: "Lanjutkan" })).toBeTruthy();
    expect(screen.getByText("Simulasi dijeda")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    expect(screen.getByRole("button", { name: "Jeda" })).toBeTruthy();
  });

  it("mengembalikan perangkat ke kondisi awal lewat tombol mulai ulang", () => {
    render(<SimulationDashboard />);

    fireEvent.click(
      screen.getByRole("switch", { name: "Nyalakan Lampu Ruang Tamu" }),
    );
    expect(
      screen.getByRole("switch", { name: "Matikan Lampu Ruang Tamu" }),
    ).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Mulai ulang" }));
    });

    expect(
      screen.getByRole("switch", { name: "Nyalakan Lampu Ruang Tamu" }),
    ).toBeTruthy();
  });
});
