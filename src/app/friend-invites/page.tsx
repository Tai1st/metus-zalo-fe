"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiSend } from "@/lib/fetcher";
import { Icon } from "@/components/icons";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  Badge,
  Button,
  Card,
  FilterTh,
  Notice,
  PageHeader,
  Pagination,
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

type FriendRequest = {
  id: number;
  accountId: string;
  fromUid: string;
  fromName: string;
  fromAvatar: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  receivedAt: string;
};

export default function FriendInvitesPage() {
  const { data: accounts } = useApi<AccountPublic[]>("/api/zalo/accounts", 8000);
  const { data: labels } = useApi<AccountLabel[]>("/api/zalo/labels", 15000);
  const labelById = new Map((labels ?? []).map((l) => [l.id, l]));

  const acctF = useColumnFilters<"phone" | "name" | "label">();
  const [account, setAccount] = useState("");
  const [acctPage, setAcctPage] = useState(1);
  const [acctPageSize, setAcctPageSize] = useState(10);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [error, setError] = useState<string | null>(null);

  const {
    data: requests,
    loading,
    reload,
  } = useApi<FriendRequest[]>(
    account ? `/api/zalo/friend-requests?account=${account}` : null,
    10000,
  );

  const filteredAccounts = (accounts ?? []).filter(
    (a) =>
      textMatch(`${a.phone}`, acctF.filters.phone) &&
      textMatch(a.fullName, acctF.filters.name) &&
      textMatch(
        a.labelIds.map((id) => labelById.get(id)?.name).join(" "),
        acctF.filters.label,
      ),
  );
  const acctStart =
    (Math.min(acctPage, Math.max(1, Math.ceil(filteredAccounts.length / acctPageSize))) -
      1) *
    acctPageSize;
  const pagedAccounts = filteredAccounts.slice(acctStart, acctStart + acctPageSize);

  const pending = (requests ?? []).filter((r) => r.status === "pending");

  const [pulling, setPulling] = useState(false);

  async function pull() {
    if (!account) return setError("Chọn một tài khoản");
    setError(null);
    setPulling(true);
    try {
      await apiSend(`/api/zalo/friend-requests/pull?account=${account}`, "POST");
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPulling(false);
    }
  }

  async function respond(r: FriendRequest, action: "accept" | "reject") {
    setError(null);
    setBusyId(r.id);
    try {
      await apiSend(
        `/api/zalo/friend-requests/${r.id}?account=${account}`,
        "PATCH",
        { action },
      );
      setChecked((s) => {
        const next = new Set(s);
        next.delete(r.id);
        return next;
      });
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function toggleChecked(id: number) {
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function respondBulk(action: "accept" | "reject") {
    const ids = [...checked];
    if (ids.length === 0) return;
    const label = action === "accept" ? "đồng ý" : "từ chối";
    const ok = await confirm(
      `${label[0].toUpperCase()}${label.slice(1)} ${ids.length} lời mời đã chọn?`,
      { confirmLabel: label[0].toUpperCase() + label.slice(1) },
    );
    if (!ok) return;
    setError(null);
    setBulkBusy(true);
    const failed: string[] = [];
    try {
      for (const id of ids) {
        try {
          await apiSend(
            `/api/zalo/friend-requests/${id}?account=${account}`,
            "PATCH",
            { action },
          );
        } catch (e) {
          failed.push((e as Error).message);
        }
      }
      if (failed.length > 0) setError(`${failed.length} lời mời xử lý lỗi: ${failed[0]}`);
      setChecked(new Set());
      reload();
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Danh sách lời mời kết bạn"
        subtitle="Lời mời kết bạn gửi tới các tài khoản — chỉ ghi nhận từ lúc tài khoản kết nối trở đi."
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="p-0">
          <h2 className="p-5 pb-0 text-sm font-semibold">Danh sách tài khoản</h2>
          <div className="mt-3 overflow-x-auto">
            <Table minWidth={520}>
              <Thead>
                <Th className="w-10" />
                <FilterTh
                  value={acctF.filters.phone ?? ""}
                  onChange={(v) => acctF.setFilter("phone", v)}
                >
                  Số điện thoại
                </FilterTh>
                <FilterTh
                  value={acctF.filters.name ?? ""}
                  onChange={(v) => acctF.setFilter("name", v)}
                >
                  Tên
                </FilterTh>
                <FilterTh
                  value={acctF.filters.label ?? ""}
                  onChange={(v) => acctF.setFilter("label", v)}
                >
                  Nhãn
                </FilterTh>
              </Thead>
              <tbody>
                {pagedAccounts.map((a) => (
                  <Tr key={a.zaloId}>
                    <Td>
                      <input
                        type="radio"
                        checked={account === a.zaloId}
                        onChange={() => setAccount(a.zaloId)}
                      />
                    </Td>
                    <Td>{a.phone || "—"}</Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        {a.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.avatarUrl}
                            alt=""
                            className="h-6 w-6 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="h-6 w-6 shrink-0 rounded-full bg-background" />
                        )}
                        <span className="truncate">{a.fullName || a.zaloId}</span>
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1">
                        {a.labelIds.length === 0 ? (
                          <Badge>Chưa có nhãn</Badge>
                        ) : (
                          a.labelIds.map((id) => {
                            const l = labelById.get(id);
                            return l ? (
                              <StatusPill key={id} color={l.color}>
                                {l.name}
                              </StatusPill>
                            ) : null;
                          })
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
                {pagedAccounts.length === 0 && (
                  <TableEmpty colSpan={4}>
                    {(accounts ?? []).length === 0
                      ? "Chưa có tài khoản"
                      : "Không có tài khoản khớp bộ lọc"}
                  </TableEmpty>
                )}
              </tbody>
            </Table>
          </div>
          <div className="px-5 pb-5">
            <Pagination
              total={filteredAccounts.length}
              page={acctPage}
              pageSize={acctPageSize}
              onPage={setAcctPage}
              onPageSize={(n) => {
                setAcctPageSize(n);
                setAcctPage(1);
              }}
            />
          </div>
          <div className="px-5 pb-5">
            <Button
              className="w-full justify-center"
              disabled={!account || pulling}
              onClick={pull}
            >
              <Icon name="download" size={14} />{" "}
              {pulling ? "Đang tải…" : "Tải danh sách lời mời kết bạn"}
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          {!account ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted">
              <Icon name="mail" size={40} className="text-border" />
              <p className="text-sm">Chọn một tài khoản để xem lời mời kết bạn</p>
            </div>
          ) : loading && !requests ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted">
              Đang tải…
            </div>
          ) : pending.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted">
              <Icon name="mail" size={40} className="text-border" />
              <p className="text-sm">Chưa có lời mời kết bạn</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={
                      pending.length > 0 &&
                      pending.every((r) => checked.has(r.id))
                    }
                    onChange={(e) =>
                      setChecked(
                        e.target.checked
                          ? new Set(pending.map((r) => r.id))
                          : new Set(),
                      )
                    }
                  />
                  Chọn tất cả{" "}
                  <span className="text-muted">(đã chọn {checked.size})</span>
                </label>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="border-danger! text-danger! hover:bg-danger/5!"
                    disabled={checked.size === 0 || bulkBusy}
                    onClick={() => respondBulk("reject")}
                  >
                    {bulkBusy ? "Đang xử lý…" : `Từ chối đã chọn (${checked.size})`}
                  </Button>
                  <Button
                    size="sm"
                    disabled={checked.size === 0 || bulkBusy}
                    onClick={() => respondBulk("accept")}
                  >
                    {bulkBusy ? "Đang xử lý…" : `Đồng ý đã chọn (${checked.size})`}
                  </Button>
                </div>
              </div>

              <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
              {pending.map((r) => (
                <div
                  key={r.id}
                  onClick={() => toggleChecked(r.id)}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-black/2 hover:bg-surface-hover"
                >
                  <input
                    type="checkbox"
                    className="mt-1.5 shrink-0"
                    checked={checked.has(r.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleChecked(r.id)}
                  />
                  {r.fromAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.fromAvatar}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="h-10 w-10 shrink-0 rounded-full bg-background" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {r.fromName || r.fromUid}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(r.receivedAt).toLocaleString("vi-VN")}
                    </div>
                    {r.message && (
                      <div className="mt-1 truncate text-sm">{r.message}</div>
                    )}
                  </div>
                  <div
                    className="flex shrink-0 gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border-danger! text-danger! hover:bg-danger/5!"
                      disabled={busyId === r.id}
                      onClick={() => respond(r, "reject")}
                    >
                      Từ chối
                    </Button>
                    <Button
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => respond(r, "accept")}
                    >
                      Đồng ý
                    </Button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </Card>
      </div>
      {confirmDialog}
    </div>
  );
}
