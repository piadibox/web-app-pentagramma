"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me =
  | { userId: string; role: string }
  | { error: string };

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { method: "GET" })
      .then(async (r) => ({ ok: r.ok, data: (await r.json()) as Me }))
      .then(({ ok, data }) => {
        if (!ok) {
          router.replace("/login");
          return;
        }
        setMe(data);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!me) {
    return <p style={{ padding: 20 }}>Caricamento...</p>;
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
        Music School
      </h1>

      {"error" in me ? (
        <p>Redirect...</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <p>
            Sei loggato come <b>{me.userId}</b> (role: <b>{me.role}</b>)
          </p>

          <button
            onClick={logout}
            style={{
              width: 160,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
