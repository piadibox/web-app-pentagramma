"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiError } from "@/lib/labels";

// Italian school years start in September: Oct 2026 -> 2026/27.
function schoolYearLabel(d = new Date()) {
  const start = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(apiError(data, res.status));
        return;
      }

      router.replace("/lessons");
      router.refresh();
    } catch {
      setError("Connessione non riuscita. Controlla la rete e riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden px-4 py-8 md:px-6 md:py-12">
      <div className="page-glow" />
      <div className="rise-in relative mx-auto grid w-full min-w-0 max-w-5xl overflow-hidden rounded-lg border border-[#b99d79] bg-paper-soft shadow-[0_28px_56px_-34px_rgba(26,17,11,0.55)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="relative overflow-hidden border-b border-[#b99d79] bg-terracotta p-6 text-cream sm:p-7 md:border-b-0 md:border-r md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_14%,rgba(255,248,233,0.24),transparent_46%),radial-gradient(circle_at_84%_80%,rgba(27,18,12,0.25),transparent_54%)]" />
          {/* Staff lines: a quiet nod to the school's name. */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute bottom-28 right-0 hidden h-20 w-2/3 text-cream/15 md:block"
            viewBox="0 0 400 96"
            preserveAspectRatio="none"
          >
            {[8, 28, 48, 68, 88].map((y) => (
              <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="currentColor" strokeWidth="1.5" />
            ))}
          </svg>

          <div className="relative flex h-full flex-col gap-6">
            <h1 className="font-display text-[clamp(2rem,9vw,3.25rem)] font-bold uppercase leading-[0.92] md:text-5xl xl:text-[3.5rem]">Pentagramma</h1>
            <p className="max-w-md text-base text-[#fff1de]">
              Scuola di musica con anima jazz. Qui docenti e segreteria gestiscono lezioni, orari e disponibilità.
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-6 text-[#ffe9cf]">
              <span className="flex items-baseline gap-2">
                <span className="font-display text-4xl leading-none">40</span>
                <span className="font-condensed text-xs uppercase tracking-[0.12em]">anni di attività</span>
              </span>
              <span aria-hidden="true" className="hidden h-6 w-px bg-cream/30 sm:block" />
              <span className="font-condensed text-xs uppercase tracking-[0.12em]">
                Anno scolastico <span className="tabular">{schoolYearLabel()}</span>
              </span>
            </div>
          </div>
        </section>

        <section className="surface-dark rounded-none border-0 p-6 sm:p-7 md:p-10">
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-heading text-3xl font-semibold text-cream">Accedi</h2>
              <p className="text-sm text-[#d9c5a8]">Area riservata a docenti e segreteria.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <label className="grid gap-2">
                <span className="font-condensed text-xs uppercase tracking-[0.14em] text-sand">Nome utente</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  required
                  aria-invalid={!!error}
                  className="field-theme rounded-sm px-3 py-2.5 text-base sm:text-sm"
                />
              </label>

              <label className="grid gap-2">
                <span className="font-condensed text-xs uppercase tracking-[0.14em] text-sand">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                  className="field-theme rounded-sm px-3 py-2.5 text-base sm:text-sm"
                />
              </label>

              {error ? (
                <div
                  id="login-error"
                  role="alert"
                  className="rounded-sm border border-terracotta/70 bg-[#2a1a17] px-3 py-2 text-sm text-[#ffd8c6]"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full rounded-sm px-4 py-2.5 font-condensed text-sm uppercase tracking-[0.1em]"
              >
                {loading ? "Accesso in corso…" : "Accedi"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
