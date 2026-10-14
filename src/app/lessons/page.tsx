"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import CreateLessonButton from "./CreateLessonButton";
import { useToast } from "../components/ToastProvider";
import { apiError, personName, statusLabel } from "@/lib/labels";

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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "13 – 19 ottobre 2026" or "27 ottobre – 2 novembre 2026"
function weekRangeLabel(weekStartISO: string) {
  const start = new Date(weekStartISO);
  const end = new Date(addDaysUTC(weekStartISO, 6));
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const startLabel = start.toLocaleDateString("it-IT", {
    day: "numeric",
    month: sameMonth ? undefined : "long",
    timeZone: "UTC",
  });
  const endLabel = end.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `${startLabel} – ${endLabel}`;
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string) {
  return capitalize(new Date(iso).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }));
}

function minutesBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

function badgeClass(status: string) {
  if (status === "CANCELLED") return "bg-terracotta/10 text-terracotta-dark ring-terracotta/40";
  if (status === "DONE") return "bg-sage/10 text-sage ring-sage/40";
  if (status === "MOVED") return "bg-ink/5 text-ink ring-ink/25";
  return "bg-slate/10 text-slate ring-slate/35";
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d={dir === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LessonsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [weekStart, setWeekStart] = useState(() => toISOWeekStartUTC(new Date()));

  const [loadError, setLoadError] = useState<string | null>(null);
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
  const confirmBackRef = useRef<HTMLButtonElement>(null);

  const { pushToast } = useToast();

  const weekRange = useMemo(() => weekRangeLabel(weekStart), [weekStart]);
  const isCurrentWeek = weekStart === toISOWeekStartUTC(new Date());
  const todayKey = new Date().toDateString();

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
            statusLabel(l.status),
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

  const lessonsByDay = useMemo(() => {
    const groups: { key: string; label: string; lessons: LessonRow[] }[] = [];
    for (const l of visibleLessons) {
      const key = new Date(l.startsAt).toDateString();
      const last = groups[groups.length - 1];
      if (last?.key === key) last.lessons.push(l);
      else groups.push({ key, label: dayLabel(l.startsAt), lessons: [l] });
    }
    return groups;
  }, [visibleLessons]);

  const hasFilters = !!(q.trim() || teacherFilter || studentFilter || instrumentFilter);

  function resetFilters() {
    setQ("");
    setTeacherFilter("");
    setStudentFilter("");
    setInstrumentFilter("");
  }

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
      setLoadError(res.ok ? null : apiError(data, res.status));
      setLessons(Array.isArray(data?.lessons) ? data.lessons : []);
    } catch {
      setLoadError("Connessione non disponibile");
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
          setLookupError(apiError(data, status));
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

  useEffect(() => {
    if (!confirmId) return;
    confirmBackRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmId]);

  async function cancelLesson(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushToast(apiError(data, res.status), "error");
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
        pushToast(apiError(data, res.status), "error");
        return;
      }
      pushToast(`Lezione posticipata di ${minutes} minuti`, "success");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const filterCls = "field-theme w-full rounded-sm px-3 py-2 text-sm sm:w-52";

  const btnCls =
    "btn-secondary inline-flex items-center justify-center gap-1.5 rounded-sm px-3 py-2 font-condensed text-sm uppercase tracking-[0.08em]";

  const confirmLesson = confirmId ? lessons.find((l) => l.id === confirmId) : null;

  return (
    <main className="relative min-h-screen overflow-hidden leading-relaxed text-ink">
      <div className="page-glow" />
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:py-8">
        <header className="rise-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-[0.02em] text-terracotta sm:text-5xl">
              Lezioni
            </h1>
            <p className="mt-2 text-base text-muted">
              Settimana <span className="tabular font-semibold text-ink">{weekRange}</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5" role="group" aria-label="Cambia settimana">
            <button
              onClick={() => setWeekStart((ws) => addDaysUTC(ws, -7))}
              className={`${btnCls} px-2.5`}
              aria-label="Settimana precedente"
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              onClick={() => setWeekStart(toISOWeekStartUTC(new Date()))}
              className={btnCls}
              disabled={isCurrentWeek}
            >
              Questa settimana
            </button>
            <button
              onClick={() => setWeekStart((ws) => addDaysUTC(ws, 7))}
              className={`${btnCls} px-2.5`}
              aria-label="Settimana successiva"
            >
              <ChevronIcon dir="right" />
            </button>
          </div>
        </header>

        <section className="surface-paper overflow-hidden rounded-lg" aria-labelledby="lessons-list-title">
          <h2 id="lessons-list-title" className="sr-only">
            Elenco lezioni
          </h2>

          <div className="space-y-3 border-b border-line bg-cream px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block sm:w-80">
                <span className="sr-only">Cerca</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="m10.5 10.5 3 3" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cerca studente, docente, strumento"
                  className="field-theme w-full rounded-sm py-2 pl-9 pr-3 text-sm"
                />
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-terracotta"
                  checked={hideCancelled}
                  onChange={(e) => setHideCancelled(e.target.checked)}
                />
                Nascondi annullate
              </label>

              <div className="text-sm text-muted sm:ml-auto" aria-live="polite">
                {loading ? (
                  "Caricamento…"
                ) : (
                  <>
                    <span className="tabular font-semibold text-ink">{visibleLessons.length}</span>
                    {visibleLessons.length !== lessons.length ? (
                      <span className="tabular"> di {lessons.length}</span>
                    ) : null}{" "}
                    {lessons.length === 1 ? "lezione" : "lezioni"}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-line-soft pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <span className="font-condensed shrink-0 text-xs uppercase tracking-[0.12em] text-muted">Filtra per</span>

              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className={filterCls}
                disabled={!!lookupError}
                aria-label="Docente"
              >
                <option value="">Tutti i docenti</option>
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
                aria-label="Studente"
              >
                <option value="">Tutti gli studenti</option>
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
                aria-label="Strumento"
              >
                <option value="">Tutti gli strumenti</option>
                {instruments.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>

              {hasFilters ? (
                <button
                  onClick={resetFilters}
                  className="self-start rounded-sm px-1 text-sm text-terracotta-dark underline decoration-terracotta/40 underline-offset-4 transition-colors hover:decoration-terracotta sm:self-auto"
                >
                  Azzera filtri
                </button>
              ) : null}
            </div>

            {lookupError ? (
              <p className="text-xs text-terracotta-dark">
                I filtri per docente, studente e strumento non sono disponibili al momento.
              </p>
            ) : null}
          </div>

          <div className="p-4">
            {loading && !lessons.length ? (
              <div className="space-y-3" aria-hidden="true">
                <div className="skeleton h-4 w-40 rounded-sm" />
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-16 rounded-md" />
                ))}
              </div>
            ) : loadError ? (
              <div role="alert" className="rounded-md border border-terracotta/60 bg-[#fff1df] p-4 text-sm text-[#6f2617]">
                <p className="font-semibold">Non è stato possibile caricare le lezioni.</p>
                <p className="mt-1 text-[#8b321e]">{loadError}</p>
                <button onClick={() => load()} className={`${btnCls} mt-3`}>
                  Riprova
                </button>
              </div>
            ) : visibleLessons.length === 0 ? (
              <div className="rounded-md border border-dashed border-line px-4 py-10 text-center">
                <p className="font-heading text-xl font-semibold text-ink">
                  {lessons.length === 0 ? "Nessuna lezione in questa settimana" : "Nessuna lezione corrisponde ai filtri"}
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                  {lessons.length === 0
                    ? "Puoi crearne una dal modulo qui sotto, oppure spostarti su un'altra settimana."
                    : hasFilters
                      ? "Prova a cambiare la ricerca o azzera i filtri."
                      : "Le lezioni di questa settimana sono tutte annullate."}
                </p>
                {lessons.length > 0 && hasFilters ? (
                  <button onClick={resetFilters} className={`${btnCls} mt-4`}>
                    Azzera filtri
                  </button>
                ) : null}
                {lessons.length > 0 && !hasFilters && hideCancelled ? (
                  <button onClick={() => setHideCancelled(false)} className={`${btnCls} mt-4`}>
                    Mostra annullate
                  </button>
                ) : null}
              </div>
            ) : (
              <div className={`space-y-6 transition-opacity duration-200 ${loading ? "opacity-60" : ""}`}>
                {lessonsByDay.map((group) => {
                  const isToday = group.key === todayKey;
                  return (
                    <section key={group.key} aria-label={group.label}>
                      <h3 className="mb-2 flex items-baseline gap-2 border-b border-line-soft pb-1.5">
                        <span className={`font-heading text-xl font-semibold ${isToday ? "text-terracotta" : "text-ink"}`}>
                          {group.label}
                        </span>
                        {isToday ? (
                          <span className="font-condensed text-xs uppercase tracking-[0.12em] text-terracotta">Oggi</span>
                        ) : null}
                        <span className="tabular ml-auto text-xs text-muted">
                          {group.lessons.length} {group.lessons.length === 1 ? "lezione" : "lezioni"}
                        </span>
                      </h3>

                      <ul className="divide-y divide-line-soft">
                        {group.lessons.map((l) => {
                          const isCancelled = l.status === "CANCELLED";
                          const isBusy = busyId === l.id;
                          const shift = shiftById[l.id] ?? 60;

                          return (
                            <li
                              key={l.id}
                              className={`-mx-2 grid grid-cols-[4.5rem_1fr] items-center gap-x-4 gap-y-3 rounded-md px-2 py-3 transition-colors duration-150 hover:bg-cream/80 md:grid-cols-[5.5rem_1fr_auto_auto] ${
                                isCancelled ? "text-muted" : ""
                              }`}
                            >
                              <div className="tabular leading-tight">
                                <div
                                  className={`font-heading text-xl font-semibold ${
                                    isCancelled ? "text-muted line-through decoration-terracotta/60" : "text-ink"
                                  }`}
                                >
                                  {clock(l.startsAt)}
                                </div>
                                <div className="text-xs text-muted">
                                  {clock(l.endsAt)} · {minutesBetween(l.startsAt, l.endsAt)}′
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className={`truncate font-semibold ${isCancelled ? "text-muted" : "text-ink"}`}>
                                  {personName(l.student)}
                                </div>
                                <div className="truncate text-sm text-muted">
                                  {l.instrument?.name ?? "—"} <span className="text-line">·</span> con {personName(l.teacher)}
                                </div>
                              </div>

                              <span
                                className={`col-start-2 inline-flex items-center self-center justify-self-start rounded-sm px-2 py-0.5 font-condensed text-xs uppercase tracking-[0.08em] ring-1 ring-inset md:col-start-auto md:justify-self-end ${badgeClass(
                                  l.status
                                )}`}
                              >
                                {statusLabel(l.status)}
                              </span>

                              {isCancelled ? (
                                <span className="hidden md:block md:w-[17.5rem]" />
                              ) : (
                                <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:w-[17.5rem] md:justify-end">
                                  <div className="flex">
                                    <select
                                      value={String(shift)}
                                      onChange={(e) =>
                                        setShiftById((prev) => ({ ...prev, [l.id]: Number(e.target.value) }))
                                      }
                                      disabled={isBusy}
                                      aria-label="Minuti di posticipo"
                                      className="field-theme tabular rounded-l-sm rounded-r-none border-r-0 px-2 py-2 text-sm"
                                    >
                                      <option value="15">+15 min</option>
                                      <option value="30">+30 min</option>
                                      <option value="60">+60 min</option>
                                      <option value="90">+90 min</option>
                                    </select>
                                    <button
                                      onClick={() => applyShift(l)}
                                      disabled={isBusy}
                                      className={`${btnCls} rounded-l-none`}
                                    >
                                      {isBusy ? "Attendi…" : "Posticipa"}
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => setConfirmId(l.id)}
                                    disabled={isBusy}
                                    className="rounded-sm px-2 py-2 font-condensed text-sm uppercase tracking-[0.08em] text-terracotta-dark transition-colors hover:bg-terracotta/10 disabled:opacity-50"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="surface-dark mt-10 overflow-hidden rounded-lg md:mt-14" aria-labelledby="new-lesson-title">
          <div className="flex flex-col gap-1 border-b border-[#f1debf]/20 bg-[#0f141d] px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 id="new-lesson-title" className="font-heading text-2xl font-semibold uppercase text-cream">
              Nuova lezione
            </h2>
            <span className="tabular text-sm text-[#d9c5a8]">Settimana {weekRange}</span>
          </div>

          <div className="p-4">
            <CreateLessonButton weekStart={weekStart} onCreated={() => load()} />
          </div>
        </section>
      </div>

      {confirmId ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/55 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="surface-paper rise-in w-full max-w-md rounded-lg p-5"
          >
            <h2 id="confirm-title" className="font-heading text-2xl font-semibold text-ink">
              Annullare la lezione?
            </h2>
            {confirmLesson ? (
              <div className="mt-3 rounded-md border border-line bg-paper-deep px-3 py-2.5 text-sm">
                <div className="font-semibold text-ink">
                  {personName(confirmLesson.student)} · {confirmLesson.instrument?.name ?? "—"}
                </div>
                <div className="tabular text-muted">
                  {dayLabel(confirmLesson.startsAt)}, {clock(confirmLesson.startsAt)}–{clock(confirmLesson.endsAt)}
                </div>
              </div>
            ) : null}
            <p className="mt-3 text-sm text-muted">La lezione resterà visibile come annullata.</p>

            <div className="mt-5 flex justify-end gap-2">
              <button ref={confirmBackRef} onClick={() => setConfirmId(null)} className={btnCls}>
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
                Sì, annulla lezione
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
