"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { apiSend } from "@/lib/fetcher";
import { AddAccountModal } from "@/components/AddAccountModal";
import { ReloginModal } from "@/components/ReloginModal";
import { useConfirm } from "@/components/ConfirmDialog";
import { Icon } from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  FilterTh,
  Modal,
  PageHeader,
  RowAction,
  RowActions,
  StatusPill,
  Table,
  TableEmpty,
  Td,
  Th,
  Thead,
  textMatch,
  Tr,
  useColumnFilters,
} from "@/components/ui";
import type { AccountLabel, AccountPublic } from "@/lib/types";

type Proxy = {
  id: number;
  label: string;
  protocol: string;
  host: string;
  port: number;
};

export default function AccountsPage() {
  const { data, loading, reload } = useApi<AccountPublic[]>(
    "/api/zalo/accounts",
    8000,
  );
  const { data: labels } = useApi<AccountLabel[]>("/api/zalo/labels", 15000);
  const { data: proxies } = useApi<Proxy[]>("/api/zalo/proxies", 30000);
  const [showAdd, setShowAdd] = useState(false);
  const [assigning, setAssigning] = useState<AccountPublic | null>(null);
  const [proxyFor, setProxyFor] = useState<AccountPublic | null>(null);
  const [reloginFor, setReloginFor] = useState<AccountPublic | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const labelById = new Map((labels ?? []).map((l) => [l.id, l]));
  const proxyById = new Map((proxies ?? []).map((p) => [p.id, p]));

  async function unlink(zaloId: string) {
    const ok = await confirm("Gỡ liên kết tài khoản này khỏi Metus Zalo?", {
      tone: "danger",
      confirmLabel: "Gỡ liên kết",
    });
    if (!ok) return;
    await apiSend(`/api/zalo/accounts/${zaloId}`, "DELETE");
    reload();
  }
  /**
   * Try reusing the stored session first — covers the common case (dropped
   * connection, server restart). Only if that fails do we fall back to a QR
   * modal, since the stored cookies are then actually dead and can't be
   * revived without re-scanning.
   */
  async function relogin(acc: AccountPublic) {
    setBusy(acc.zaloId);
    try {
      const res = await apiSend<{ connected: boolean }>(
        `/api/zalo/accounts/${acc.zaloId}/reconnect`,
        "POST",
      );
      reload();
      if (!res.connected) setReloginFor(acc);
    } catch {
      setReloginFor(acc);
    } finally {
      setBusy(null);
    }
  }

  const f = useColumnFilters<"account" | "phone" | "label" | "status">();
  const rows = (data ?? []).filter(
    (a) =>
      textMatch(`${a.fullName} ${a.zaloId}`, f.filters.account) &&
      textMatch(a.phone, f.filters.phone) &&
      textMatch(
        a.labelIds.map((id) => labelById.get(id)?.name).join(" "),
        f.filters.label,
      ) &&
      textMatch(
        a.connected ? "đang hoạt động" : "đăng nhập thất bại",
        f.filters.status,
      ),
  );

  return (
    <div>
      <PageHeader
        title="Tài khoản Zalo"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reload}>
              <Icon name="refresh" size={14} /> Làm mới
            </Button>
            <Link href="/proxies">
              <Button variant="ghost">
                <Icon name="plus" size={14} /> Thêm proxy
              </Button>
            </Link>
            <Button onClick={() => setShowAdd(true)}>Thêm tài khoản</Button>
          </div>
        }
      />

      <Card className="p-0">
        <Table minWidth={900}>
          <Thead>
            <Th className="w-12">#</Th>
            <FilterTh
              value={f.filters.account ?? ""}
              onChange={(v) => f.setFilter("account", v)}
            >
              Tài khoản
            </FilterTh>
            <FilterTh
              value={f.filters.phone ?? ""}
              onChange={(v) => f.setFilter("phone", v)}
            >
              Số điện thoại
            </FilterTh>
            <FilterTh
              value={f.filters.label ?? ""}
              onChange={(v) => f.setFilter("label", v)}
            >
              Quản lý nhãn
            </FilterTh>
            <FilterTh
              value={f.filters.status ?? ""}
              onChange={(v) => f.setFilter("status", v)}
            >
              Trạng thái
            </FilterTh>
            <Th>Thao tác</Th>
          </Thead>
          <tbody>
            {rows.map((a, i) => (
              <Tr key={a.zaloId}>
                <Td className="text-muted">{i + 1}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    {a.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="h-8 w-8 rounded-full bg-background" />
                    )}
                    <div className="leading-tight">
                      <div className="font-medium">
                        {a.fullName || a.zaloId}
                      </div>
                      {a.isBusiness && (
                        <span className="text-[11px] text-zalo">Business</span>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>{a.phone || "—"}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1">
                    {a.labelIds.map((id) => {
                      const l = labelById.get(id);
                      return l ? (
                        <StatusPill key={id} color={l.color}>
                          {l.name}
                        </StatusPill>
                      ) : null;
                    })}
                    <RowAction
                      icon="tag"
                      label="Gắn nhãn"
                      tone="primary"
                      onClick={() => setAssigning(a)}
                    />
                  </div>
                </Td>
                <Td>
                  {a.connected ? (
                    <Badge tone="success">Đang hoạt động</Badge>
                  ) : (
                    <Badge tone="danger">Đăng nhập thất bại</Badge>
                  )}
                </Td>
                <Td>
                  <RowActions>
                    <RowAction
                      icon="refresh"
                      label={busy === a.zaloId ? "Đang thử…" : "Đăng nhập lại"}
                      tone="primary"
                      disabled={busy === a.zaloId}
                      onClick={() => relogin(a)}
                    />
                    <RowAction
                      icon="swap"
                      label={
                        a.proxyId && proxyById.get(a.proxyId)
                          ? `Đổi proxy (${proxyById.get(a.proxyId)!.host})`
                          : "Đổi proxy"
                      }
                      onClick={() => setProxyFor(a)}
                    />
                    <RowAction
                      icon="trash"
                      label="Unlink Account"
                      tone="danger"
                      onClick={() => unlink(a.zaloId)}
                    />
                  </RowActions>
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <TableEmpty colSpan={6}>
                {loading
                  ? "Đang tải…"
                  : (data ?? []).length === 0
                    ? "Chưa có tài khoản. Bấm “Thêm tài khoản”."
                    : "Không có tài khoản khớp bộ lọc."}
              </TableEmpty>
            )}
          </tbody>
        </Table>
      </Card>

      <p className="mt-3 text-xs text-muted">Tổng cộng {rows.length} bản ghi</p>

      {showAdd && (
        <AddAccountModal
          onClose={() => {
            setShowAdd(false);
            reload();
          }}
          onAdded={reload}
        />
      )}

      {reloginFor && (
        <ReloginModal
          account={reloginFor}
          onClose={() => setReloginFor(null)}
          onAdded={() => {
            setReloginFor(null);
            reload();
          }}
        />
      )}

      <AssignLabelsModal
        account={assigning}
        labels={labels ?? []}
        onClose={() => setAssigning(null)}
        onSaved={() => {
          setAssigning(null);
          reload();
        }}
      />

      <ProxyPickerModal
        account={proxyFor}
        proxies={proxies ?? []}
        onClose={() => setProxyFor(null)}
        onSaved={() => {
          setProxyFor(null);
          reload();
        }}
      />
      {confirmDialog}
    </div>
  );
}

