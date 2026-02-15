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
              className={`rounded-sm border px-4 py-2 text-sm shadow-lg ${
                t.tone === "success"
                  ? "border-[#8cab95] bg-[#f6efe0] text-[#233523]"
                  : t.tone === "error"
                  ? "border-[#bc4e31] bg-[#fff1df] text-[#7a2818]"
                  : "border-[#c6ad8e] bg-[#f6efe0] text-[#1d1712]"
              }`}
            >
              <div className="font-condensed text-[11px] uppercase tracking-[0.1em] opacity-80">{t.tone}</div>
              <div>{t.text}</div>
            </div>
          ))}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
