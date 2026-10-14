"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../components/ToastProvider";
import { DAY_LABELS, apiError, personName } from "@/lib/labels";

type Me = { userId: string; role: string; fullName: string | null; username: string | null };
type LookupTeacher = { id: string; username: string; fullName: string | null };
type AvailabilityRow = {
  id: string;
  teacherId: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

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
          pushToast(apiError(meData, meRes.status), "error");
          return;
        }

        if (cancelled) return;
        setMe({
          userId: meData.userId,
          role: meData.role,
          fullName: meData.fullName ?? null,
          username: meData.username ?? null,
        });

        if (meData.role === "TEACHER") {
          setTeacherId(meData.userId);
          return;
        }

        if (meData.role === "ADMIN") {
          const lookupsRes = await fetch("/api/lookups", { credentials: "include" });
          const lookupsData = await lookupsRes.json().catch(() => ({}));
          if (!lookupsRes.ok) {
            pushToast(apiError(lookupsData, lookupsRes.status), "error");
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
        pushToast(apiError(data, res.status), "error");
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
        pushToast(apiError(data, res.status), "error");
        return;
      }

      pushToast("Fascia aggiunta", "success");
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
        pushToast(apiError(data, res.status), "error");
        return;
      }

      pushToast("Fascia rimossa", "success");
      await loadAvailability(teacherId);
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = useMemo(() => {
    return DAY_LABELS.map((label, idx) => ({
      label,
      idx,
      rows: rows.filter((r) => r.weekday === idx).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
  }, [rows]);

  const todayIdx = useMemo(() => (new Date().getDay() + 6) % 7, []);
  const timeInvalid = !!startTime && !!endTime && startTime >= endTime;
  const startRef = useRef<HTMLInputElement>(null);

  function prefillDay(idx: number) {
    setWeekday(idx);
    startRef.current?.focus();
  }

  const labelCls = "font-condensed text-xs uppercase tracking-[0.12em] text-muted";
  const fieldCls = "field-theme w-full rounded-sm px-3 py-2 text-sm";

  if (loadingMe || !canManage) {
    return (
      <main className="relative min-h-screen overflow-hidden leading-relaxed text-ink">
        <div className="page-glow" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 md:py-8">
          {loadingMe ? (
            <div className="space-y-4" aria-busy="true">
              <div className="skeleton h-12 w-64 rounded-sm" />
              <div className="skeleton h-40 rounded-lg" />
            </div>
          ) : (
            <div className="surface-paper max-w-lg rounded-lg p-5">
              <h1 className="font-heading text-2xl font-semibold text-ink">Pagina riservata</h1>
              <p className="mt-1 text-sm text-muted">
                Le disponibilità possono essere gestite solo dai docenti e dall&apos;amministrazione.
              </p>
            </div>
          )}
        </div>
      </main>
    );
  }

  const selectedTeacher = isTeacher ? me : teachers.find((t) => t.id === teacherId);

  return (
    <main className="relative min-h-screen overflow-hidden leading-relaxed text-ink">
      <div className="page-glow" />
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:py-8">
        <header className="rise-in">
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-[0.02em] text-terracotta sm:text-5xl">
            Disponibilità
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted">
            Le fasce settimanali in cui {isTeacher ? "puoi" : "il docente può"} ricevere lezioni. Il modulo
            &ldquo;Nuova lezione&rdquo; propone solo orari dentro queste fasce.
          </p>
        </header>

        <section className="surface-paper space-y-4 rounded-lg p-4 md:p-5" aria-labelledby="new-slot-title">
          <h2 id="new-slot-title" className="font-heading text-2xl font-semibold uppercase">
            Nuova fascia
          </h2>

          <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-[2fr_1.2fr_1fr_1fr_auto] md:items-end">
            <label className="col-span-2 space-y-1.5 md:col-span-1">
              <div className={labelCls}>Docente</div>
              {isTeacher ? (
                <div className="field-theme w-full rounded-sm px-3 py-2 text-sm">{personName(me)}</div>
              ) : (
                <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={fieldCls}>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {(t.fullName ?? t.username) + ` (${t.username})`}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="col-span-2 space-y-1.5 md:col-span-1">
              <div className={labelCls}>Giorno</div>
              <select value={String(weekday)} onChange={(e) => setWeekday(Number(e.target.value))} className={fieldCls}>
                {DAY_LABELS.map((d, idx) => (
                  <option key={d} value={String(idx)}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <div className={labelCls}>Dalle</div>
              <input
                ref={startRef}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`${fieldCls} tabular`}
              />
            </label>

            <label className="space-y-1.5">
              <div className={labelCls}>Alle</div>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                aria-invalid={timeInvalid}
                aria-describedby={timeInvalid ? "time-error" : undefined}
                className={`${fieldCls} tabular`}
              />
            </label>

            <button
              onClick={addAvailability}
              disabled={saving || !teacherId || timeInvalid}
              className="btn-primary col-span-2 rounded-sm px-4 py-2 font-condensed text-sm uppercase tracking-[0.08em] md:col-span-1"
            >
              {saving ? "Salvo…" : "Aggiungi fascia"}
            </button>
          </div>

          {timeInvalid ? (
            <p id="time-error" className="text-sm text-terracotta-dark">
              L&apos;orario di fine deve essere successivo a quello di inizio.
            </p>
          ) : null}
        </section>

        <section className="surface-paper space-y-4 rounded-lg p-4 md:p-5" aria-labelledby="week-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="week-title" className="font-heading text-2xl font-semibold uppercase">
              Settimana tipo
            </h2>
            {selectedTeacher ? <span className="text-sm text-muted">{personName(selectedTeacher)}</span> : null}
          </div>

          {loadingRows && !rows.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7" aria-busy="true">
              {DAY_LABELS.map((d) => (
                <div key={d} className="skeleton h-28 rounded-md" />
              ))}
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-7 ${
                loadingRows ? "opacity-60" : ""
              }`}
            >
              {grouped.map((g) => {
                const isToday = g.idx === todayIdx;
                return (
                  <div
                    key={g.label}
                    className={`flex flex-col rounded-md border p-3 ${
                      isToday ? "border-terracotta bg-[#fff2e0]" : "border-line bg-cream"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className={`font-heading text-lg font-semibold ${isToday ? "text-terracotta" : "text-ink"}`}>
                        {g.label}
                      </h3>
                      {isToday ? (
                        <span className="font-condensed text-[11px] uppercase tracking-[0.12em] text-terracotta">Oggi</span>
                      ) : null}
                    </div>

                    {g.rows.length === 0 ? (
                      <p className="mt-2 text-sm text-faint">Nessuna fascia</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {g.rows.map((r) => (
                          <li
                            key={r.id}
                            className="flex items-center justify-between gap-1 rounded-sm border border-line-soft bg-paper-soft py-1 pl-2 pr-1"
                          >
                            <span className="tabular text-sm font-semibold">
                              {r.startTime}–{r.endTime}
                            </span>
                            <button
                              onClick={() => removeAvailability(r.id)}
                              disabled={deletingId === r.id}
                              aria-label={`Rimuovi fascia ${g.label} ${r.startTime}–${r.endTime}`}
                              title="Rimuovi"
                              className="grid h-7 w-7 place-items-center rounded-sm text-muted transition-colors hover:bg-terracotta/10 hover:text-terracotta-dark disabled:opacity-40"
                            >
                              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                              </svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      onClick={() => prefillDay(g.idx)}
                      className="mt-auto self-start rounded-sm pt-3 text-xs text-terracotta-dark underline decoration-terracotta/30 underline-offset-4 transition-colors hover:decoration-terracotta"
                    >
                      Aggiungi qui
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