function AssignLabelsModal({
  account,
  labels,
  onClose,
  onSaved,
}: {
  account: AccountPublic | null;
  labels: AccountLabel[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  if (account && account.zaloId !== seededFor) {
    setPicked(new Set(account.labelIds));
    setSeededFor(account.zaloId);
  }

  async function save() {
    if (!account) return;
    setSaving(true);
    try {
      await apiSend(`/api/zalo/accounts/${account.zaloId}/labels`, "PUT", {
        labelIds: [...picked],
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={account !== null}
      onClose={onClose}
      title="Gắn nhãn"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={save} loading={saving}>
            Lưu
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted">
        {account?.fullName || account?.zaloId}
      </p>
      {labels.length === 0 ? (
        <p className="text-sm text-muted">
          Chưa có nhãn nào. Tạo tại “Quản lý nhãn”.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {labels.map((l) => (
            <label key={l.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={picked.has(l.id)}
                onChange={() =>
                  setPicked((s) => {
                    const n = new Set(s);
                    if (n.has(l.id)) n.delete(l.id);
                    else n.add(l.id);
                    return n;
                  })
                }
              />
              <StatusPill color={l.color}>{l.name}</StatusPill>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ProxyPickerModal({
  account,
  proxies,
  onClose,
  onSaved,
}: {
  account: AccountPublic | null;
  proxies: Proxy[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState<number | "none" | null>(null);

  async function pick(proxyId: number | null) {
    if (!account) return;
    setSaving(proxyId ?? "none");
    try {
      await apiSend(`/api/zalo/accounts/${account.zaloId}/proxy`, "PUT", {
        proxyId,
      });
      onSaved();
    } finally {
      setSaving(null);
    }
  }

  return (
    <Modal open={account !== null} onClose={onClose} title="Đổi proxy">
      <p className="mb-3 text-sm text-muted">
        Chọn proxy cho {account?.fullName || account?.zaloId}. Tài khoản sẽ kết
        nối lại ngay sau khi đổi.
      </p>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => pick(null)}
          disabled={saving !== null}
          className={`rounded-lg border px-3 py-2 text-left text-sm hover:bg-background ${
            !account?.proxyId ? "border-zalo bg-zalo/5" : "border-border"
          }`}
        >
          Không dùng proxy {saving === "none" && "…"}
        </button>
        {proxies.map((p) => (
          <button
            key={p.id}
            onClick={() => pick(p.id)}
            disabled={saving !== null}
            className={`rounded-lg border px-3 py-2 text-left text-sm hover:bg-background ${
              account?.proxyId === p.id
                ? "border-zalo bg-zalo/5"
                : "border-border"
            }`}
          >
            <span className="uppercase text-muted">{p.protocol}</span> {p.host}:
            {p.port}
            {p.label ? ` · ${p.label}` : ""}
            {saving === p.id && " …"}
          </button>
        ))}
        {proxies.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">
            Chưa có proxy.{" "}
            <Link href="/proxies" className="text-zalo underline">
              Thêm proxy
            </Link>
          </p>
        )}
      </div>
    </Modal>
  );
}
