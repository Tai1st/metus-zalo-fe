"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT, type ToastTone } from "@/lib/toast";

type Item = { id: number; message: string; tone: ToastTone };

const TONE: Record<ToastTone, string> = {
  info: "border-zalo/30 bg-surface text-foreground",
  success: "border-success/40 bg-surface text-success",
  error: "border-danger/40 bg-surface text-danger",
};

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let seq = 0;
    const onToast = (e: Event) => {
      const { message, tone } = (e as CustomEvent<{ message: string; tone: ToastTone }>).detail;
      const id = ++seq;
      setItems((list) => [...list, { id, message, tone }]);
      setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 4500);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-3 top-20 z-[70] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2 sm:right-5">
      {items.map((i) => (
        <div
          key={i.id}
          role="status"
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${TONE[i.tone]}`}
        >
          {i.message}
        </div>
      ))}
    </div>
  );
}
