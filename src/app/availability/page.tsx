"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../components/ToastProvider";

type Me = { userId: string; role: string };
type LookupTeacher = { id: string; username: string; fullName: string | null };
type AvailabilityRow = {
  id: string;
  teacherId: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

const DAY_LABELS = ["Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi", "Sabato", "Domenica"];

export default function AvailabilityPage() {
  const router = useRouter();
  const { pushToast } = useToast();

  const [me, setMe] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [teachers, setTeachers] = useState<LookupTeacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [loadingRows, setLoadingRows] = useState(false);
  const [rows, setRows] = useState<AvailabilityRow[]>([]);

  const [weekday, setWeekday] = useState(0);
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState("19:00");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isTeacher = me?.role === "TEACHER";
  const isAdmin = me?.role === "ADMIN";
  const canManage = isTeacher || isAdmin;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        if (meRes.status === 401) {
          router.replace("/login");
          return;
        }
        const meData = await meRes.json().catch(() => ({}));
        if (!meRes.ok) {
          pushToast(meData?.error ?? `HTTP ${meRes.status}`, "error");
          return;
        }

        if (cancelled) return;
        setMe({ userId: meData.userId, role: meData.role });

        if (meData.role === "TEACHER") {
          setTeacherId(meData.userId);
          return;
        }

        if (meData.role === "ADMIN") {
          const lookupsRes = await fetch("/api/lookups", { credentials: "include" });
          const lookupsData = await lookupsRes.json().catch(() => ({}));
          if (!lookupsRes.ok) {
            pushToast(lookupsData?.error ?? `HTTP ${lookupsRes.status}`, "error");
            return;
          }

          if (cancelled) return;
          const t = Array.isArray(lookupsData?.teachers) ? (lookupsData.teachers as LookupTeacher[]) : [];
          setTeachers(t);
          if (t[0]?.id) setTeacherId(t[0].id);
          return;
        }
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [pushToast, router]);

  async function loadAvailability(currentTeacherId: string) {
    setLoadingRows(true);
    try {
      const res = await fetch(`/api/availability?teacherId=${encodeURIComponent(currentTeacherId)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        pushToast(data?.error ?? `HTTP ${res.status}`, "error");
        return;
      }

      setRows(Array.isArray(data?.availabilities) ? data.availabilities : []);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    if (!teacherId || !canManage) return;
    loadAvailability(teacherId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, canManage]);

  async function addAvailability() {
    if (!teacherId) {
      pushToast("Seleziona un docente", "error");
      return;
    }
    if (startTime >= endTime) {
      pushToast("L'orario di inizio deve essere prima di quello di fine", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, weekday, startTime, endTime }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        pushToast(data?.error ?? `HTTP ${res.status}`, "error");
        return;
      }

      pushToast("Disponibilita aggiunta", "success");
      await loadAvailability(teacherId);
    } finally {
      setSaving(false);
    }
  }

  async function removeAvailability(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/availability/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        pushToast(data?.error ?? `HTTP ${res.status}`, "error");
        return;
      }

      pushToast("Disponibilita rimossa", "success");
      await loadAvailability(teacherId);
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = useMemo(() => {
    return DAY_LABELS.map((label, idx) => ({
      label,
      rows: rows.filter((r) => r.weekday === idx),
    }));
  }, [rows]);

  if (loadingMe) {
    return (
      <main className="relative min-h-screen overflow-hidden text-[#1d1712] leading-relaxed">
        <div className="relative mx-auto max-w-7xl px-4 py-6">
          <div className="surface-paper rounded-lg p-4 text-sm">Caricamento...</div>
        </div>
      </main>
    );
  }

  if (!canManage) {
    return (
      <main className="relative min-h-screen overflow-hidden text-[#1d1712] leading-relaxed">
        <div className="relative mx-auto max-w-7xl px-4 py-6">
          <div className="surface-paper rounded-lg p-4 text-sm">Accesso non consentito.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-[#1d1712] leading-relaxed">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(188,78,49,0.13)_0%,transparent_52%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.4)_0%,transparent_56%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 space-y-6">
        <header className="surface-paper rounded-lg p-4">
          <p className="font-condensed text-xs uppercase tracking-[0.22em] text-[#7d6652]">Gestione Docenti</p>
          <h1 className="font-display text-4xl font-bold uppercase tracking-[0.03em] text-[#bc4e31] sm:text-5xl">
            Disponibilita
          </h1>
        </header>

        <section className="surface-paper rounded-lg p-4 space-y-4">
          <h2 className="font-heading text-2xl font-semibold uppercase">Nuova fascia</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-1 xl:col-span-2">
              <div className="font-condensed text-xs uppercase tracking-[0.12em] text-[#6f5c4c]">Docente</div>
              {isTeacher ? (
                <div className="field-theme rounded-sm px-3 py-2 text-sm">{me?.userId}</div>
              ) : (
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="field-theme w-full rounded-sm px-3 py-2 text-sm"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {(t.fullName ?? t.username) + ` (${t.username})`}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="space-y-1">
              <div className="font-condensed text-xs uppercase tracking-[0.12em] text-[#6f5c4c]">Giorno</div>
              <select
                value={String(weekday)}
                onChange={(e) => setWeekday(Number(e.target.value))}
                className="field-theme w-full rounded-sm px-3 py-2 text-sm"
              >
                {DAY_LABELS.map((d, idx) => (
                  <option key={d} value={String(idx)}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <div className="font-condensed text-xs uppercase tracking-[0.12em] text-[#6f5c4c]">Inizio</div>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="field-theme w-full rounded-sm px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <div className="font-condensed text-xs uppercase tracking-[0.12em] text-[#6f5c4c]">Fine</div>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="field-theme w-full rounded-sm px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            onClick={addAvailability}
            disabled={saving || !teacherId}
            className="btn-primary rounded-sm px-4 py-2 font-condensed text-sm uppercase tracking-[0.08em] disabled:opacity-60"
          >
            {saving ? "Salvo..." : "Aggiungi fascia"}
          </button>
        </section>

        <section className="surface-paper rounded-lg p-4 space-y-4">
          <h2 className="font-heading text-2xl font-semibold uppercase">Fasce attive</h2>
          {loadingRows ? (
            <div className="text-sm text-[#6f5c4c]">Caricamento...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {grouped.map((g) => (
                <div key={g.label} className="rounded-md border border-[#c6ad8e] bg-[#fff8e9] p-3">
                  <div className="font-condensed text-xs uppercase tracking-[0.12em] text-[#6f5c4c]">{g.label}</div>
                  {g.rows.length === 0 ? (
                    <div className="mt-2 text-sm text-[#8a7765]">Nessuna fascia</div>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {g.rows.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-[#e0c9ab] px-2 py-1.5">
                          <span className="font-semibold text-sm">
                            {r.startTime} - {r.endTime}
                          </span>
                          <button
                            onClick={() => removeAvailability(r.id)}
                            disabled={deletingId === r.id}
                            className="btn-secondary rounded-sm px-2 py-1 font-condensed text-xs uppercase tracking-[0.08em]"
                          >
                            {deletingId === r.id ? "..." : "Rimuovi"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
