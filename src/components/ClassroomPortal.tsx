"use client";

import { useEffect, useState } from "react";
import { INITIAL_LEVEL } from "../data/levels";
import {
  apiRequest,
  scenarioToLevel,
  type ApiScenario,
  type ApiSession,
} from "../lib/api";
import type { LevelConfig } from "../types/grid";

interface ClassroomPortalProps {
  onLevelChange: (level: LevelConfig, scenarioId: string) => void;
  onSessionChange: (session: ApiSession | null) => void;
  classroomId: string;
  onClassroomChange: (id: string) => void;
}

interface AuthResponse {
  token: string;
  classroom_id?: string;
  user: { id: string; name: string; role: "teacher" | "student" };
}

interface LeaderboardEntry {
  user_id: string;
  name: string;
  score: number;
  total_kwh_used: number;
  trip_count: number;
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const buttonClass =
  "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

export function ClassroomPortal({
  onLevelChange,
  onSessionChange,
  classroomId,
  onClassroomChange,
}: ClassroomPortalProps) {
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [token, setToken] = useState("");
  const [userName, setUserName] = useState("");
  const [scenarios, setScenarios] = useState<ApiScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [className, setClassName] = useState("");
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    void apiRequest<{ scenarios: ApiScenario[] }>("/api/v1/scenarios")
      .then(({ scenarios: available }) => {
        setScenarios(available);
        setSelectedScenario((current) => current || available[0]?.id || "");
      })
      .catch(() => setMessage("API belum tersambung. Mode simulasi lokal tetap tersedia."));

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!selectedScenario) return;
    const selected = scenarios.find((scenario) => scenario.id === selectedScenario);
    if (selected) onLevelChange(scenarioToLevel(selected), selected.id);
  }, [onLevelChange, scenarios, selectedScenario]);

  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Menghubungkan ke layanan kelas...");
    try {
      const path = role === "teacher"
        ? mode === "register"
          ? "/api/v1/auth/teacher/register"
          : "/api/v1/auth/teacher/login"
        : "/api/v1/auth/student/join";
      const payload = role === "student"
        ? { name, join_code: joinCode }
        : mode === "register"
          ? { name, email, password }
          : { email, password };
      const result = await apiRequest<AuthResponse>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setToken(result.token);
      setUserName(result.user.name);
      const nextClassroom = result.classroom_id ?? "";
      onClassroomChange(nextClassroom);
      onSessionChange({
        token: result.token,
        scenarioId: selectedScenario || INITIAL_LEVEL.id,
        ...(nextClassroom ? { classroomId: nextClassroom } : {}),
      });
      setMessage(`Masuk sebagai ${result.user.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? apiErrorLabel(error.message) : "Tidak dapat menghubungi API.");
    }
  }

  async function createClassroom() {
    try {
      const result = await apiRequest<{ id: string; join_code: string }>("/api/v1/classrooms", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: className }),
      });
      onClassroomChange(result.id);
      setMessage(`Kelas dibuat. Kode bergabung: ${result.join_code}`);
    } catch (error) {
      setMessage(error instanceof Error ? apiErrorLabel(error.message) : "Kelas gagal dibuat.");
    }
  }

  async function createScenario() {
    try {
      const result = await apiRequest<ApiScenario>("/api/v1/scenarios", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: scenarioTitle,
          difficulty: "easy",
          is_public: true,
          grid_config: {
            mcb_limit_va: INITIAL_LEVEL.meterCapacityVA,
            duration_seconds: INITIAL_LEVEL.mission.targetDurationSeconds,
            target_max_kwh: INITIAL_LEVEL.mission.targetMaxEnergyKwh,
            has_solar: false,
            appliances: INITIAL_LEVEL.appliances.map((appliance) => ({
              id: appliance.id,
              watt: appliance.ratedPowerW,
              inrush: appliance.inrush?.multiplier ?? 1,
              standby_watt: appliance.standbyPowerW,
            })),
          },
        }),
      });
      setScenarios((items) => [result, ...items]);
      setSelectedScenario(result.id);
      setMessage("Skenario tersimpan dan tersedia untuk dipilih.");
    } catch (error) {
      setMessage(error instanceof Error ? apiErrorLabel(error.message) : "Skenario gagal dibuat.");
    }
  }

  async function loadLeaderboard() {
    if (!classroomId) return;
    try {
      const result = await apiRequest<{ leaderboard: LeaderboardEntry[] }>(
        `/api/v1/classrooms/${classroomId}/leaderboard`,
      );
      setLeaderboard(result.leaderboard);
      setMessage("Papan peringkat diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? apiErrorLabel(error.message) : "Peringkat belum tersedia.");
    }
  }

  return (
    <section aria-labelledby="classroom-portal-heading" className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">Mode kelas</p>
          <h2 id="classroom-portal-heading" className="mt-1 text-xl font-semibold text-slate-900">Akun, skenario, dan progres</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isOnline ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
          {isOnline ? "Online · API terbaru" : "Offline · simulasi lokal tersedia"}
        </span>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Skenario
            <select className={`${inputClass} mt-1`} value={selectedScenario} onChange={(event) => {
              const id = event.target.value;
              setSelectedScenario(id);
              if (!id) {
                onLevelChange(INITIAL_LEVEL, "");
                onSessionChange(null);
              } else if (token && role === "student") {
                onSessionChange({ token, scenarioId: id, ...(classroomId ? { classroomId } : {}) });
              }
            }}>
              <option value="">Level lokal — Rumah Hemat Energi</option>
              {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.title} · {scenario.difficulty}</option>)}
            </select>
          </label>

          {token ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-emerald-50 p-4">
              <p className="text-sm text-emerald-950">Masuk sebagai <strong>{userName}</strong> ({role}).</p>
              <button type="button" onClick={() => {
                setToken(""); setUserName(""); onClassroomChange(""); onSessionChange(null); setMessage("Anda telah keluar.");
              }} className="text-sm font-semibold text-emerald-800 underline">Keluar</button>
            </div>
          ) : (
            <form onSubmit={authenticate} className="space-y-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-wrap gap-2">
                {(["student", "teacher"] as const).map((item) => (
                  <button key={item} type="button" aria-pressed={role === item} onClick={() => setRole(item)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${role === item ? "bg-emerald-700 text-white" : "bg-white text-slate-700"}`}>
                    {item === "student" ? "Siswa" : "Guru"}
                  </button>
                ))}
                {role === "teacher" ? <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="ml-auto text-sm font-semibold text-emerald-800 underline">{mode === "login" ? "Daftar guru" : "Login guru"}</button> : null}
              </div>
              {role === "teacher" && mode === "register" ? <label className="block text-sm font-medium text-slate-700">Nama
                <input className={`${inputClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} required />
              </label> : null}
              {role === "teacher" ? <>
                <label className="block text-sm font-medium text-slate-700">Email
                  <input type="email" className={`${inputClass} mt-1`} value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
                <label className="block text-sm font-medium text-slate-700">Kata sandi
                  <input type="password" minLength={8} className={`${inputClass} mt-1`} value={password} onChange={(event) => setPassword(event.target.value)} required />
                </label>
              </> : <>
                <label className="block text-sm font-medium text-slate-700">Nama panggilan
                  <input className={`${inputClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <label className="block text-sm font-medium text-slate-700">Kode kelas
                  <input className={`${inputClass} mt-1 uppercase`} value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="AB12CD34" required />
                </label>
              </>}
              <button type="submit" className={buttonClass}>{role === "student" ? "Gabung kelas" : mode === "register" ? "Buat akun guru" : "Login guru"}</button>
            </form>
          )}
        </div>

        <div className="space-y-4">
          {token && role === "teacher" ? <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">Kelola kelas</h3>
            <div className="flex gap-2">
              <input className={inputClass} value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Nama kelas" />
              <button type="button" onClick={() => void createClassroom()} className={buttonClass}>Buat</button>
            </div>
            <div className="flex gap-2">
              <input className={inputClass} value={scenarioTitle} onChange={(event) => setScenarioTitle(event.target.value)} placeholder="Nama skenario baru" />
              <button type="button" onClick={() => void createScenario()} className={buttonClass}>Simpan skenario</button>
            </div>
          </div> : null}
          {classroomId ? <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">Papan peringkat kelas</h3>
              <button type="button" onClick={() => void loadLeaderboard()} className="text-sm font-semibold text-emerald-800 underline">Perbarui</button>
            </div>
            {leaderboard.length ? <ol className="mt-3 space-y-2 text-sm">{leaderboard.map((entry, index) => <li key={entry.user_id} className="flex justify-between gap-3 rounded-xl bg-white p-3"><span>{index + 1}. {entry.name}</span><span className="text-right font-semibold">{entry.score} poin · {entry.total_kwh_used.toFixed(3)} kWh</span></li>)}</ol> : <p className="mt-2 text-sm text-slate-600">Muat peringkat untuk melihat hasil terbaru.</p>}
          </div> : null}
        </div>
      </div>
      {message ? <p role="status" aria-live="polite" className="mt-4 text-sm text-slate-600">{message}</p> : null}
      <p className="mt-3 text-xs leading-relaxed text-slate-500">Akun, kelas, skenario, dan peringkat memerlukan koneksi API. Skenario lokal dan simulasi di perangkat tetap tersedia secara offline; hasil belum tersinkron sampai koneksi kembali.</p>
    </section>
  );
}

function apiErrorLabel(message: string): string {
  const labels: Record<string, string> = {
    invalid_credentials: "Email atau kata sandi tidak cocok.",
    authorization_required: "Sesi login diperlukan.",
    forbidden: "Akun ini tidak memiliki akses untuk tindakan tersebut.",
    classroom_not_found: "Kode kelas tidak ditemukan.",
    email_already_exists: "Email sudah terdaftar.",
    invalid_scenario: "Konfigurasi skenario tidak valid.",
  };
  return labels[message] ?? `Layanan kelas: ${message}`;
}
