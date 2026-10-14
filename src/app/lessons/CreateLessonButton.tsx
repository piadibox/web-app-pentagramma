"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "../components/ToastProvider";
import { apiError } from "@/lib/labels";

type Props = {
  weekStart: string;
  onCreated?: () => void;
};

type LookupUser = { id: string; username: string; fullName: string | null };
type LookupInstrument = { id: string; name: string };
type AvailabilityRow = { id: string; teacherId: string; weekday: number; startTime: string; endTime: string };
type WeekLesson = {
  id: string;
  teacherId: string;
  studentId: string;
  startsAt: string;
  endsAt: string;
  status: string;
};
type Me = { userId: string; role: string };

const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function clockToMinutes(clock: string) {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

function minutesToClock(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dateFromWeekStartAndClock(weekStartISO: string, dayIndex: number, clock: string) {
  const d = new Date(weekStartISO);
  const [h, m] = clock.split(":").map(Number);
  d.setUTCDate(d.getUTCDate() + dayIndex);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export default function CreateLessonButton({ weekStart, onCreated }: Props) {
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [loadingWeekLessons, setLoadingWeekLessons] = useState(false);

  const [students, setStudents] = useState<LookupUser[]>([]);
  const [teachers, setTeachers] = useState<LookupUser[]>([]);
  const [instruments, setInstruments] = useState<LookupInstrument[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const [me, setMe] = useState<Me | null>(null);

  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [instrumentId, setInstrumentId] = useState("");

  const [dayIndex, setDayIndex] = useState(0);
  const [startClock, setStartClock] = useState("");
  const [durationMin, setDurationMin] = useState(60);

  const [availabilities, setAvailabilities] = useState<AvailabilityRow[]>([]);
  const [weekLessons, setWeekLessons] = useState<WeekLesson[]>([]);

  const teacherLocked = me?.role === "TEACHER";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLookupError(null);
      setLoadingLookups(true);

      try {
        const [lookupsRes, meRes] = await Promise.all([
          fetch("/api/lookups", { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" }),
        ]);

        const lookupsData = await lookupsRes.json().catch(() => ({}));
        const meData = await meRes.json().catch(() => ({}));

        if (!lookupsRes.ok) {
          if (!cancelled) setLookupError(apiError(lookupsData, lookupsRes.status));
          return;
        }

        const s = Array.isArray(lookupsData?.students) ? lookupsData.students : [];
        const t = Array.isArray(lookupsData?.teachers) ? lookupsData.teachers : [];
        const i = Array.isArray(lookupsData?.instruments) ? lookupsData.instruments : [];

        if (cancelled) return;

        setStudents(s);
        setTeachers(t);
        setInstruments(i);

        if (!studentId && s[0]?.id) setStudentId(s[0].id);
        if (!instrumentId && i[0]?.id) setInstrumentId(i[0].id);

        if (meRes.ok && meData?.userId && meData?.role) {
          const mySession = { userId: String(meData.userId), role: String(meData.role) };
          setMe(mySession);

          if (mySession.role === "TEACHER") {
            setTeacherId(mySession.userId);
          } else if (!teacherId && t[0]?.id) {
            setTeacherId(t[0].id);
          }
        } else if (!teacherId && t[0]?.id) {
          setTeacherId(t[0].id);
        }
      } finally {
        if (!cancelled) setLoadingLookups(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadWeekLessons(ws: string) {
    setLoadingWeekLessons(true);
    try {
      const res = await fetch(`/api/lessons?weekStart=${encodeURIComponent(ws)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushToast(apiError(data, res.status), "error");
        setWeekLessons([]);
        return;
      }
      setWeekLessons(Array.isArray(data?.lessons) ? data.lessons : []);
    } finally {
      setLoadingWeekLessons(false);
    }
  }

  useEffect(() => {
    loadWeekLessons(weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  async function loadAvailability(currentTeacherId: string) {
    setLoadingAvailability(true);
    setAvailabilityError(null);
    try {
      const res = await fetch(`/api/availability?teacherId=${encodeURIComponent(currentTeacherId)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = apiError(data, res.status);
        setAvailabilityError(msg);
        setAvailabilities([]);
        return;
      }

      setAvailabilities(Array.isArray(data?.availabilities) ? data.availabilities : []);
    } finally {
      setLoadingAvailability(false);
    }
  }

  useEffect(() => {
    if (!teacherId) {
      setAvailabilities([]);
      return;
    }
    loadAvailability(teacherId);
  }, [teacherId]);

  const availableDayIndices = useMemo(() => {
    return [...new Set(availabilities.map((a) => a.weekday))].sort((a, b) => a - b);
  }, [availabilities]);

  useEffect(() => {
    if (!availableDayIndices.length) {
      setStartClock("");
      return;
    }
    if (!availableDayIndices.includes(dayIndex)) {
      setDayIndex(availableDayIndices[0]);
    }
  }, [availableDayIndices, dayIndex]);

  const slotOptions = useMemo(() => {
    if (!teacherId || !availableDayIndices.includes(dayIndex)) return [];

    const windows = availabilities.filter((a) => a.weekday === dayIndex);
    const unique = new Set<string>();

    for (const w of windows) {
      const start = clockToMinutes(w.startTime);
      const end = clockToMinutes(w.endTime);

      for (let minute = start; minute + durationMin <= end; minute += 15) {
        unique.add(minutesToClock(minute));
      }
    }

    const clocks = [...unique].sort((a, b) => clockToMinutes(a) - clockToMinutes(b));

    return clocks.map((clock) => {
      const slotStart = dateFromWeekStartAndClock(weekStart, dayIndex, clock);
      const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000);

      const busyTeacher = weekLessons.some((l) => {
        if (l.status === "CANCELLED") return false;
        if (l.teacherId !== teacherId) return false;
        return overlaps(slotStart, slotEnd, new Date(l.startsAt), new Date(l.endsAt));
      });

      const busyStudent = weekLessons.some((l) => {
        if (l.status === "CANCELLED") return false;
        if (!studentId || l.studentId !== studentId) return false;
        return overlaps(slotStart, slotEnd, new Date(l.startsAt), new Date(l.endsAt));
      });

      let reason = "";
      if (busyTeacher) reason = "docente occupato";
      else if (busyStudent) reason = "studente occupato";

      return { clock, disabled: busyTeacher || busyStudent, reason };
    });
  }, [teacherId, availableDayIndices, dayIndex, availabilities, durationMin, weekLessons, studentId, weekStart]);

  const hasFreeSlot = useMemo(() => slotOptions.some((s) => !s.disabled), [slotOptions]);

  useEffect(() => {
    if (!slotOptions.length) {
      setStartClock("");
      return;
    }

    const current = slotOptions.find((s) => s.clock === startClock && !s.disabled);
    if (current) return;

    const firstFree = slotOptions.find((s) => !s.disabled);
    setStartClock(firstFree?.clock ?? "");
  }, [slotOptions, startClock]);

  const startsAt = useMemo(() => {
    if (!startClock || !availableDayIndices.includes(dayIndex)) return null;
    return dateFromWeekStartAndClock(weekStart, dayIndex, startClock);
  }, [startClock, availableDayIndices, dayIndex, weekStart]);

  const endsAt = useMemo(() => {
    if (!startsAt) return null;
    return new Date(startsAt.getTime() + durationMin * 60_000);
  }, [startsAt, durationMin]);

  async function onClick() {
    setLoading(true);

    if (!studentId || !teacherId || !instrumentId) {
      pushToast("Seleziona studente, docente e strumento.", "error");
      setLoading(false);
      return;
    }

    if (!startsAt || !endsAt) {
      pushToast("Nessuno slot valido disponibile per questa selezione.", "error");
      setLoading(false);
      return;
    }

    const payload = {
      studentId,
      teacherId,
      instrumentId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      source: "REGULAR",
      status: "SCHEDULED",
    };

    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        pushToast(apiError(json, res.status), "error");
        return;
      }

      pushToast("Lezione creata", "success");
      await loadWeekLessons(weekStart);
      onCreated?.();
    } catch {
      pushToast("Connessione non riuscita. Controlla la rete e riprova.", "error");
    } finally {
      setLoading(false);
    }
  }

  const summaryDay = startsAt
    ? startsAt.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })
    : null;
  const summaryTime =
    startsAt && endsAt
      ? `${startsAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}–${endsAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`
      : null;

  const loadingNote = loadingLookups
    ? "Carico studenti e docenti…"
    : loadingAvailability
      ? "Carico le disponibilità del docente…"
      : loadingWeekLessons
        ? "Controllo le lezioni della settimana…"
        : null;

  const labelCls = "font-condensed text-xs uppercase tracking-[0.12em] text-sand";
  const fieldCls = "field-theme w-full rounded-sm px-3 py-2 text-sm";

  function dayOptionLabel(idx: number) {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + idx);
    return `${days[idx]} ${d.toLocaleDateString("it-IT", { day: "numeric", month: "numeric", timeZone: "UTC" })}`;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-x-3 gap-y-4 md:grid-cols-3">
        <label className="space-y-1.5">
          <div className={labelCls}>Studente</div>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={fieldCls}>
            {students.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.fullName ?? u.username) + ` (${u.username})`}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <div className={labelCls}>Docente</div>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className={fieldCls}
            disabled={teacherLocked}
          >
            {teachers.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.fullName ?? u.username) + ` (${u.username})`}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <div className={labelCls}>Strumento</div>
          <select value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} className={fieldCls}>
            {instruments.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <div className={labelCls}>Giorno</div>
          <select
            value={String(dayIndex)}
            onChange={(e) => setDayIndex(Number(e.target.value))}
            className={`${fieldCls} tabular`}
            disabled={!availableDayIndices.length}
          >
            {availableDayIndices.length ? (
              availableDayIndices.map((idx) => (
                <option key={idx} value={String(idx)}>
                  {dayOptionLabel(idx)}
                </option>
              ))
            ) : (
              <option value="0">Nessuna disponibilità</option>
            )}
          </select>
        </label>

        <label className="space-y-1.5">
          <div className={labelCls}>Orario</div>
          <select
            value={startClock}
            onChange={(e) => setStartClock(e.target.value)}
            className={`${fieldCls} tabular`}
            disabled={!slotOptions.length || !hasFreeSlot}
          >
            {slotOptions.length ? (
              <>
                <option value="">Scegli un orario</option>
                {slotOptions.map((slot) => (
                  <option key={slot.clock} value={slot.clock} disabled={slot.disabled}>
                    {slot.disabled ? `${slot.clock} (${slot.reason})` : slot.clock}
                  </option>
                ))}
              </>
            ) : (
              <option value="">Nessun orario libero</option>
            )}
          </select>
        </label>

        <label className="space-y-1.5">
          <div className={labelCls}>Durata</div>
          <select
            value={String(durationMin)}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className={`${fieldCls} tabular`}
          >
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={String(m)}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>

      {!loadingAvailability && teacherId && !availableDayIndices.length && !availabilityError ? (
        <p className="text-sm text-sand/90">
          Questo docente non ha ancora fasce di disponibilità. Aggiungile dalla pagina{" "}
          <a href="/availability" className="text-cream underline decoration-terracotta underline-offset-4">
            Disponibilità docenti
          </a>
          .
        </p>
      ) : null}

      <div className="flex flex-col gap-4 border-t border-[#f1debf]/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-[2.75rem]" aria-live="polite">
          {summaryDay && summaryTime ? (
            <>
              <div className="font-heading text-xl font-semibold capitalize text-cream">{summaryDay}</div>
              <div className="tabular text-sm text-sand/90">
                {summaryTime} · {durationMin} min
              </div>
            </>
          ) : (
            <div className="text-sm text-sand/80">{loadingNote ?? "Scegli docente, giorno e orario per vedere il riepilogo."}</div>
          )}
        </div>

        <button
          onClick={onClick}
          disabled={loading || !!lookupError || !!availabilityError || !startsAt || !endsAt || !hasFreeSlot}
          className="btn-primary inline-flex items-center justify-center rounded-sm px-5 py-2.5 font-condensed text-sm uppercase tracking-[0.08em]"
        >
          {loading ? "Creo la lezione…" : "Crea lezione"}
        </button>
      </div>

      {lookupError ? (
        <div role="alert" className="rounded-sm border border-terracotta/60 bg-[#2a1a17] p-3 text-sm text-[#ffd8c6]">
          Non riesco a caricare studenti e docenti: {lookupError}
        </div>
      ) : null}

      {availabilityError ? (
        <div role="alert" className="rounded-sm border border-terracotta/60 bg-[#2a1a17] p-3 text-sm text-[#ffd8c6]">
          Non riesco a caricare le disponibilità del docente: {availabilityError}
        </div>
      ) : null}
    </div>
  );
}
