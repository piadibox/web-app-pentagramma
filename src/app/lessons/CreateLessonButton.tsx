"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "../components/ToastProvider";

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
          if (!cancelled) setLookupError(lookupsData?.error ?? `HTTP ${lookupsRes.status}`);
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
        pushToast(data?.error ?? `HTTP ${res.status}`, "error");
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
        const msg = data?.error ?? `HTTP ${res.status}`;
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
        if (res.status === 409 && json?.code === "CONFLICT") {
          pushToast(`Conflitto: ${json?.error ?? "docente/studente gia impegnato"}`, "error");
        } else {
          pushToast(json?.error ?? `HTTP ${res.status}`, "error");
        }
        return;
      }

      pushToast("Lezione creata", "success");
      await loadWeekLessons(weekStart);
      onCreated?.();
    } catch (e: any) {
      pushToast(e?.message ?? "Errore di rete", "error");
    } finally {
      setLoading(false);
    }
  }

  const preview =
    startsAt && endsAt
      ? `${startsAt.toLocaleString("it-IT")} → ${endsAt.toLocaleTimeString("it-IT")}`
      : "Nessuno slot disponibile";

  const labelCls = "font-condensed text-xs uppercase tracking-[0.12em] text-[#6f5c4c]";
  const fieldCls = "field-theme w-full rounded-sm px-3 py-2 text-sm shadow-sm transition";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-1">
          <div className={labelCls}>Studente</div>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={fieldCls}>
            {students.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.fullName ?? u.username) + ` (${u.username})`}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className={labelCls}>Insegnante</div>
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

        <label className="space-y-1">
          <div className={labelCls}>Strumento</div>
          <select value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} className={fieldCls}>
            {instruments.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className={labelCls}>Giorno</div>
          <select
            value={String(dayIndex)}
            onChange={(e) => setDayIndex(Number(e.target.value))}
            className={fieldCls}
            disabled={!availableDayIndices.length}
          >
            {availableDayIndices.length ? (
              availableDayIndices.map((idx) => (
                <option key={idx} value={String(idx)}>
                  {days[idx]}
                </option>
              ))
            ) : (
              <option value="0">Nessuna disponibilita</option>
            )}
          </select>
        </label>

        <label className="space-y-1">
          <div className={labelCls}>Orario disponibile</div>
          <select
            value={startClock}
            onChange={(e) => setStartClock(e.target.value)}
            className={fieldCls}
            disabled={!slotOptions.length || !hasFreeSlot}
          >
            {slotOptions.length ? (
              <>
                <option value="">Seleziona slot</option>
                {slotOptions.map((slot) => (
                  <option key={slot.clock} value={slot.clock} disabled={slot.disabled}>
                    {slot.disabled ? `${slot.clock} (${slot.reason})` : slot.clock}
                  </option>
                ))}
              </>
            ) : (
              <option value="">Nessuno slot</option>
            )}
          </select>
        </label>

        <label className="space-y-1">
          <div className={labelCls}>Durata</div>
          <select value={String(durationMin)} onChange={(e) => setDurationMin(Number(e.target.value))} className={fieldCls}>
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={String(m)}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-sm border border-[#c6ad8e] bg-[#fff8e9] px-3 py-2 text-sm text-[#6f5c4c]">
        <span className="font-condensed text-xs uppercase tracking-[0.12em] text-[#bc4e31]">Preview</span>{" "}
        <span className="ml-1 font-semibold text-[#1d1712]">{preview}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[#7f6b59]">
        {loadingLookups ? <span>Caricamento lookups...</span> : null}
        {loadingAvailability ? <span>Caricamento disponibilita...</span> : null}
        {loadingWeekLessons ? <span>Caricamento lezioni settimana...</span> : null}
      </div>

      <button
        onClick={onClick}
        disabled={loading || !!lookupError || !!availabilityError || !startsAt || !endsAt || !hasFreeSlot}
        className="btn-primary inline-flex items-center justify-center rounded-sm px-4 py-2 font-condensed text-sm uppercase tracking-[0.08em] disabled:opacity-60"
      >
        {loading ? "Creo..." : "Crea lezione"}
      </button>

      {lookupError ? (
        <div className="rounded-sm border border-[#bc4e31]/60 bg-[#fff1df] p-3 text-sm text-[#8b321e]">
          Errore lookups: <span className="font-mono">{lookupError}</span>
        </div>
      ) : null}

      {availabilityError ? (
        <div className="rounded-sm border border-[#bc4e31]/60 bg-[#fff1df] p-3 text-sm text-[#8b321e]">
          Errore disponibilita: <span className="font-mono">{availabilityError}</span>
        </div>
      ) : null}
    </div>
  );
}
