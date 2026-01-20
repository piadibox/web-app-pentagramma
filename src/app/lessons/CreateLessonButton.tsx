"use client";

import { useEffect, useMemo, useState } from "react";

type Props = { weekStart: string };

type LookupUser = { id: string; username: string; fullName: string | null };
type LookupInstrument = { id: string; name: string };

function isoFromWeekStart(weekStartISO: string, dayIndex: number, hour: number, minute: number) {
  // weekStartISO è Monday 00:00Z
  const d = new Date(weekStartISO);
  d.setUTCDate(d.getUTCDate() + dayIndex);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

export default function CreateLessonButton({ weekStart }: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [students, setStudents] = useState<LookupUser[]>([]);
  const [teachers, setTeachers] = useState<LookupUser[]>([]);
  const [instruments, setInstruments] = useState<LookupInstrument[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [instrumentId, setInstrumentId] = useState("");

  // ✅ nuova parte: giorno + ora + durata
  const [dayIndex, setDayIndex] = useState(0); // 0=Lun ... 6=Dom
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
    d.setUTCMinutes(d.getUTCMinutes() + durationMin);
    return d.toISOString();
  }, [startsAt, durationMin]);

  async function onClick() {
    setLoading(true);
    setMsg("");

    if (!studentId || !teacherId || !instrumentId) {
      setMsg("Seleziona studente, docente e strumento.");
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
        setMsg(`Errore ${res.status}: ${json?.error ?? "unknown"}`);
      } else {
        setMsg(`OK! Creata lezione id=${json.lesson.id}`);
        window.location.reload();
      }
    } catch (e: any) {
      setMsg(`Errore: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Studente</div>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", minWidth: 240 }}
          >
            {students.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.fullName ?? u.username) + ` (${u.username})`}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Docente</div>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", minWidth: 240 }}
          >
            {teachers.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.fullName ?? u.username) + ` (${u.username})`}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Strumento</div>
          <select
            value={instrumentId}
            onChange={(e) => setInstrumentId(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", minWidth: 220 }}
          >
            {instruments.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>

        {/* ✅ Data/ora */}
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Giorno</div>
          <select
            value={String(dayIndex)}
            onChange={(e) => setDayIndex(Number(e.target.value))}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", minWidth: 90 }}
          >
            {days.map((d, idx) => (
              <option key={d} value={String(idx)}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Ora inizio</div>
          <input
            type="time"
            value={`${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              setStartHour(h);
              setStartMinute(m);
            }}
            style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #ddd" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Durata</div>
          <select
            value={String(durationMin)}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", minWidth: 110 }}
          >
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={String(m)}>
                {m} min
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Preview</div>
          <div style={{ fontSize: 13, whiteSpace: "nowrap" }}>
            {new Date(startsAt).toLocaleString("it-IT")} →{" "}
            {new Date(endsAt).toLocaleTimeString("it-IT")}
          </div>
        </div>

        <button
          onClick={onClick}
          disabled={loading || !!lookupError}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: loading ? "#f3f3f3" : "white",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Creo..." : "Crea lezione"}
        </button>
      </div>

      {lookupError ? (
        <div style={{ marginTop: 10, color: "#b00020" }}>
          Errore lookups: <code>{lookupError}</code>
        </div>
      ) : null}

      {msg ? (
        <div style={{ marginTop: 10, opacity: 0.85 }}>
          <code>{msg}</code>
        </div>
      ) : null}
    </div>
  );
}
