"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import CreateLessonButton from "./CreateLessonButton";

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
  if (status === "CANCELLED") return "bg-[#E44949] text-white ring-[#E44949]";
  if (status === "SCHEDULED") return "bg-[#2F9E44] text-white ring-[#2F9E44]";
  return "bg-[#3A75E9] text-white ring-[#3A75E9]";
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
  const [authed, setAuthed] = useState<boolean | null>(null);

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
  const [toasts, setToasts] = useState<Array<{ id: number; tone: "success" | "error" | "info"; text: string }>>(
    []
  );

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

  const pushToast = useCallback((text: string, tone: "success" | "error" | "info" = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, tone, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

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
    let cancelled = false;
    fetch("/api/auth/me", { method: "GET" })
      .then((r) => r.ok)
      .then((ok) => {
        if (cancelled) return;
        if (!ok) {
          setAuthed(false);
          router.replace("/login");
          return;
        }
        setAuthed(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthed(false);
        router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

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
    if (!authed) return;
    load(weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, authed]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    setLookupError(null);

    fetch("/api/lookups", { credentials: "include" })
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
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
  }, [authed]);

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
      pushToast("Lezione annullata.", "success");
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
      pushToast("Lezione posticipata.", "success");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const selectCls =
    "rounded-xl border border-[#3A75E9] bg-white px-3 py-2 text-sm text-[#3A75E9] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3A75E9]/30";

  const filterCls =
    "w-full sm:w-56 rounded-xl border border-[#C9DAFF] bg-white px-3 py-2 text-sm text-[#1B2B4A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3A75E9]/30";

  const btnCls =
    "rounded-xl border border-[#3A75E9] bg-white px-3 py-2 text-sm font-semibold text-[#3A75E9] shadow-sm hover:bg-[#3A75E9] hover:text-white disabled:opacity-50";

  const confirmLesson = confirmId ? lessons.find((l) => l.id === confirmId) : null;

  if (authed === null) {
    return (
      <main
        className="relative min-h-screen overflow-hidden bg-[#F5F8FF] text-[#1B2B4A] leading-relaxed"
        style={{ fontFamily: "Futura, Trebuchet MS, Arial, sans-serif" }}
      >
        <div className="pointer-events-none absolute -top-24 right-[-10rem] h-72 w-72 rounded-full bg-[#CFE0FF]/70 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-10rem] left-[-8rem] h-72 w-72 rounded-full bg-[#AFCBFF]/60 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl border border-[#C9DAFF] bg-white p-6 text-sm text-[#1B2B4A] shadow-sm">
            Caricamento…
          </div>
        </div>
      </main>
    );
  }

  if (authed === false) return null;

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#F5F8FF] text-[#1B2B4A] leading-relaxed"
      style={{ fontFamily: "Futura, Trebuchet MS, Arial, sans-serif" }}
    >
      <div className="pointer-events-none absolute -top-24 right-[-10rem] h-72 w-72 rounded-full bg-[#CFE0FF]/70 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] left-[-8rem] h-72 w-72 rounded-full bg-[#AFCBFF]/60 blur-3xl" />
      {toasts.length ? (
        <div className="fixed right-4 top-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border px-4 py-2 text-sm shadow-lg ${
                t.tone === "success"
                  ? "border-[#BFD4FF] bg-white text-[#1B2B4A]"
                  : t.tone === "error"
                  ? "border-[#E44949] bg-white text-[#8A2B2B]"
                  : "border-[#C9DAFF] bg-white text-[#1B2B4A]"
              }`}
            >
              {t.text}
            </div>
          ))}
        </div>
      ) : null}
      <div className="relative mx-auto max-w-6xl px-4 py-6 space-y-12">
        <header className="rounded-2xl border border-[#BFD4FF] bg-white p-5 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#3A75E9]">
              Lezioni
            </h1>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="text-sm text-[#5B6F99]">
                Settimana: <span className="font-semibold text-[#1B2B4A]">{weekLabelLong}</span>{" "}
                <span className="text-[#9BB1D6]">•</span>{" "}
                <span>
                  API: <span className="font-semibold text-[#1B2B4A]">{status ?? "…"}</span>
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

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#C9DAFF] bg-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.25)] overflow-hidden">
            <div className="border-b border-[#C9DAFF] bg-[#F0F5FF] px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-[#1B2B4A]">Tabella lezioni</h2>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <label className="flex items-center gap-2 text-sm text-[#5B6F99]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#3A75E9]"
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

                    <div className="text-sm text-[#5B6F99]">
                      Mostrate: <span className="font-semibold text-[#1B2B4A]">{visibleLessons.length}</span> /{" "}
                      {lessons.length}
                    </div>
                  </div>
                </div>
                {lookupError ? (
                  <div className="text-xs text-[#E44949]">Filtri avanzati non disponibili.</div>
                ) : null}
              </div>

              <div className="p-5">
                {loading ? (
                  <div className="rounded-xl border border-[#C9DAFF] bg-white p-4 text-sm text-[#1B2B4A]">
                    Caricamento…
                  </div>
                ) : status !== 200 ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(json, null, 2)}</pre>
                  </div>
                ) : visibleLessons.length === 0 ? (
                  <div className="rounded-xl border border-[#C9DAFF] bg-white p-4 text-sm text-[#1B2B4A]">
                    Nessuna lezione trovata.
                  </div>
                ) : (
                  <ul className="space-y-3">
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
                          className="rounded-2xl border border-[#C9DAFF] bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1.6fr_1fr] lg:items-center">
                            <div className="space-y-2">
                              <div className="text-sm font-semibold text-[#3A75E9]">{dateLabel}</div>
                              <div className="text-lg font-bold text-[#1B2B4A]">{timeLabel}</div>
                              <div className="text-xs text-[#7A8DB5] font-mono">{l.id}</div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="rounded-xl border border-[#C9DAFF] bg-[#F7FAFF] px-3 py-2.5">
                                <div className="text-xs font-semibold uppercase tracking-wide text-[#3A75E9]">
                                  Studente
                                </div>
                                <div className="text-sm font-semibold text-[#1B2B4A]">{student}</div>
                              </div>
                              <div className="rounded-xl border border-[#C9DAFF] bg-[#F7FAFF] px-3 py-2.5">
                                <div className="text-xs font-semibold uppercase tracking-wide text-[#3A75E9]">
                                  Insegnante
                                </div>
                                <div className="text-sm font-semibold text-[#1B2B4A]">{teacher}</div>
                              </div>
                              <div className="rounded-xl border border-[#C9DAFF] bg-[#F7FAFF] px-3 py-2.5">
                                <div className="text-xs font-semibold uppercase tracking-wide text-[#3A75E9]">
                                  Strumento
                                </div>
                                <div className="text-sm font-semibold text-[#1B2B4A]">{instr}</div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 lg:items-end">
                              <span
                                className={`inline-flex items-center self-start rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${badgeClass(
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

          <section className="rounded-3xl border border-[#C9DAFF] bg-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.25)] overflow-hidden">
            <div className="border-b border-[#C9DAFF] bg-[#F0F5FF] px-5 py-4">
              <h2 className="text-base font-semibold text-[#1B2B4A]">
                Crea lezione <span className="font-normal text-[#5B6F99]">(Settimana dal {weekLabelShort})</span>
              </h2>
            </div>

            <div className="p-5">
              <CreateLessonButton weekStart={weekStart} onCreated={() => load()} />
            </div>
          </section>
        </div>
      </div>

      {confirmId ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1B2B4A]/30 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#C9DAFF] bg-white p-6 shadow-xl">
            <div className="text-lg font-semibold text-[#1B2B4A]">Conferma annullamento</div>
            <div className="mt-2 text-sm text-[#5B6F99]">
              Vuoi annullare questa lezione?
              {confirmLesson ? (
                <div className="mt-2 rounded-xl border border-[#C9DAFF] bg-[#F7FAFF] px-3 py-2 text-xs text-[#1B2B4A]">
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
                className="rounded-xl border border-[#E44949] bg-[#E44949] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#D43D3D]"
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
