// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SimulationDashboard } from "./SimulationDashboard";

describe("MissionFeedback in SimulationDashboard", () => {
  it("menampilkan misi awal dan memperbarui saran saat beban overload", () => {
    vi.useFakeTimers();
    try {
      render(<SimulationDashboard />);

      expect(screen.getByText("Pagi yang nyaman, listrik tetap aman")).toBeTruthy();
      expect(screen.getByText(/Nyalakan lampu ruang tamu, lampu dapur, dan kulkas/)).toBeTruthy();

      fireEvent.click(screen.getByRole("switch", { name: "Nyalakan Pompa Air" }));
      fireEvent.click(screen.getByRole("switch", { name: "Nyalakan Setrika" }));
      fireEvent.click(screen.getByRole("switch", { name: "Nyalakan Rice Cooker" }));

      act(() => {
        vi.advanceTimersByTime(1200);
      });

      expect(screen.getByText("Beban sedang melampaui kapasitas")).toBeTruthy();
      expect(screen.getByText(/Daya semu \(VA\) lebih tinggi/)).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
