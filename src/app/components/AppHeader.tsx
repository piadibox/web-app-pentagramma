"use client";

import { useEffect, useState } from "react";
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

  return (
    <div className="w-full border-b border-[#C9DAFF] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="text-sm font-semibold text-[#1B2B4A]">Pentagramma</div>
        {me?.userId ? (
          <div className="flex items-center gap-3 text-sm text-[#5B6F99]">
            <span>{me.userId}</span>
            <button
              onClick={logout}
              className="rounded-full border border-[#C9DAFF] px-3 py-1 text-xs font-semibold text-[#3A75E9] hover:bg-[#F0F5FF]"
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
