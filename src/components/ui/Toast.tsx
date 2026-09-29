"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error";
  actions: ToastAction[];
}

interface ToastApi {
  show: (message: string, options?: { tone?: "success" | "error"; actions?: ToastAction[]; duration?: number }) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => {} });

// Thông báo nhỏ góc dưới màn hình, có nút hành động (Hoàn tác, Xem giỏ...)
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const show = useCallback<ToastApi["show"]>(
    (message, { tone = "success", actions = [], duration = 5000 } = {}) => {
      const id = ++seq.current;
      setToasts((prev) => [...prev.slice(-2), { id, message, tone, actions }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed z-[70] inset-x-3 bottom-24 md:bottom-6 md:left-auto md:right-6 md:w-96 space-y-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-box bg-pine-950 text-white shadow-xl text-sm">
            {t.tone === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-grass-300 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
            )}
            <span className="flex-1">{t.message}</span>
            {t.actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  a.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 min-h-9 px-2 font-bold text-honey-200 hover:text-white underline-offset-4 hover:underline"
              >
                {a.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
