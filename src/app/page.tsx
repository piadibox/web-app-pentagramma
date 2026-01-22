"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { method: "GET" })
      .then((r) => r.ok)
      .then((ok) => {
        if (!ok) {
          router.replace("/login");
          return;
        }
        router.replace("/lessons");
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        setChecking(false);
      });
  }, [router]);

  if (checking) {
    return <p style={{ padding: 20 }}>Caricamento...</p>;
  }

  return null;
}
