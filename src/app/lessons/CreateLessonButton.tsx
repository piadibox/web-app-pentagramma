"use client";

import { useState } from "react";

export default function CreateLessonButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function onClick() {
    setLoading(true);
    setMsg("");

    // Valori di test: per ora li mettiamo qui hardcoded
    // (nel prossimo step li rendiamo selezionabili)
    const payload = {
      studentId: "cmk89gci70002f11gin1q24w2",
      teacherId: "cmk89gc110001f11gg33uo0bw",
      instrumentId: "cmk89gbl10000f11gqftrzu1l",
      startsAt: "2026-01-12T17:00:00.000Z",
      endsAt: "2026-01-12T18:00:00.000Z",
      weekStart: "2026-01-12T00:00:00.000Z",
      source: "REGULAR",
      status: "SCHEDULED",
    };

    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(`Errore ${res.status}: ${json?.error ?? "unknown"}`);
      } else {
        setMsg(`OK! Creata lezione id=${json.lesson.id}`);
        // refresh pagina per rivedere tabella aggiornata
        window.location.reload();
      }
    } catch (e: any) {
      setMsg(`Errore: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={onClick}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #ddd",
          background: loading ? "#f3f3f3" : "white",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
      >
        {loading ? "Creo..." : "Crea lezione (test)"}
      </button>

      {msg ? (
        <div style={{ marginTop: 10, opacity: 0.85 }}>
          <code>{msg}</code>
        </div>
      ) : null}
    </div>
  );
}
