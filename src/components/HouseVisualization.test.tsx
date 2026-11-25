// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createGridEngine } from "../lib/simulation/engine";
import { INITIAL_LEVEL } from "../data/levels";
import { HouseVisualization } from "./HouseVisualization";

describe("HouseVisualization", () => {
  it("menampilkan denah dan status perangkat", () => {
    const snapshot = createGridEngine(INITIAL_LEVEL).getSnapshot();

    render(
      <HouseVisualization appliances={snapshot.appliances} isPowered />,
    );

    expect(screen.getByRole("img", { name: /Denah rumah dan jalur listrik/ })).toBeTruthy();
    expect(screen.getByText("Ruang Tamu")).toBeTruthy();
    expect(screen.getByLabelText("Kulkas, mati")).toBeTruthy();
  });

  it("menyatakan semua jalur padam saat MCB terputus", () => {
    const snapshot = createGridEngine(INITIAL_LEVEL).getSnapshot();

    render(
      <HouseVisualization appliances={snapshot.appliances} isPowered={false} />,
    );

    expect(
      screen.getByText("MCB terputus; semua jalur listrik sedang padam."),
    ).toBeTruthy();
  });
});
