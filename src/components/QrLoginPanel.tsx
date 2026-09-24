"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiSend } from "@/lib/fetcher";
import { Button } from "@/components/ui";
import type { QrSession } from "@/lib/types";

const STAGE_TEXT: Record<string, string> = {
  starting: "Đang tạo mã QR…",
  qr_ready: "Mở Zalo trên điện thoại → Quét mã QR.",
  scanned: "Đã quét. Xác nhận đăng nhập trên điện thoại.",
  declined: "Bạn đã từ chối trên điện thoại.",
  expired: "Mã QR đã hết hạn.",
  connected: "Kết nối thành công!",
  error: "Đăng nhập thất bại.",
};

/**
 * The QR box + polling + status text, shared by "Link Account" (new account)
 * and "Đăng nhập lại" (re-auth an existing one — Zalo scopes the QR session
 * to whichever account scans it, and the server upserts by zaloId, so
 * scanning with the same phone naturally refreshes the same row).
 */
export function QrLoginPanel({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [session, setSession] = useState<QrSession | null>(null);
  const tempIdRef = useRef<string | null>(null);

  async function begin() {
    const { tempId } = await apiSend<{ tempId: string }>(
      "/api/zalo/login",
      "POST",
    );
    tempIdRef.current = tempId;
    setSession({ tempId, stage: "starting", createdAt: Date.now() });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { tempId } = await apiSend<{ tempId: string }>(
        "/api/zalo/login",
        "POST",
      );
      if (cancelled) return;
      tempIdRef.current = tempId;
      setSession({ tempId, stage: "starting", createdAt: Date.now() });
    })();
    return () => {
      cancelled = true;
      if (tempIdRef.current) {
        void apiSend(
          `/api/zalo/login?tempId=${tempIdRef.current}`,
          "DELETE",
        ).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!session || ["connected", "error"].includes(session.stage)) return;
    const id = setInterval(async () => {
      if (!tempIdRef.current) return;
      try {
        const s = await apiGet<QrSession>(
          `/api/zalo/login?tempId=${tempIdRef.current}`,
        );
        setSession(s);
        if (s.stage === "connected") {
          tempIdRef.current = null;
          onAdded();
        }
      } catch {
        /* session expired */
      }
    }, 1500);
    return () => clearInterval(id);
  }, [session, onAdded]);

  const stage = session?.stage ?? "starting";

  return (
    <div className="flex flex-col items-center gap-4">
      {session?.qrImage && stage !== "connected" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.qrImage}
          alt="Mã QR"
          className="h-56 w-56 rounded-lg border border-border"
        />
      ) : (
        <div className="grid h-56 w-56 place-items-center rounded-lg border border-dashed border-border text-sm text-muted">
          {stage === "connected" ? "✓" : "…"}
        </div>
      )}

      <p
        className={`text-center text-sm ${
          stage === "error"
            ? "text-danger"
            : stage === "connected"
              ? "text-success"
              : "text-muted"
        }`}
      >
        {STAGE_TEXT[stage]}
        {session?.error ? ` — ${session.error}` : ""}
      </p>

      {session?.scannedUser && stage === "scanned" && (
        <div className="flex items-center gap-2 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={session.scannedUser.avatar}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
          {session.scannedUser.display_name}
        </div>
      )}

      <div className="flex gap-2">
        {(stage === "expired" || stage === "error") && (
          <Button onClick={begin}>Tạo lại mã</Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          {stage === "connected" ? "Xong" : "Đóng"}
        </Button>
      </div>
    </div>
  );
}
