"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { personName, roleLabel } from "@/lib/labels";

type Me = { userId: string; role: string; fullName: string | null; username: string | null } | null;

const NAV_LINKS = [
  { href: "/lessons", label: "Lezioni di strumento" },
  { href: "/availability", label: "Disponibilità docenti" },
];

const UPCOMING = ["Eventi e news", "Iscrizioni", "Contatti"];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (pathname === "/login") return;
    let cancelled = false;

    fetch("/api/auth/me", { method: "GET", credentials: "include" })
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        setMe(
          ok
            ? {
                userId: data.userId ?? "",
                role: data.role ?? "",
                fullName: data.fullName ?? null,
                username: data.username ?? null,
              }
            : null
        );
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  if (pathname === "/login") return null;

  return (
    <header className="relative overflow-hidden border-b border-[#253040] bg-[#101721] text-cream">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(188,78,49,0.45),transparent_45%),radial-gradient(circle_at_82%_78%,rgba(32,46,66,0.7),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(14,18,26,0.7),rgba(14,18,26,0.2)_45%,rgba(188,78,49,0.4))]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pb-3 pt-4 md:pt-5">
        <div className="flex items-center justify-between gap-4">
          <Link href="/lessons" className="group flex items-center gap-3 rounded-sm">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[3px] border-terracotta bg-[#f6e8cf] text-terracotta shadow-[0_10px_24px_-14px_rgba(8,12,16,0.9)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-6 sm:h-12 sm:w-12">
              <span className="font-display text-2xl font-bold leading-none">P</span>
            </span>
            <span className="flex flex-col">
              <span className="font-display text-2xl font-bold uppercase leading-none tracking-[0.01em] text-[#fff6e6] sm:text-3xl">
                Pentagramma
              </span>
              <span className="mt-1 hidden text-xs text-[#e6d6bf] sm:block">Scuola di musica · gestionale</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {me?.userId ? (
              <div className="hidden text-right leading-tight sm:block">
                <div className="text-sm font-semibold text-cream">{personName(me)}</div>
                <div className="font-condensed text-[11px] uppercase tracking-[0.14em] text-sand/80">
                  {roleLabel(me.role)}
                </div>
              </div>
            ) : null}
            {me?.userId ? (
              <button
                onClick={logout}
                disabled={loggingOut}
                className="btn-ghost-dark inline-flex items-center gap-2 rounded-sm px-3 py-2 font-condensed text-sm uppercase tracking-[0.08em]"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M13 13.5 16.5 10 13 6.5M16.5 10H8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {loggingOut ? "Esco…" : "Esci"}
              </button>
            ) : null}
          </div>
        </div>

        <nav aria-label="Sezioni" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
          <ul className="flex min-w-max items-center gap-1 rounded-md bg-[#0f141d]/70 p-1">
            {NAV_LINKS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`font-condensed block rounded-sm px-3 py-1.5 text-sm uppercase tracking-[0.08em] transition-colors duration-150 ${
                      active
                        ? "bg-terracotta text-cream"
                        : "text-[#ead8bf] hover:bg-terracotta/30 hover:text-cream"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li aria-hidden="true" className="mx-1 h-4 w-px bg-[#ead8bf]/20" />
            {UPCOMING.map((label) => (
              <li
                key={label}
                className="font-condensed flex cursor-default items-center gap-1.5 px-3 py-1.5 text-sm uppercase tracking-[0.08em] text-[#ead8bf]/40"
              >
                {label}
                <span className="rounded-full border border-[#ead8bf]/20 px-1.5 py-px text-[10px] tracking-[0.1em] text-[#ead8bf]/60">
                  presto
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
