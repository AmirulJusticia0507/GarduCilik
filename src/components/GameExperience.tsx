"use client";

import { useCallback, useState } from "react";
import { INITIAL_LEVEL } from "../data/levels";
import { ClassroomPortal } from "./ClassroomPortal";
import { SimulationDashboard } from "./SimulationDashboard";
import type { ApiSession } from "../lib/api";
import type { LevelConfig } from "../types/grid";

export function GameExperience() {
  const [level, setLevel] = useState(INITIAL_LEVEL);
  const [scenarioId, setScenarioId] = useState("");
  const [session, setSession] = useState<ApiSession | null>(null);
  const [classroomId, setClassroomId] = useState("");

  const changeLevel = useCallback((nextLevel: LevelConfig, nextScenarioId: string) => {
    setLevel(nextLevel);
    setScenarioId(nextScenarioId);
    setSession((current) => current
      ? { ...current, scenarioId: nextScenarioId }
      : null,
    );
  }, []);

  const changeSession = useCallback((next: ApiSession | null) => {
    setSession(next && scenarioId ? { ...next, scenarioId } : null);
  }, [scenarioId]);

  return (
    <main className="min-h-dvh bg-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-emerald-700 uppercase">GarduCilik</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{level.name}</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">{level.description}</p>
          </div>
          <p className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
            {scenarioId ? "Skenario kelas" : "Level lokal"} · {level.meterCapacityVA.toLocaleString("id-ID")} VA
          </p>
        </header>

        <ClassroomPortal
          onLevelChange={changeLevel}
          onSessionChange={changeSession}
          classroomId={classroomId}
          onClassroomChange={setClassroomId}
        />
        <SimulationDashboard key={level.id} level={level} session={session} />

        <footer className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-relaxed text-slate-600">
          <strong className="font-semibold text-slate-800">Catatan edukasi:</strong>{" "}
          Simulasi ini menyederhanakan perilaku kelistrikan untuk pembelajaran.
          Nilainya bukan panduan pemasangan, perhitungan, atau keputusan
          keselamatan instalasi listrik di dunia nyata.
        </footer>
      </div>
    </main>
  );
}
