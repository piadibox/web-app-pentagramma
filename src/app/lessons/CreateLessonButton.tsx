"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "../components/ToastProvider";

type Props = {
  weekStart: string;
  onCreated?: () => void;
};

type LookupUser = { id: string; username: string; fullName: string | null };
type LookupInstrument = { id: string; name: string };

function isoFromWeekStart(weekStartISO: string, dayIndex: number, hour: number, minute: number) {
  const d = new Date(weekStartISO);
  d.setDate(d.getDate() + dayIndex);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export default function CreateLessonButton({ weekStart, onCreated }: Props) {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [students, setStudents] = useState<LookupUser[]>([]);
  const [teachers, setTeachers] = useState<LookupUser[]>([]);
  const [instruments, setInstruments] = useState<LookupInstrument[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [instrumentId, setInstrumentId] = useState("");

  const [dayIndex, setDayIndex] = useState(0);
  const [startHour, setStartHour] = useState(17);
  const [startMinute, setStartMinute] = useState(0);
  const [durationMin, setDurationMin] = useState(60);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLookupError(null);
      const res = await fetch("/api/lookups", { credentials: "include" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (!cancelled) setLookupError(data?.error ?? `HTTP ${res.status}`);
        return;
      }

      const s = Array.isArray(data?.students) ? data.students : [];
      const t = Array.isArray(data?.teachers) ? data.teachers : [];
      const i = Array.isArray(data?.instruments) ? data.instruments : [];

      if (cancelled) return;

      setStudents(s);
      setTeachers(t);
      setInstruments(i);

      if (!studentId && s[0]?.id) setStudentId(s[0].id);
      if (!teacherId && t[0]?.id) setTeacherId(t[0].id);
      if (!instrumentId && i[0]?.id) setInstrumentId(i[0].id);
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startsAt = useMemo(
    () => isoFromWeekStart(weekStart, dayIndex, startHour, startMinute),
    [weekStart, dayIndex, startHour, startMinute]
  );

  const endsAt = useMemo(() => {
    const d = new Date(startsAt);
    d.setTime(d.getTime() + durationMin * 60_000);
    return d.toISOString();
  }, [startsAt, durationMin]);

  async function onClick() {
    setLoading(true);

    if (!studentId || !teacherId || !instrumentId) {
      pushToast("Seleziona studente, docente e strumento.", "error");
      setLoading(false);
      return;
    }

    const payload = {
      studentId,
      teacherId,
      instrumentId,
      startsAt,
      endsAt,
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
        pushToast(json?.error ?? `HTTP ${res.status}`, "error");
      } else {
        pushToast("Lezione creata", "success");
        onCreated?.();
      }
    } catch (e: any) {
      pushToast(e?.message ?? "Errore di rete", "error");
    } finally {
      setLoading(false);
    }
  }

  const preview = `${new Date(startsAt).toLocaleString("it-IT")} → ${new Date(endsAt).toLocaleTimeString("it-IT")}`;

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
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={fieldCls}>
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
          <select value={String(dayIndex)} onChange={(e) => setDayIndex(Number(e.target.value))} className={fieldCls}>
            {days.map((d, idx) => (
              <option key={d} value={String(idx)}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className={labelCls}>Ora inizio</div>
          <input
            type="time"
            value={`${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              setStartHour(h);
              setStartMinute(m);
            }}
            className={fieldCls}
          />
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-sm border border-[#c6ad8e] bg-[#fff8e9] px-3 py-2 text-sm text-[#6f5c4c]">
          <span className="font-condensed text-xs uppercase tracking-[0.12em] text-[#bc4e31]">Preview</span>{" "}
          <span className="ml-1 font-semibold text-[#1d1712]">{preview}</span>
        </div>

        <button
          onClick={onClick}
          disabled={loading || !!lookupError}
          className="btn-primary inline-flex items-center justify-center rounded-sm px-4 py-2 font-condensed text-sm uppercase tracking-[0.08em] disabled:opacity-60"
        >
          {loading ? "Creo…" : "Crea lezione"}
        </button>
      </div>

      {lookupError ? (
        <div className="rounded-sm border border-[#bc4e31]/60 bg-[#fff1df] p-3 text-sm text-[#8b321e]">
          Errore lookups: <span className="font-mono">{lookupError}</span>
        </div>
      ) : null}
    </div>
  );
}
