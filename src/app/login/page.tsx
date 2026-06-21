"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        setError(data?.error ?? "Login fallito");
        return;
      }

      router.replace("/lessons");
      router.refresh();
    } catch {
      setError("Errore di rete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-6 md:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(188,78,49,0.13)_0%,transparent_52%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.4)_0%,transparent_56%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 rise-in">
        <div className="surface-dark overflow-hidden rounded-lg p-3">
          <div className="flex flex-wrap gap-1">
            <span className="bg-[#bc4e31] px-3 py-1.5 font-condensed text-xs uppercase tracking-[0.1em] text-[#fff8e9]">
              Eventi e News
            </span>
            <span className="px-3 py-1.5 font-condensed text-xs uppercase tracking-[0.1em] text-[#e6d6bf]">Iscrizioni</span>
            <span className="px-3 py-1.5 font-condensed text-xs uppercase tracking-[0.1em] text-[#e6d6bf]">
              Lezioni di Strumento
            </span>
          </div>
        </div>

        <div className="grid overflow-hidden rounded-lg border border-[#b99d79] bg-[#f7efdf] shadow-[0_28px_56px_-34px_rgba(26,17,11,0.55)] md:grid-cols-[1.1fr_0.9fr]">
          <section className="relative overflow-hidden border-b border-[#b99d79] bg-[#bc4e31] p-7 text-[#fff8e9] md:border-b-0 md:border-r">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_14%,rgba(255,248,233,0.24),transparent_46%),radial-gradient(circle_at_84%_80%,rgba(27,18,12,0.25),transparent_54%)]" />
            <div className="relative space-y-4">
              <div className="font-condensed text-xs uppercase tracking-[0.28em] text-[#f9dcc0]">A.S. 2025-26</div>
              <h1 className="font-display text-5xl font-bold uppercase leading-[0.92] sm:text-6xl">Pentagramma</h1>
              <p className="max-w-lg text-base text-[#fff1de]">
                Scuola di musica con anima jazz: gestione lezioni, studenti e docenti in una dashboard chiara e pronta
                alla presentazione.
              </p>
              <div className="inline-flex items-center gap-3 rounded-sm border border-[#f7d8b8]/35 bg-[#1a1210]/18 px-4 py-2">
                <span className="font-display text-4xl leading-none">40</span>
                <span className="font-condensed text-xs uppercase tracking-[0.12em] text-[#ffe9cf]">Anni di attivita</span>
              </div>
            </div>
          </section>

          <section className="surface-dark p-7">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="font-condensed text-xs uppercase tracking-[0.2em] text-[#f3dfc3]">Accesso riservato</p>
                <h2 className="font-heading text-3xl font-semibold uppercase text-[#fff8e9]">Accedi al gestionale</h2>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <label className="grid gap-2">
                  <span className="font-condensed text-xs uppercase tracking-[0.14em] text-[#f3dfc3]">Username</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="field-theme rounded-sm px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="font-condensed text-xs uppercase tracking-[0.14em] text-[#f3dfc3]">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="field-theme rounded-sm px-3 py-2.5 text-sm"
                  />
                </label>

                {error ? (
                  <div className="rounded-sm border border-[#bc4e31]/70 bg-[#2a1a17] px-3 py-2 text-sm text-[#ffd8c6]">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full rounded-sm px-4 py-2.5 font-condensed text-sm uppercase tracking-[0.1em] disabled:opacity-60"
                >
                  {loading ? "Accesso..." : "Accedi"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
