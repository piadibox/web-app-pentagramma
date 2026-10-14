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

const TONE_STYLES: Record<ToastTone, { box: string; dot: string; label: string }> = {
  success: { box: "border-[#8cab95] text-[#233523]", dot: "bg-sage", label: "Fatto" },
  error: { box: "border-terracotta text-[#7a2818]", dot: "bg-terracotta", label: "Errore" },
  info: { box: "border-line text-ink", dot: "bg-slate", label: "Avviso" },
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (text: string, tone: ToastTone = "info") => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, tone, text }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:right-4"
      >
        {toasts.map((t) => {
          const tone = TONE_STYLES[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={`toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-sm border bg-[#f6efe0] py-2.5 pl-3 pr-2 text-sm shadow-[0_18px_36px_-22px_rgba(24,16,10,0.6)] ${tone.box}`}
            >
              <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
              <div className="min-w-0 flex-1">
                <div className="font-condensed text-[11px] uppercase tracking-[0.1em] opacity-80">{tone.label}</div>
                <div>{t.text}</div>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Chiudi notifica"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-sm opacity-60 transition-opacity hover:opacity-100"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
