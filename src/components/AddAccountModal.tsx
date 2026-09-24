"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiSend } from "@/lib/fetcher";
import {
  Button,
  Modal,
  Notice,
  Table,
  TableEmpty,
  Td,
  Th,
  Thead,
  Textarea,
  Tr,
  inputCls,
} from "@/components/ui";
import { QrLoginPanel } from "@/components/QrLoginPanel";
import type { AccountPublic } from "@/lib/types";

type Proxy = {
  id: number;
  host: string;
  port: number;
  username: string;
};

/**
 * Same UI for both "Thêm tài khoản" (new account) and "Đăng nhập lại" (an
 * existing account whose session died) — the server links/upserts by the
 * zaloId baked into the cookie or the QR-scanned session either way, so the
 * only thing that differs between the two call sites is the modal title.
 *
 * Bắt buộc chọn 1 proxy trước khi được vào bước nhập cookie/quét QR — tài
 * khoản Zalo luôn phải đi qua proxy ngay từ lần đăng nhập đầu tiên.
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
  const [proxyId, setProxyId] = useState<number | null>(null);

  if (proxyId === null) {
    return (
      <Modal open onClose={onClose} size="lg" title="Chọn proxy để link tài khoản Zalo">
        <ProxyPicker onClose={onClose} onPick={setProxyId} />
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} size="lg" title={title}>
      {mode === "manual" ? (
        <ManualForm
          proxyId={proxyId}
          submitLabel={submitLabel}
          onSwitchQr={() => setMode("qr")}
          onClose={onClose}
          onAdded={onAdded}
        />
      ) : (
        <QrForm
          proxyId={proxyId}
          onSwitchManual={() => setMode("manual")}
          onClose={onClose}
          onAdded={onAdded}
        />
      )}
    </Modal>
  );
}

function ProxyPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (proxyId: number) => void;
}) {
  const { data: proxies, loading } = useApi<Proxy[]>("/api/zalo/proxies");
  const { data: accounts } = useApi<AccountPublic[]>("/api/zalo/accounts");
  const accountByProxy = new Map(
    (accounts ?? [])
      .filter((a) => a.proxyId !== null)
      .map((a) => [a.proxyId as number, a]),
  );

  return (
    <div className="flex flex-col gap-4">
      <Table minWidth={560}>
        <Thead>
          <Th>Host</Th>
          <Th>Port</Th>
          <Th>Username</Th>
          <Th>Nick Zalo</Th>
          <Th>Thao tác</Th>
        </Thead>
        <tbody>
          {(proxies ?? []).map((p) => {
            const acc = accountByProxy.get(p.id);
            return (
              <Tr key={p.id}>
                <Td>{p.host}</Td>
                <Td>{p.port}</Td>
                <Td>{p.username || "—"}</Td>
                <Td>
                  {acc ? (
                    <span className="flex items-center gap-2">
                      {acc.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={acc.avatarUrl}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <span className="h-6 w-6 rounded-full bg-background" />
                      )}
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => onPick(p.id)}
                    className="text-sm font-medium text-zalo hover:underline"
                  >
                    Chọn
                  </button>
                </Td>
              </Tr>
            );
          })}
          {(proxies ?? []).length === 0 && (
            <TableEmpty colSpan={5}>
              {loading
                ? "Đang tải…"
                : "Chưa có proxy nào — vào Quản lý proxy để thêm trước."}
            </TableEmpty>
          )}
        </tbody>
      </Table>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Hủy
        </Button>
      </div>
    </div>
  );
}

function ManualForm({
  proxyId,
  submitLabel,
  onSwitchQr,
  onClose,
  onAdded,
}: {
  proxyId: number;
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
      const { zaloId } = await apiSend<{ zaloId: string }>(
        "/api/zalo/accounts/link",
        "POST",
        {
          imei: imei.trim(),
          cookies: cookies.trim(),
          userAgent: ua.trim(),
        },
      );
      await apiSend(`/api/zalo/accounts/${zaloId}/proxy`, "PUT", { proxyId });
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
  proxyId,
  onSwitchManual,
  onClose,
  onAdded,
}: {
  proxyId: number;
  onSwitchManual: () => void;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleConnected(zaloId?: string) {
    if (zaloId) {
      try {
        await apiSend(`/api/zalo/accounts/${zaloId}/proxy`, "PUT", {
          proxyId,
        });
      } catch (e) {
        setError((e as Error).message);
      }
    }
    onAdded();
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onSwitchManual}
        className="self-start text-sm text-zalo hover:underline"
      >
        ← Nhập thủ công
      </button>
      {error && <Notice tone="error">{error}</Notice>}
      <QrLoginPanel onClose={onClose} onAdded={handleConnected} />
    </div>
  );
}
