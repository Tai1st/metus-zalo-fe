"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiSend } from "@/lib/fetcher";
import { Icon } from "@/components/icons";
import { useConfirm } from "@/components/ConfirmDialog";
import type { AccountPublic } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  FilterTh,
  Input,
  Modal,
  Notice,
  PageHeader,
  RowAction,
  RowActions,
  Table,
  TableEmpty,
  Td,
  Textarea,
  Th,
  Thead,
  textMatch,
  Tr,
  useColumnFilters,
} from "@/components/ui";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <code className="mx-0.5 inline-block rounded border border-border bg-background px-1 py-px text-[11px] text-foreground">
      {children}
    </code>
  );
}

/**
 * Parse a pasted proxy string into form fields. Accepts:
 *   host:port
 *   host:port:user:pass
 *   user:pass@host:port
 *   http(s)://host:port  ·  socks5://host:port  (+ optional user:pass@)
 */
function parseProxyString(raw: string): {
  protocol: "http" | "socks5";
  host: string;
  port: string;
  username: string;
  password: string;
} | null {
  let s = raw.trim();
  if (!s) return null;

  let protocol: "http" | "socks5" = "http";
  const scheme = s.match(/^(socks5?|https?):\/\//i);
  if (scheme) {
    protocol = /socks/i.test(scheme[1]) ? "socks5" : "http";
    s = s.slice(scheme[0].length);
  }

  let username = "";
  let password = "";
  const at = s.lastIndexOf("@");
  if (at !== -1) {
    const cred = s.slice(0, at);
    s = s.slice(at + 1);
    const ci = cred.indexOf(":");
    if (ci !== -1) {
      username = cred.slice(0, ci);
      password = cred.slice(ci + 1);
    } else {
      username = cred;
    }
  }

  const parts = s.split(":");
  if (parts.length < 2) return null;
  const host = parts[0].trim();
  const port = Number(parts[1]);
  if (!host || !Number.isInteger(port) || port <= 0) return null;

  if (!username && parts.length >= 4) {
    username = parts[2];
    password = parts.slice(3).join(":");
  }

  return { protocol, host, port: String(port), username, password };
}

type Proxy = {
  id: number;
  label: string;
  protocol: "http" | "socks5";
  host: string;
  port: number;
  username: string;
  password: string;
  isActive: boolean;
  createdAt: string;
};

const empty = {
  label: "",
  protocol: "http",
  host: "",
  port: "",
  username: "",
  password: "",
  isActive: true,
};

export default function ProxiesPage() {
  const { data, loading, reload } = useApi<Proxy[]>("/api/zalo/proxies", 10000);
  const { data: accounts } = useApi<AccountPublic[]>("/api/zalo/accounts", 10000);
  const accountsByProxy = new Map<number, AccountPublic[]>();
  for (const a of accounts ?? []) {
    if (a.proxyId === null) continue;
    const list = accountsByProxy.get(a.proxyId) ?? [];
    list.push(a);
    accountsByProxy.set(a.proxyId, list);
  }
  const [editing, setEditing] = useState<Proxy | "new" | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function remove(id: number) {
    const ok = await confirm("Xoá proxy này?", { tone: "danger", confirmLabel: "Xoá" });
    if (!ok) return;
    await apiSend(`/api/zalo/proxies/${id}`, "DELETE");
    reload();
  }

  const f = useColumnFilters<"host" | "username" | "status">();
  const rows = (data ?? []).filter(
    (p) =>
      textMatch(`${p.protocol} ${p.host}`, f.filters.host) &&
      textMatch(p.username, f.filters.username) &&
      textMatch(
        p.isActive ? "hoạt động" : "không hoạt động",
        f.filters.status,
      ),
  );

  return (
    <div>
      <PageHeader
        title="Quản lý proxy"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reload}>
              <Icon name="refresh" size={14} /> Làm mới
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Icon name="plus" size={14} /> Thêm proxy
            </Button>
          </div>
        }
      />

      <Card className="p-0">
        <Table minWidth={720}>
          <Thead>
            <Th className="w-12">#</Th>
            <FilterTh
              value={f.filters.host ?? ""}
              onChange={(v) => f.setFilter("host", v)}
            >
              Host
            </FilterTh>
            <Th>Port</Th>
            <FilterTh
              value={f.filters.username ?? ""}
              onChange={(v) => f.setFilter("username", v)}
            >
              Username
            </FilterTh>
            <FilterTh
              value={f.filters.status ?? ""}
              onChange={(v) => f.setFilter("status", v)}
            >
              Trạng thái
            </FilterTh>
            <Th>Tài khoản Zalo</Th>
            <Th>Ngày tạo</Th>
            <Th>Thao tác</Th>
          </Thead>
          <tbody>
            {rows.map((p, i) => (
              <Tr key={p.id}>
                <Td className="text-muted">{i + 1}</Td>
                <Td>
                  <span className="uppercase text-muted">{p.protocol}</span>{" "}
                  {p.host}
                </Td>
                <Td>{p.port}</Td>
                <Td>{p.username || "—"}</Td>
                <Td>
                  {p.isActive ? (
                    <Badge tone="success">Hoạt động</Badge>
                  ) : (
                    <Badge tone="danger">Không hoạt động</Badge>
                  )}
                </Td>
                <Td>
                  {(() => {
                    const list = accountsByProxy.get(p.id) ?? [];
                    if (list.length === 0) {
                      return <span className="text-muted">—</span>;
                    }
                    return (
                      <div className="flex flex-col gap-1">
                        {list.map((a) => (
                          <span key={a.zaloId} className="flex items-center gap-1.5">
                            {a.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={a.avatarUrl}
                                alt=""
                                className="h-5 w-5 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <span className="h-5 w-5 shrink-0 rounded-full bg-background" />
                            )}
                            <span className="truncate">
                              {a.fullName || a.phone || a.zaloId}
                            </span>
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </Td>
                <Td className="text-muted">
                  {new Date(p.createdAt).toLocaleString("vi-VN")}
                </Td>
                <Td>
                  <RowActions>
                    <RowAction
                      icon="edit"
                      label="Sửa"
                      tone="primary"
                      onClick={() => setEditing(p)}
                    />
                    <RowAction
                      icon="trash"
                      label="Xoá"
                      tone="danger"
                      onClick={() => remove(p.id)}
                    />
                  </RowActions>
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <TableEmpty colSpan={8}>
                {loading
                  ? "Đang tải…"
                  : (data ?? []).length === 0
                    ? "Chưa có proxy nào."
                    : "Không có proxy khớp bộ lọc."}
              </TableEmpty>
            )}
          </tbody>
        </Table>
      </Card>

      <p className="mt-3 text-right text-xs text-muted">
        Tổng cộng {rows.length} bản ghi
      </p>

      <ProxyModal
        open={editing !== null}
        proxy={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
      {confirmDialog}
    </div>
  );
}

function ProxyModal({
  open,
  proxy,
  onClose,
  onSaved,
}: {
  open: boolean;
  proxy: Proxy | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<typeof empty>({ ...empty });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seededFor, setSeededFor] = useState<number | "new" | null>(null);

  const target = proxy ? proxy.id : open ? "new" : null;
  if (open && target !== seededFor) {
    setForm(
      proxy
        ? {
            label: proxy.label,
            protocol: proxy.protocol,
            host: proxy.host,
            port: String(proxy.port),
            username: proxy.username,
            password: proxy.password,
            isActive: proxy.isActive,
          }
        : { ...empty },
    );
    setError(null);
    setSeededFor(target);
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const payload = { ...form, port: Number(form.port) };
      if (proxy) {
        await apiSend(`/api/zalo/proxies/${proxy.id}`, "PUT", payload);
      } else {
        await apiSend("/api/zalo/proxies", "POST", payload);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const [paste, setPaste] = useState("");
  const [pasteErr, setPasteErr] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  function applyPaste() {
    const parsed = parseProxyString(paste);
    if (!parsed) {
      setPasteErr("Không nhận dạng được chuỗi proxy.");
      return;
    }
    setPasteErr(null);
    setForm((f) => ({ ...f, ...parsed }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={proxy ? "Sửa proxy" : "Thêm tài khoản proxy"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={save} loading={saving}>
            {proxy ? "Lưu" : "Thêm"}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* left: fields */}
        <div>
          <div className="mb-3 text-xs font-medium text-muted">
            Nhập từng trường
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-danger">*</span> Host
              <Input
                className="mt-1"
                value={form.host}
                placeholder="vd: 1.2.3.4"
                onChange={(e) => setForm({ ...form, host: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-danger">*</span> Port
              <Input
                type="number"
                className="mt-1"
                value={form.port}
                placeholder="vd: 8080"
                onChange={(e) => setForm({ ...form, port: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Username
              <Input
                className="mt-1"
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value })
                }
              />
            </label>
            <label className="text-sm">
              Password
              <span className="relative mt-1 block">
                <Input
                  type={showPw ? "text" : "password"}
                  className="pr-8"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label="Hiện / ẩn mật khẩu"
                >
                  <Icon name="eye" size={15} />
                </button>
              </span>
            </label>
          </div>
        </div>

        {/* right: paste full link */}
        <div>
          <div className="mb-3 text-xs font-medium text-muted">
            Hoặc dán full proxy link
          </div>
          <p className="mb-2 text-xs leading-relaxed text-muted">
            URL (http/https), <Chip>host:port</Chip>,{" "}
            <Chip>user:pass@host:port</Chip>, hoặc{" "}
            <Chip>host:port:username:password</Chip> (vd.{" "}
            <Chip>proxy.com:8000:u:p</Chip> hoặc IPv4{" "}
            <Chip>192.168.1.1:8080:u:p</Chip>). SOCKS:{" "}
            <Chip>socks5://1.2.3.4:1000</Chip>.
          </p>
          <Textarea
            rows={5}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="http://user:password@proxy.example.com:8080"
          />
          {pasteErr && <p className="mt-1 text-xs text-danger">{pasteErr}</p>}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={applyPaste}
          >
            Áp dụng vào form
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </Modal>
  );
}
