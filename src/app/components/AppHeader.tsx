"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Me = { userId: string; role: string } | null;

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    let cancelled = false;

    fetch("/api/auth/me", { method: "GET", credentials: "include" })
      .then(async (r) => ({ ok: r.ok, data: (await r.json()) as { userId?: string; role?: string } }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        setMe(ok ? { userId: data.userId ?? "", role: data.role ?? "" } : null);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (pathname === "/login") return null;

  const isLessons = pathname.startsWith("/lessons");
  const isAvailability = pathname.startsWith("/availability");

  return (
    <header className="relative overflow-hidden border-b border-[#253040] bg-[#101721] text-[#fff8e9]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(188,78,49,0.45),transparent_45%),radial-gradient(circle_at_82%_78%,rgba(32,46,66,0.7),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(14,18,26,0.7),rgba(14,18,26,0.2)_45%,rgba(188,78,49,0.4))]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:gap-5 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="rise-in space-y-1">
            <p className="font-condensed text-xs uppercase tracking-[0.25em] text-[#f5d8b8]">Scuola di Musica</p>
            <h1 className="font-display text-4xl font-bold uppercase leading-none text-[#fff6e6] sm:text-5xl">
              Pentagramma
            </h1>
            <p className="max-w-xl text-sm text-[#e6d6bf]">
              Gestione lezioni e pianificazione didattica con identita visuale editoriale.
            </p>
          </div>

          <div className="rise-in flex items-center gap-3 self-start md:self-auto">
            {me?.userId ? (
              <div className="rounded-md border border-[#f3dfc3]/30 bg-[#121923]/70 px-3 py-2 text-xs">
                <div className="font-condensed uppercase tracking-[0.14em] text-[#f3dfc3]">{me.role}</div>
                <div className="text-[#fff8e9]">{me.userId}</div>
              </div>
            ) : null}
            <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-[#bc4e31] bg-[#f6e8cf] text-[#bc4e31] shadow-[0_14px_30px_-18px_rgba(8,12,16,0.9)] sm:h-20 sm:w-20">
              <span className="font-display text-3xl font-bold leading-none sm:text-4xl">P</span>
            </div>
          </div>
        </div>

        <div className="rise-in flex flex-wrap items-center justify-between gap-3">
          <nav className="overflow-x-auto">
            <ul className="flex min-w-max items-center gap-1 rounded-md bg-[#0f141d]/70 p-1">
              <li
                aria-disabled="true"
                className="font-condensed flex cursor-default items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm uppercase tracking-[0.08em] text-[#ead8bf]/35"
              >
                Eventi e News
                <span className="rounded-full bg-[#0f141d] px-1.5 py-0.5 text-[9px] font-normal tracking-[0.1em] text-[#ead8bf]/55">
                  presto
                </span>
              </li>
              <li
                aria-disabled="true"
                className="font-condensed flex cursor-default items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm uppercase tracking-[0.08em] text-[#ead8bf]/35"
              >
                Iscrizioni
                <span className="rounded-full bg-[#0f141d] px-1.5 py-0.5 text-[9px] font-normal tracking-[0.1em] text-[#ead8bf]/55">
                  presto
                </span>
              </li>
              <li>
                <Link
                  href="/lessons"
                  className={`font-condensed block rounded-sm px-3 py-1.5 text-sm uppercase tracking-[0.08em] transition ${
                    isLessons
                      ? "bg-[#bc4e31] text-[#fff8e9]"
                      : "bg-transparent text-[#ead8bf] hover:bg-[#bc4e31]/30 hover:text-[#fff8e9]"
                  }`}
                >
                  Lezioni di Strumento
                </Link>
              </li>
              <li>
                <Link
                  href="/availability"
                  className={`font-condensed block rounded-sm px-3 py-1.5 text-sm uppercase tracking-[0.08em] transition ${
                    isAvailability
                      ? "bg-[#bc4e31] text-[#fff8e9]"
                      : "bg-transparent text-[#ead8bf] hover:bg-[#bc4e31]/30 hover:text-[#fff8e9]"
                  }`}
                >
                  Disponibilita Docenti
                </Link>
              </li>
              <li
                aria-disabled="true"
                className="font-condensed flex cursor-default items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm uppercase tracking-[0.08em] text-[#ead8bf]/35"
              >
                Contatti
                <span className="rounded-full bg-[#0f141d] px-1.5 py-0.5 text-[9px] font-normal tracking-[0.1em] text-[#ead8bf]/55">
                  presto
                </span>
              </li>
            </ul>
          </nav>

          {me?.userId ? (
            <button
              onClick={logout}
              className="btn-primary rounded-sm px-4 py-2 font-condensed text-sm uppercase tracking-[0.08em]"
            >
              Logout
            </button>
          ) : (
            <div className="text-xs uppercase tracking-[0.14em] text-[#e6d6bf]/70">Ospite</div>
          )}
        </div>
      </div>
    </header>
  );
}
