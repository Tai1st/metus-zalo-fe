"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiGet, apiSend } from "@/lib/fetcher";
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
import type { AccountLabel, AccountPublic, ZaloGroup } from "@/lib/types";

type GroupRow = {
  key: string;
  id: string;
  name: string;
  avatar: string;
  owner: string;
  ownerId: string;
  total: number;
};

type LeaveResult = { groupId: string; ok: boolean; message: string };

export default function LeaveGroupsPage() {
  const { data: accounts } = useApi<AccountPublic[]>("/api/zalo/accounts", 8000);
  const { data: labels } = useApi<AccountLabel[]>("/api/zalo/labels", 15000);
  const labelById = new Map((labels ?? []).map((l) => [l.id, l]));

  const acctF = useColumnFilters<"phone" | "name" | "label" | "status">();
  const [pickedAccounts, setPickedAccounts] = useState<Set<string>>(new Set());
  const [acctPage, setAcctPage] = useState(1);
  const [acctPageSize, setAcctPageSize] = useState(10);

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [pickedGroups, setPickedGroups] = useState<Set<string>>(new Set());
  const groupF = useColumnFilters<"name">();

  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<LeaveResult[] | null>(null);
  const resultById = new Map((results ?? []).map((r) => [r.groupId, r]));

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

  async function loadGroups() {
    setError(null);
    if (pickedAccounts.size === 0)
      return setError("Chọn ít nhất một tài khoản để tải nhóm");
    setGroupsLoading(true);
    setPickedGroups(new Set());
    setResults(null);
    try {
      const rows: GroupRow[] = [];
      for (const acc of accounts ?? []) {
        if (!pickedAccounts.has(acc.zaloId)) continue;
        const list = await apiGet<ZaloGroup[]>(
          `/api/zalo/groups?account=${acc.zaloId}`,
        );
        for (const g of list) {
          const id = String(g.groupId ?? "");
          if (!id) continue;
          rows.push({
            key: `${acc.zaloId}:${id}`,
            id,
            name: g.name ?? "Nhóm",
            avatar: String(g.fullAvt ?? g.avt ?? ""),
            owner: acc.fullName || acc.zaloId,
            ownerId: acc.zaloId,
            total: Number(g.totalMember) || 0,
          });
        }
      }
      setGroups(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGroupsLoading(false);
    }
  }

  function toggleGroup(key: string) {
    setPickedGroups((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function run() {
    if (pickedGroups.size === 0) return;
    if (
      !confirm(
        `Rời khỏi ${pickedGroups.size} nhóm đã chọn? Không thể hoàn tác — muốn vào lại phải được mời hoặc có link nhóm.`,
      )
    )
      return;
    setError(null);
    setRunning(true);
    setResults(null);
    try {
      const chosen = groups.filter((g) => pickedGroups.has(g.key));
      const byOwner = new Map<string, GroupRow[]>();
      for (const g of chosen) {
        const list = byOwner.get(g.ownerId) ?? [];
        list.push(g);
        byOwner.set(g.ownerId, list);
      }
      const all: LeaveResult[] = [];
      for (const [ownerId, list] of byOwner) {
        const res = await apiSend<LeaveResult[]>(
          `/api/zalo/groups/leave?account=${ownerId}`,
          "POST",
          { groupIds: list.map((g) => g.id) },
        );
        all.push(...res);
      }
      setResults(all);
      setGroups((cur) => cur.filter((g) => !all.some((r) => r.ok && r.groupId === g.id)));
      setPickedGroups((s) => {
        const next = new Set(s);
        for (const g of chosen) {
          if (all.some((r) => r.ok && r.groupId === g.id)) next.delete(g.key);
        }
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const shownGroups = groups.filter((g) => textMatch(g.name, groupF.filters.name));
  const okCount = (results ?? []).filter((r) => r.ok).length;
  const failCount = (results ?? []).filter((r) => !r.ok).length;

  return (
    <div>
      <PageHeader
        title="Rời nhóm"
        subtitle="Chọn tài khoản, tải danh sách nhóm rồi chọn nhóm cần rời hàng loạt."
        action={
          <Button onClick={run} disabled={running || pickedGroups.size === 0}>
            {running ? "Đang rời…" : "Rời nhóm"}
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {results && (
        <div className="mb-4">
          <Notice tone={failCount === 0 ? "success" : "error"}>
            Đã rời {okCount} nhóm
            {failCount > 0 ? `, ${failCount} nhóm lỗi (xem cột kết quả)` : ""}.
          </Notice>
        </div>
      )}

      <Card className="p-0">
        <div className="flex items-center justify-between gap-2 p-5 pb-0">
          <h2 className="text-sm font-semibold">
            Danh sách tài khoản{" "}
            <span className="font-normal text-muted">
              (đã chọn {pickedAccounts.size})
            </span>
          </h2>
          <Button size="sm" onClick={loadGroups} disabled={groupsLoading}>
            {groupsLoading ? "Đang tải…" : "Tải nhóm"}
          </Button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <Table minWidth={760}>
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
      </Card>

      <Card className="mt-4 p-0">
        <h2 className="p-5 pb-0 text-sm font-semibold">
          Danh sách nhóm của tôi{" "}
          <span className="font-normal text-muted">
            (đã chọn {pickedGroups.size})
          </span>
        </h2>
        <div className="mt-3 overflow-x-auto">
          <Table minWidth={760}>
            <Thead>
              <Th className="w-10">
                <input
                  type="checkbox"
                  checked={
                    shownGroups.length > 0 &&
                    shownGroups.every((g) => pickedGroups.has(g.key))
                  }
                  onChange={(e) =>
                    setPickedGroups((s) => {
                      const next = new Set(s);
                      for (const g of shownGroups) {
                        if (e.target.checked) next.add(g.key);
                        else next.delete(g.key);
                      }
                      return next;
                    })
                  }
                />
              </Th>
              <Th className="w-10">#</Th>
              <Th>Hình ảnh</Th>
              <FilterTh
                value={groupF.filters.name ?? ""}
                onChange={(v) => groupF.setFilter("name", v)}
              >
                Tên nhóm
              </FilterTh>
              <Th>Nhóm của</Th>
              <Th align="right">Số thành viên</Th>
              <Th>Kết quả</Th>
            </Thead>
            <tbody>
              {shownGroups.map((g, i) => {
                const result = resultById.get(g.id);
                return (
                  <Tr key={g.key}>
                    <Td>
                      <input
                        type="checkbox"
                        checked={pickedGroups.has(g.key)}
                        onChange={() => toggleGroup(g.key)}
                      />
                    </Td>
                    <Td className="text-muted">{i + 1}</Td>
                    <Td>
                      {g.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.avatar}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="block h-8 w-8 rounded-full border border-border bg-surface" />
                      )}
                    </Td>
                    <Td className="max-w-[220px] truncate">{g.name}</Td>
                    <Td className="max-w-[160px] truncate">{g.owner}</Td>
                    <Td align="right">{g.total}</Td>
                    <Td>
                      {result ? (
                        <Badge tone={result.ok ? "success" : "danger"}>
                          {result.message}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </Tr>
                );
              })}
              {shownGroups.length === 0 && (
                <TableEmpty colSpan={7}>
                  {groups.length === 0
                    ? "Chọn tài khoản và bấm Tải nhóm"
                    : "Không có nhóm khớp bộ lọc"}
                </TableEmpty>
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
