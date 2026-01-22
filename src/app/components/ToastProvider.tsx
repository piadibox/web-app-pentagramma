"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  text: string;
};

type ToastContextValue = {
  pushToast: (text: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((text: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, tone, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length ? (
        <div className="fixed right-4 top-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border px-4 py-2 text-sm shadow-lg ${
                t.tone === "success"
                  ? "border-[#BFD4FF] bg-white text-[#1B2B4A]"
                  : t.tone === "error"
                  ? "border-[#E44949] bg-white text-[#8A2B2B]"
                  : "border-[#C9DAFF] bg-white text-[#1B2B4A]"
              }`}
            >
              {t.text}
            </div>
          ))}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
