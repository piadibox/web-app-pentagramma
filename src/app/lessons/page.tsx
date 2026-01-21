"use client";

import { useEffect, useMemo, useState } from "react";
import CreateLessonButton from "./CreateLessonButton";

type LessonRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  student?: { fullName?: string; username?: string };
  teacher?: { fullName?: string; username?: string };
  instrument?: { name?: string };
};

function toISOWeekStartUTC(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - diffToMonday);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

function addDaysUTC(iso: string, days: number) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function addMinutesISO(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString();
}

function badgeClass(status: string) {
  if (status === "CANCELLED") return "bg-neutral-100 text-neutral-700 ring-neutral-200";
  if (status === "SCHEDULED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

export default function LessonsPage() {
  const [weekStart, setWeekStart] = useState(() => toISOWeekStartUTC(new Date()));

  const [status, setStatus] = useState<number | null>(null);
  const [json, setJson] = useState<any>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [hideCancelled, setHideCancelled] = useState(true);
  const [q, setQ] = useState("");
  const [shiftById, setShiftById] = useState<Record<string, number>>({});

  const weekLabelLong = useMemo(() => {
    const d = new Date(weekStart);
    return d.toLocaleDateString("it-IT", { dateStyle: "full" });
  }, [weekStart]);

  const weekLabelShort = useMemo(() => {
    const d = new Date(weekStart);
    return d.toLocaleDateString("it-IT", { dateStyle: "medium" });
  }, [weekStart]);

  const visibleLessons = useMemo(() => {
    const base = hideCancelled ? lessons.filter((l) => l.status !== "CANCELLED") : lessons;

    const needle = q.trim().toLowerCase();
    if (!needle) return base;

    return base.filter((l) => {
      const hay = [
        l.student?.fullName,
        l.student?.username,
        l.teacher?.fullName,
        l.teacher?.username,
        l.instrument?.name,
        l.status,
        l.source,
        l.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [lessons, hideCancelled, q]);

  async function load(ws = weekStart) {
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons?weekStart=${encodeURIComponent(ws)}`, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      setStatus(res.status);
      setJson(data);
      setLessons(Array.isArray(data?.lessons) ? data.lessons : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  async function cancelLesson(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function applyShift(l: LessonRow) {
    if (l.status === "CANCELLED") return;

    const minutes = shiftById[l.id] ?? 60;

    setBusyId(l.id);
    try {
      const startsAt = addMinutesISO(l.startsAt, minutes);
      const endsAt = addMinutesISO(l.endsAt, minutes);

      const res = await fetch(`/api/lessons/${l.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ startsAt, endsAt }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const selectCls =
    "rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10";

  const btnCls =
    "rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50";

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Lezioni</h1>
            <div className="text-sm text-neutral-600">
              Settimana: <span className="font-medium text-neutral-900">{weekLabelLong}</span>{" "}
              <span className="text-neutral-400">•</span>{" "}
              <span>
                API: <span className="font-medium text-neutral-900">{status ?? "…"}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setWeekStart((ws) => addDaysUTC(ws, -7))} className={btnCls}>
              ← Prev
            </button>
            <button onClick={() => setWeekStart(toISOWeekStartUTC(new Date()))} className={btnCls}>
              Oggi
            </button>
            <button onClick={() => setWeekStart((ws) => addDaysUTC(ws, 7))} className={btnCls}>
              Next →
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-neutral-900">Tabella lezioni</h2>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-neutral-900"
                    checked={hideCancelled}
                    onChange={(e) => setHideCancelled(e.target.checked)}
                  />
                  Nascondi annullate
                </label>

                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filtra… (studente, insegnante, strumento)"
                  className="w-full sm:w-72 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />

                <div className="text-sm text-neutral-600">
                  Mostrate: <span className="font-medium text-neutral-900">{visibleLessons.length}</span> /{" "}
                  {lessons.length}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                Caricamento…
              </div>
            ) : status !== 200 ? (
              <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm">
                <pre className="whitespace-pre-wrap">{JSON.stringify(json, null, 2)}</pre>
              </div>
            ) : visibleLessons.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                Nessuna lezione trovata.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 text-left">
                    <tr className="text-neutral-700">
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Quando</th>
                      <th className="hidden md:table-cell px-4 py-3 font-semibold whitespace-nowrap">Studente</th>
                      <th className="hidden md:table-cell px-4 py-3 font-semibold whitespace-nowrap">Insegnante</th>
                      <th className="hidden md:table-cell px-4 py-3 font-semibold whitespace-nowrap">Strumento</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Stato</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Azioni</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {visibleLessons.map((l) => {
                      const isCancelled = l.status === "CANCELLED";
                      const isBusy = busyId === l.id;
                      const shift = shiftById[l.id] ?? 60;

                      const student = l.student?.fullName ?? l.student?.username ?? "-";
                      const teacher = l.teacher?.fullName ?? l.teacher?.username ?? "-";
                      const instr = l.instrument?.name ?? "-";

                      return (
                        <tr key={l.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3 text-neutral-900">
                            <div className="whitespace-nowrap">
                              {new Date(l.startsAt).toLocaleString("it-IT")} →{" "}
                              {new Date(l.endsAt).toLocaleTimeString("it-IT")}
                            </div>

                            {/* mobile-only details */}
                            <div className="mt-2 space-y-1 text-xs text-neutral-600 md:hidden">
                              <div>
                                <span className="text-neutral-500">Studente:</span>{" "}
                                <span className="font-medium text-neutral-800">{student}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500">Insegnante:</span>{" "}
                                <span className="font-medium text-neutral-800">{teacher}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500">Strumento:</span>{" "}
                                <span className="font-medium text-neutral-800">{instr}</span>
                              </div>
                            </div>
                          </td>

                          <td className="hidden md:table-cell px-4 py-3 text-neutral-800">{student}</td>
                          <td className="hidden md:table-cell px-4 py-3 text-neutral-800">{teacher}</td>
                          <td className="hidden md:table-cell px-4 py-3 text-neutral-800">{instr}</td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badgeClass(
                                l.status
                              )}`}
                            >
                              {l.status}
                            </span>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={String(shift)}
                                onChange={(e) =>
                                  setShiftById((prev) => ({ ...prev, [l.id]: Number(e.target.value) }))
                                }
                                disabled={isCancelled || isBusy}
                                className={selectCls}
                              >
                                <option value="15">+15 min</option>
                                <option value="30">+30 min</option>
                                <option value="60">+60 min</option>
                                <option value="90">+90 min</option>
                              </select>

                              <button onClick={() => applyShift(l)} disabled={isCancelled || isBusy} className={btnCls}>
                                {isBusy ? "…" : "Applica"}
                              </button>

                              <button onClick={() => cancelLesson(l.id)} disabled={isCancelled || isBusy} className={btnCls}>
                                {isBusy ? "…" : "Annulla"}
                              </button>
                            </div>

                            <div className="mt-2 hidden md:block text-xs text-neutral-400 font-mono">{l.id}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <h2 className="text-base font-semibold text-neutral-900">
              Crea lezione <span className="font-normal text-neutral-600">(Settimana dal {weekLabelShort})</span>
            </h2>
          </div>

          <div className="p-4">
            <CreateLessonButton weekStart={weekStart} onCreated={() => load()} />
          </div>
        </section>
      </div>
    </main>
  );
}
