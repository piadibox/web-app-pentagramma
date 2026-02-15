"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import CreateLessonButton from "./CreateLessonButton";
import { useToast } from "../components/ToastProvider";

type LessonRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  student?: { id?: string; fullName?: string; username?: string };
  teacher?: { id?: string; fullName?: string; username?: string };
  instrument?: { id?: string; name?: string };
};

type LookupUser = { id: string; username: string; fullName: string | null };
type LookupInstrument = { id: string; name: string };

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
  if (status === "CANCELLED") return "bg-[#BC4E31] text-[#FAFAFA] ring-[#BC4E31]";
  if (status === "SCHEDULED") return "bg-[#2D3950] text-[#FAFAFA] ring-[#2D3950]";
  return "bg-[#362923] text-[#FAFAFA] ring-[#362923]";
}

export default function LessonsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [weekStart, setWeekStart] = useState(() => toISOWeekStartUTC(new Date()));

  const [status, setStatus] = useState<number | null>(null);
  const [json, setJson] = useState<any>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [hideCancelled, setHideCancelled] = useState(true);
  const [q, setQ] = useState("");
  const [shiftById, setShiftById] = useState<Record<string, number>>({});
  const [teacherFilter, setTeacherFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("");

  const [students, setStudents] = useState<LookupUser[]>([]);
  const [teachers, setTeachers] = useState<LookupUser[]>([]);
  const [instruments, setInstruments] = useState<LookupInstrument[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { pushToast } = useToast();

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
    const filteredByText = !needle
      ? base
      : base.filter((l) => {
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

    return filteredByText.filter((l) => {
      if (teacherFilter && l.teacher?.id !== teacherFilter) return false;
      if (studentFilter && l.student?.id !== studentFilter) return false;
      if (instrumentFilter && l.instrument?.id !== instrumentFilter) return false;
      return true;
    });
  }, [lessons, hideCancelled, q, teacherFilter, studentFilter, instrumentFilter]);

  async function load(ws = weekStart) {
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons?weekStart=${encodeURIComponent(ws)}`, {
        credentials: "include",
        cache: "no-store",
      });

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));
      setStatus(res.status);
      setJson(data);
      setLessons(Array.isArray(data?.lessons) ? data.lessons : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ws = params.get("weekStart");
    const qParam = params.get("q");
    const teacherParam = params.get("teacherId");
    const studentParam = params.get("studentId");
    const instrumentParam = params.get("instrumentId");

    if (ws && !Number.isNaN(new Date(ws).getTime())) setWeekStart(ws);
    if (qParam) setQ(qParam);
    if (teacherParam) setTeacherFilter(teacherParam);
    if (studentParam) setStudentFilter(studentParam);
    if (instrumentParam) setInstrumentFilter(instrumentParam);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("weekStart", weekStart);
    if (q.trim()) params.set("q", q.trim());
    if (teacherFilter) params.set("teacherId", teacherFilter);
    if (studentFilter) params.set("studentId", studentFilter);
    if (instrumentFilter) params.set("instrumentId", instrumentFilter);
    const qs = params.toString();
    router.replace(`${pathname}?${qs}`, { scroll: false });
  }, [weekStart, q, teacherFilter, studentFilter, instrumentFilter, pathname, router]);

  useEffect(() => {
    load(weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    let cancelled = false;
    setLookupError(null);

    fetch("/api/lookups", { credentials: "include" })
      .then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }))
      .then(({ ok, status, data }) => {
        if (cancelled) return;
        if (status === 401) {
          router.replace("/login");
          return;
        }
        if (!ok) {
          setLookupError(data?.error ?? "Errore lookups");
          return;
        }
        setStudents(Array.isArray(data?.students) ? data.students : []);
        setTeachers(Array.isArray(data?.teachers) ? data.teachers : []);
        setInstruments(Array.isArray(data?.instruments) ? data.instruments : []);
      })
      .catch(() => {
        if (!cancelled) setLookupError("Errore lookups");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function cancelLesson(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushToast(data?.error ?? `HTTP ${res.status}`, "error");
        return;
      }
      pushToast("Lezione annullata", "success");
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
        pushToast(data?.error ?? `HTTP ${res.status}`, "error");
        return;
      }
      pushToast("Lezione spostata", "success");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const selectCls =
    "field-theme rounded-sm px-3 py-2 text-sm shadow-sm transition";

  const filterCls =
    "field-theme w-full sm:w-56 rounded-sm px-3 py-2 text-sm shadow-sm transition";

  const btnCls =
    "btn-secondary rounded-sm px-3 py-2 font-condensed text-sm uppercase tracking-[0.08em] shadow-sm disabled:opacity-50";

  const confirmLesson = confirmId ? lessons.find((l) => l.id === confirmId) : null;

  if (loading && !lessons.length) {
    return (
      <main className="relative min-h-screen overflow-hidden text-[#1d1712] leading-relaxed">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(188,78,49,0.13)_0%,transparent_52%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.4)_0%,transparent_56%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-6">
          <div className="surface-paper rounded-lg p-4 text-sm text-[#1d1712]">
            Caricamento…
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-[#1d1712] leading-relaxed">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(188,78,49,0.13)_0%,transparent_52%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.4)_0%,transparent_56%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-5 space-y-6">
        <header className="surface-paper rise-in rounded-lg p-4 backdrop-blur flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="font-condensed text-xs uppercase tracking-[0.22em] text-[#7d6652]">Eventi e News</p>
            <h1 className="font-display text-4xl font-bold uppercase tracking-[0.03em] text-[#bc4e31] sm:text-5xl">
              Lezioni
            </h1>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="text-sm text-[#6f5c4c]">
                Settimana: <span className="font-semibold text-[#1d1712]">{weekLabelLong}</span>{" "}
                <span className="text-[#ad8f6d]">•</span>{" "}
                <span>
                  API: <span className="font-semibold text-[#1d1712]">{status ?? "…"}</span>
                </span>
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
            </div>
          </div>
        </header>

        <div className="space-y-5">
          <section className="surface-paper overflow-hidden rounded-lg">
            <div className="border-b border-[#c6ad8e] bg-[#e4d0b1] px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-heading text-2xl font-semibold uppercase text-[#1d1712]">Tabella lezioni</h2>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <label className="flex items-center gap-2 text-sm text-[#6f5c4c]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#bc4e31]"
                      checked={hideCancelled}
                      onChange={(e) => setHideCancelled(e.target.checked)}
                    />
                    Nascondi annullate
                  </label>

                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Filtra… (studente, insegnante, strumento)"
                    className={filterCls}
                  />

                  <select
                    value={teacherFilter}
                    onChange={(e) => setTeacherFilter(e.target.value)}
                    className={filterCls}
                    disabled={!!lookupError}
                  >
                    <option value="">Tutti docenti</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName ?? t.username}
                      </option>
                    ))}
                  </select>

                  <select
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                    className={filterCls}
                    disabled={!!lookupError}
                  >
                    <option value="">Tutti studenti</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName ?? s.username}
                      </option>
                    ))}
                  </select>

                  <select
                    value={instrumentFilter}
                    onChange={(e) => setInstrumentFilter(e.target.value)}
                    className={filterCls}
                    disabled={!!lookupError}
                  >
                    <option value="">Tutti strumenti</option>
                    {instruments.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>

                  <div className="text-sm text-[#6f5c4c]">
                    Mostrate: <span className="font-semibold text-[#1d1712]">{visibleLessons.length}</span> /{" "}
                    {lessons.length}
                  </div>
                </div>
              </div>
              {lookupError ? <div className="text-xs text-[#bc4e31]">Filtri avanzati non disponibili.</div> : null}
            </div>

            <div className="p-4">
              {loading ? (
                <div className="rounded-md border border-[#c6ad8e] bg-[#fff8e9] p-3 text-sm text-[#1d1712]">Caricamento…</div>
              ) : status !== 200 ? (
                <div className="rounded-md border border-[#bc4e31] bg-[#fff1df] p-4 text-sm text-[#6f2617]">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(json, null, 2)}</pre>
                </div>
              ) : visibleLessons.length === 0 ? (
                <div className="rounded-md border border-[#c6ad8e] bg-[#fff8e9] p-3 text-sm text-[#1d1712]">
                  Nessuna lezione trovata.
                </div>
              ) : (
                <ul className="space-y-2">
                    {visibleLessons.map((l) => {
                      const isCancelled = l.status === "CANCELLED";
                      const isBusy = busyId === l.id;
                      const shift = shiftById[l.id] ?? 60;

                      const student = l.student?.fullName ?? l.student?.username ?? "-";
                      const teacher = l.teacher?.fullName ?? l.teacher?.username ?? "-";
                      const instr = l.instrument?.name ?? "-";

                      const dateLabel = new Date(l.startsAt).toLocaleDateString("it-IT", { dateStyle: "full" });
                      const timeLabel = `${new Date(l.startsAt).toLocaleTimeString("it-IT", {
                        timeStyle: "short",
                      })} → ${new Date(l.endsAt).toLocaleTimeString("it-IT", { timeStyle: "short" })}`;

                      return (
                        <li
                          key={l.id}
                          className="rounded-md border border-[#c6ad8e] bg-[#fff8e9] p-4 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1.6fr_1fr] lg:items-center">
                            <div className="space-y-1">
                              <div className="font-condensed text-sm uppercase tracking-[0.08em] text-[#bc4e31]">{dateLabel}</div>
                              <div className="font-heading text-lg font-semibold text-[#1d1712]">{timeLabel}</div>
                              <div className="text-xs text-[#7e6d5f] font-mono">{l.id}</div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <div className="rounded-md border border-[#c6ad8e] bg-[#f4e7d1] px-3 py-2">
                                <div className="font-condensed text-xs uppercase tracking-[0.09em] text-[#6f5c4c]">
                                  Studente
                                </div>
                                <div className="text-sm font-semibold text-[#1d1712]">{student}</div>
                              </div>
                              <div className="rounded-md border border-[#c6ad8e] bg-[#f4e7d1] px-3 py-2">
                                <div className="font-condensed text-xs uppercase tracking-[0.09em] text-[#6f5c4c]">
                                  Insegnante
                                </div>
                                <div className="text-sm font-semibold text-[#1d1712]">{teacher}</div>
                              </div>
                              <div className="rounded-md border border-[#c6ad8e] bg-[#f4e7d1] px-3 py-2">
                                <div className="font-condensed text-xs uppercase tracking-[0.09em] text-[#6f5c4c]">
                                  Strumento
                                </div>
                                <div className="text-sm font-semibold text-[#1d1712]">{instr}</div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 lg:items-end">
                              <span
                                className={`inline-flex items-center self-start rounded-md px-3 py-1 text-xs font-semibold ring-1 ring-inset ${badgeClass(
                                  l.status
                                )}`}
                              >
                                {l.status}
                              </span>

                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex flex-col gap-2">
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

                                  <button
                                    onClick={() => applyShift(l)}
                                    disabled={isCancelled || isBusy}
                                    className={btnCls}
                                  >
                                    {isBusy ? "…" : "Posticipa"}
                                  </button>
                                </div>

                                <button
                                  onClick={() => setConfirmId(l.id)}
                                  disabled={isCancelled || isBusy}
                                  className={btnCls}
                                >
                                  {isBusy ? "…" : "Annulla lezione"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </section>

          <section className="surface-dark overflow-hidden rounded-lg">
            <div className="border-b border-[#f1debf]/20 bg-[#0f141d] px-4 py-3">
              <h2 className="font-heading text-2xl font-semibold uppercase text-[#fff8e9]">
                Crea lezione <span className="font-normal text-[#d9c5a8]">(Settimana dal {weekLabelShort})</span>
                </h2>
              </div>

              <div className="p-4">
                <CreateLessonButton weekStart={weekStart} onCreated={() => load()} />
              </div>
            </section>
        </div>
      </div>

      {confirmId ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1d1712]/55 px-4">
          <div className="surface-paper w-full max-w-md rounded-lg p-5">
            <div className="font-heading text-lg font-semibold uppercase text-[#1d1712]">Conferma annullamento</div>
            <div className="mt-2 text-sm text-[#6f5c4c]">
              Vuoi annullare questa lezione?
              {confirmLesson ? (
                <div className="mt-2 rounded-md border border-[#c6ad8e] bg-[#f4e7d1] px-3 py-2 text-xs text-[#1d1712]">
                  {new Date(confirmLesson.startsAt).toLocaleString("it-IT")} →{" "}
                  {new Date(confirmLesson.endsAt).toLocaleTimeString("it-IT")}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmId(null)} className={btnCls}>
                Indietro
              </button>
              <button
                onClick={async () => {
                  const id = confirmId;
                  setConfirmId(null);
                  await cancelLesson(id);
                }}
                className="btn-primary rounded-sm px-3 py-2 font-condensed text-sm uppercase tracking-[0.08em]"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
