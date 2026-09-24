"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiGet } from "@/lib/fetcher";
import { Icon } from "@/components/icons";
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
import type { AccountLabel, AccountPublic, ZaloUser } from "@/lib/types";

type FriendRow = {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  owner: string;
};

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function BackupFriendsPage() {
  const { data: accounts } = useApi<AccountPublic[]>("/api/zalo/accounts", 8000);
  const { data: labels } = useApi<AccountLabel[]>("/api/zalo/labels", 15000);
  const labelById = new Map((labels ?? []).map((l) => [l.id, l]));

  const acctF = useColumnFilters<"phone" | "name" | "label" | "status">();
  const [pickedAccounts, setPickedAccounts] = useState<Set<string>>(new Set());
  const [acctPage, setAcctPage] = useState(1);
  const [acctPageSize, setAcctPageSize] = useState(10);

  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [checkedFriends, setCheckedFriends] = useState<Set<string>>(new Set());
  const friendF = useColumnFilters<"name" | "owner">();

  const [error, setError] = useState<string | null>(null);

  const filteredAccounts = (accounts ?? []).filter(
    (a) =>
      textMatch(`${a.phone}`, acctF.filters.phone) &&
      textMatch(a.fullName, acctF.filters.name) &&
      textMatch(
        a.labelIds.map((id) => labelById.get(id)?.name).join(" "),
        acctF.filters.label,
      ) &&
      textMatch(a.connected ? "đang hoạt động" : "đăng nhập thất bại", acctF.filters.status),
  );
  const acctStart =
    (Math.min(acctPage, Math.max(1, Math.ceil(filteredAccounts.length / acctPageSize))) - 1) *
    acctPageSize;
  const pagedAccounts = filteredAccounts.slice(acctStart, acctStart + acctPageSize);

  function toggleAccount(id: string) {
    setPickedAccounts((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function loadFriends() {
    setError(null);
    if (pickedAccounts.size === 0)
      return setError("Chọn ít nhất một tài khoản để tải bạn bè");
    setFriendsLoading(true);
    setCheckedFriends(new Set());
    try {
      const seen = new Set<string>();
      const rows: FriendRow[] = [];
      for (const acc of accounts ?? []) {
        if (!pickedAccounts.has(acc.zaloId)) continue;
        const list = await apiGet<ZaloUser[]>(
          `/api/zalo/friends?account=${acc.zaloId}`,
        );
        for (const u of list) {
          const id = String(u.userId ?? u.uid ?? "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          rows.push({
            id,
            name: u.displayName || u.zaloName || id,
            avatar: u.avatar ?? "",
            phone: u.phoneNumber ?? "",
            owner: acc.fullName || acc.zaloId,
          });
        }
      }
      setFriends(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFriendsLoading(false);
    }
  }

  function toggleFriend(id: string) {
    setCheckedFriends((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const chosen = friends.filter((f) => checkedFriends.has(f.id));
    if (chosen.length === 0) return;
    const rows = [
      ["ID", "Tên", "SĐT", "Bạn của"],
      ...chosen.map((f) => [f.id, f.name, f.phone, f.owner]),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-ban-be-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const shownFriends = friends.filter(
    (f) =>
      textMatch(f.name, friendF.filters.name) &&
      textMatch(f.owner, friendF.filters.owner),
  );

  return (
    <div>
      <PageHeader
        title="Backup bạn bè"
        action={
          <Button disabled={checkedFriends.size === 0} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-0">
          <h2 className="p-5 pb-0 text-sm font-semibold">
            Danh sách tài khoản{" "}
            <span className="font-normal text-muted">
              (đã chọn {pickedAccounts.size})
            </span>
          </h2>
          <div className="mt-3 overflow-x-auto">
            <Table minWidth={640}>
              <Thead>
                <Th className="w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredAccounts.length > 0 &&
                      filteredAccounts.every((a) => pickedAccounts.has(a.zaloId))
                    }
                    onChange={(e) =>
                      setPickedAccounts((s) => {
                        const next = new Set(s);
                        for (const a of filteredAccounts) {
                          if (e.target.checked) next.add(a.zaloId);
                          else next.delete(a.zaloId);
                        }
                        return next;
                      })
                    }
                  />
                </Th>
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
                <FilterTh
                  value={acctF.filters.status ?? ""}
                  onChange={(v) => acctF.setFilter("status", v)}
                >
                  Trạng thái
                </FilterTh>
              </Thead>
              <tbody>
                {pagedAccounts.map((a) => (
                  <Tr key={a.zaloId}>
                    <Td>
                      <input
                        type="checkbox"
                        checked={pickedAccounts.has(a.zaloId)}
                        onChange={() => toggleAccount(a.zaloId)}
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
                    <Td>
                      {a.connected ? (
                        <Badge tone="success">Đang hoạt động</Badge>
                      ) : (
                        <Badge tone="danger">Đăng nhập thất bại</Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
                {pagedAccounts.length === 0 && (
                  <TableEmpty colSpan={5}>
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
              disabled={friendsLoading}
              onClick={loadFriends}
            >
              <Icon name="download" size={14} />{" "}
              {friendsLoading ? "Đang tải…" : "Tải bạn bè"}
            </Button>
          </div>
        </Card>

        <Card className="p-0">
          <h2 className="p-5 pb-0 text-sm font-semibold">
            Danh sách bạn bè{" "}
            <span className="font-normal text-muted">
              (Đã chọn: {checkedFriends.size})
            </span>
          </h2>
          <div className="mt-3 overflow-x-auto">
            <Table minWidth={640}>
              <Thead>
                <Th className="w-10">
                  <input
                    type="checkbox"
                    checked={
                      shownFriends.length > 0 &&
                      shownFriends.every((f) => checkedFriends.has(f.id))
                    }
                    onChange={(e) =>
                      setCheckedFriends((s) => {
                        const next = new Set(s);
                        for (const f of shownFriends) {
                          if (e.target.checked) next.add(f.id);
                          else next.delete(f.id);
                        }
                        return next;
                      })
                    }
                  />
                </Th>
                <Th className="w-10">#</Th>
                <Th>Hình ảnh</Th>
                <FilterTh
                  value={friendF.filters.name ?? ""}
                  onChange={(v) => friendF.setFilter("name", v)}
                >
                  Tên
                </FilterTh>
                <Th>Nhãn</Th>
                <Th>SĐT</Th>
                <FilterTh
                  value={friendF.filters.owner ?? ""}
                  onChange={(v) => friendF.setFilter("owner", v)}
                >
                  Bạn của
                </FilterTh>
              </Thead>
              <tbody>
                {shownFriends.map((f, i) => (
                  <Tr key={f.id}>
                    <Td>
                      <input
                        type="checkbox"
                        checked={checkedFriends.has(f.id)}
                        onChange={() => toggleFriend(f.id)}
                      />
                    </Td>
                    <Td className="text-muted">{i + 1}</Td>
                    <Td>
                      {f.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={f.avatar}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="block h-8 w-8 rounded-full border border-border bg-surface" />
                      )}
                    </Td>
                    <Td className="max-w-[160px] truncate">{f.name}</Td>
                    <Td>
                      <Badge>Chưa có nhãn</Badge>
                    </Td>
                    <Td>{f.phone || "—"}</Td>
                    <Td className="max-w-[140px] truncate">{f.owner}</Td>
                  </Tr>
                ))}
                {shownFriends.length === 0 && (
                  <TableEmpty colSpan={7}>
                    {friends.length === 0
                      ? "Chọn tài khoản và bấm Tải bạn bè"
                      : "Không có bạn bè khớp bộ lọc"}
                  </TableEmpty>
                )}
              </tbody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
