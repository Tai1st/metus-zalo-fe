"use client";

import { useState } from "react";
import { apiSend } from "@/lib/fetcher";
import { Button, Modal, Notice, Textarea, inputCls } from "@/components/ui";
import { QrLoginPanel } from "@/components/QrLoginPanel";

/**
 * Same UI for both "Thêm tài khoản" (new account) and "Đăng nhập lại" (an
 * existing account whose session died) — the server links/upserts by the
 * zaloId baked into the cookie or the QR-scanned session either way, so the
 * only thing that differs between the two call sites is the modal title.
 */
export function AddAccountModal({
  title = "Link Account",
  submitLabel = "Link",
  onClose,
  onAdded,
}: {
  title?: string;
  submitLabel?: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [mode, setMode] = useState<"manual" | "qr">("manual");

  return (
    <Modal open onClose={onClose} size="lg" title={title}>
      {mode === "manual" ? (
        <ManualForm
          submitLabel={submitLabel}
          onSwitchQr={() => setMode("qr")}
          onClose={onClose}
          onAdded={onAdded}
        />
      ) : (
        <QrForm
          onSwitchManual={() => setMode("manual")}
          onClose={onClose}
          onAdded={onAdded}
        />
      )}
    </Modal>
  );
}

function ManualForm({
  submitLabel,
  onSwitchQr,
  onClose,
  onAdded,
}: {
  submitLabel: string;
  onSwitchQr: () => void;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [imei, setImei] = useState("");
  const [cookies, setCookies] = useState("");
  const [ua, setUa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  async function link() {
    setError(null);
    if (!imei.trim()) return setError("Nhập IMEI");
    if (!cookies.trim()) return setError("Nhập Cookies");
    setLinking(true);
    try {
      await apiSend("/api/zalo/accounts/link", "POST", {
        imei: imei.trim(),
        cookies: cookies.trim(),
        userAgent: ua.trim(),
      });
      onAdded();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2 text-sm text-muted">
        Hoặc nhấn vào đây để lấy QR
        <Button size="sm" onClick={onSwitchQr}>
          Ấn để quét
        </Button>
      </div>

      <label className="text-sm">
        <span className="text-danger">*</span> IMEI
        <input
          className={`${inputCls} mt-1`}
          value={imei}
          onChange={(e) => setImei(e.target.value)}
          placeholder="Nhập IMEI"
        />
      </label>

      <label className="text-sm">
        <span className="text-danger">*</span> Cookies
        <Textarea
          className="mt-1"
          rows={6}
          value={cookies}
          onChange={(e) => setCookies(e.target.value)}
          placeholder="Nhập Cookies (JSON — mảng cookie hoặc jar đã serialize)"
        />
      </label>

      <label className="text-sm">
        User-Agent <span className="text-muted">Tùy chọn</span>
        <Textarea
          className="mt-1"
          rows={2}
          value={ua}
          onChange={(e) => setUa(e.target.value)}
          placeholder="Mozilla/5.0 … (để trống nếu không cần)"
        />
      </label>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={link} loading={linking}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function QrForm({
  onSwitchManual,
  onClose,
  onAdded,
}: {
  onSwitchManual: () => void;
  onClose: () => void;
  onAdded: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onSwitchManual}
        className="self-start text-sm text-zalo hover:underline"
      >
        ← Nhập thủ công
      </button>
      <QrLoginPanel onClose={onClose} onAdded={onAdded} />
    </div>
  );
}
