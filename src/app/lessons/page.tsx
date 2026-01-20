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
  const day = x.getUTCDay(); // 0=Sun..6=Sat
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

export default function LessonsPage() {
  const [weekStart, setWeekStart] = useState(() => toISOWeekStartUTC(new Date()));

  const [status, setStatus] = useState<number | null>(null);
  const [json, setJson] = useState<any>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const weekLabel = useMemo(() => {
    const d = new Date(weekStart);
    return d.toLocaleDateString("it-IT", { dateStyle: "medium" });
  }, [weekStart]);

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

  async function moveLessonPlus1h(l: LessonRow) {
    if (l.status === "CANCELLED") return;

    setBusyId(l.id);
    try {
      const startsAt = addMinutesISO(l.startsAt, 60);
      const endsAt = addMinutesISO(l.endsAt, 60);

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

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Lezioni</h1>
          <div style={{ opacity: 0.7 }}>
            Settimana dal <strong>{weekLabel}</strong> — status API: <strong>{status ?? "..."}</strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setWeekStart((ws) => addDaysUTC(ws, -7))}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "white" }}
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekStart(toISOWeekStartUTC(new Date()))}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "white" }}
          >
            Oggi
          </button>
          <button
            onClick={() => setWeekStart((ws) => addDaysUTC(ws, 7))}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "white" }}
          >
            Next →
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            Caricamento…
          </div>
        ) : status !== 200 ? (
          <div style={{ padding: 12, border: "1px solid #f0c", borderRadius: 8 }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(json, null, 2)}</pre>
          </div>
        ) : lessons.length === 0 ? (
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            Nessuna lezione trovata.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #ddd",
                borderRadius: 8,
              }}
            >
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["Quando", "Studente", "Insegnante", "Strumento", "Stato", "Azioni"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: 10,
                        borderBottom: "1px solid #ddd",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => {
                  const isCancelled = l.status === "CANCELLED";
                  return (
                    <tr key={l.id} style={{ opacity: isCancelled ? 0.6 : 1 }}>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>
                        {new Date(l.startsAt).toLocaleString("it-IT")} →{" "}
                        {new Date(l.endsAt).toLocaleTimeString("it-IT")}
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                        {l.student?.fullName ?? l.student?.username ?? "-"}
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                        {l.teacher?.fullName ?? l.teacher?.username ?? "-"}
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                        {l.instrument?.name ?? "-"}
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{l.status}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => moveLessonPlus1h(l)}
                          disabled={isCancelled || busyId === l.id}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            background: "white",
                            cursor: isCancelled ? "not-allowed" : "pointer",
                            marginRight: 8,
                          }}
                          title={isCancelled ? "Già annullata" : "Sposta di +1 ora"}
                        >
                          {busyId === l.id ? "..." : "+1h"}
                        </button>

                        <button
                          onClick={() => cancelLesson(l.id)}
                          disabled={isCancelled || busyId === l.id}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            background: isCancelled ? "#f5f5f5" : "white",
                            cursor: isCancelled ? "not-allowed" : "pointer",
                          }}
                          title={isCancelled ? "Già annullata" : "Annulla lezione"}
                        >
                          {busyId === l.id ? "..." : "Annulla"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <CreateLessonButton weekStart={weekStart} onCreated={() => load()} />

      </div>
    </main>
  );
}
