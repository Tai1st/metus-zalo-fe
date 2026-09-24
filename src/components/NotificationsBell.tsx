"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiSend } from "@/lib/fetcher";
import { Icon } from "@/components/icons";
import type { NotificationItem } from "@/server/zalo/notifications";

type Feed = { items: NotificationItem[]; unreadCount: number };

const TIME_UNITS: [number, string][] = [
  [60, "giây"],
  [60, "phút"],
  [24, "giờ"],
  [7, "ngày"],
];

function timeAgo(ts: number): string {
  let n = Math.max(0, (Date.now() - ts) / 1000);
  let unit = "giây";
  for (const [size, label] of TIME_UNITS) {
    if (n < size) {
      unit = label;
      break;
    }
    n /= size;
    unit = label;
  }
  return `${Math.max(1, Math.floor(n))} ${unit} trước`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { data, reload } = useApi<Feed>("/api/zalo/notifications?limit=20", 20000);
  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead() {
    await apiSend("/api/zalo/notifications/read", "POST");
    reload();
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Thông báo"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-xl text-white/85 transition-colors hover:bg-white/15 hover:text-white"
      >
        <Icon name="bell" size={17} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-zalo">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface text-foreground shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold">Thông báo</span>
            <button
              type="button"
              onClick={markRead}
              disabled={unread === 0}
              className="text-xs font-semibold text-zalo hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
            >
              Đánh dấu đã đọc
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">
                Không có thông báo mới.
              </p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={`/chat?account=${encodeURIComponent(n.zaloId)}&type=${n.threadType === 1 ? "group" : "user"}&thread=${encodeURIComponent(n.threadId)}`}
                  onClick={() => setOpen(false)}
                  className={`flex gap-3 border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-surface-hover ${
                    n.read ? "" : "bg-zalo/5"
                  }`}
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zalo/10 text-zalo">
                    <Icon name="chat" size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">
                      <span className="font-semibold">{n.fromName}</span>{" "}
                      {n.threadType === 1 ? (
                        <>
                          vừa gửi tin nhắn trong nhóm{" "}
                          <span className="font-medium">
                            {n.groupName ?? "một nhóm"}
                          </span>
                        </>
                      ) : (
                        "vừa gửi tin nhắn mới"
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {n.threadType === 1 ? "Tin nhắn nhóm" : "Tin nhắn trực tiếp"}
                      {" · "}
                      {timeAgo(n.ts)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-zalo" />
                  )}
                </Link>
              ))
            )}
          </div>

          <Link
            href="/chat"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-4 py-2.5 text-center text-xs font-semibold text-zalo hover:bg-surface-hover"
          >
            Xem tất cả tin nhắn
          </Link>
        </div>
      )}
    </div>
  );
}
