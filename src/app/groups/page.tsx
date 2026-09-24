"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { AccountSelect } from "@/components/AccountSelect";
import { Icon } from "@/components/icons";
import {
  Button,
  Card,
  FilterTh,
  Notice,
  PageHeader,
  Pagination,
  Table,
  TableEmpty,
  Td,
  Th,
  Thead,
  textMatch,
  Tr,
  useColumnFilters,
} from "@/components/ui";
import type { ZaloGroup } from "@/lib/types";

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString("vi-VN", { hour12: false });

export default function GroupsPage() {
  const [account, setAccount] = useState("");
  const { data, error, loading, reload, updatedAt } = useApi<ZaloGroup[]>(
    account ? `/api/zalo/groups?account=${account}` : null,
  );

  // Groups are read live from Zalo, so the "last sync" is when they arrived.
  const syncedAt = updatedAt;

  const f = useColumnFilters<"name">();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rows = (data ?? []).filter((g) => textMatch(g.name, f.filters.name));
  const start =
    (Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize))) - 1) *
    pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <div>
      <PageHeader
        title="Danh sách nhóm Zalo"
        action={
          <div className="flex items-center gap-2">
            <AccountSelect value={account} onChange={setAccount} />
            <Button variant="ghost" onClick={reload} disabled={loading}>
              <Icon name="refresh" size={14} />{" "}
              {loading ? "Đang sync…" : "Sync nhóm"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                f.setFilter("name", "");
                setPage(1);
                reload();
              }}
            >
              <Icon name="refresh" size={14} /> Làm mới
            </Button>
          </div>
        }
      />

      {!account ? (
        <Notice tone="error">Chọn một tài khoản.</Notice>
      ) : error && !data ? (
        <Notice tone="error">{error}</Notice>
      ) : (
        <>
          <Card className="p-0">
            <Table minWidth={720}>
              <Thead>
                <Th className="w-12">#</Th>
                <FilterTh
                  value={f.filters.name ?? ""}
                  onChange={(v) => f.setFilter("name", v)}
                >
                  Nhóm
                </FilterTh>
                <Th className="text-right">Thành viên</Th>
                <Th className="text-right">Đồng bộ lần cuối</Th>
              </Thead>
              <tbody>
                {pageRows.map((g, i) => (
                  <Tr key={String(g.groupId)}>
                    <Td className="text-muted">{start + i + 1}</Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        {g.fullAvt || g.avt ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={String(g.fullAvt ?? g.avt)}
                            alt=""
                            className="h-6 w-6 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="h-6 w-6 shrink-0 rounded-full border border-border bg-surface" />
                        )}
                        <span className="truncate">{g.name ?? "—"}</span>
                      </span>
                    </Td>
                    <Td className="text-right">{g.totalMember ?? 0}</Td>
                    <Td className="text-right text-muted">
                      {syncedAt ? fmtTime(syncedAt) : "—"}
                    </Td>
                  </Tr>
                ))}
                {rows.length === 0 && (
                  <TableEmpty colSpan={4}>
                    {loading
                      ? "Đang tải…"
                      : (data ?? []).length === 0
                        ? "Chưa tham gia nhóm nào."
                        : "Không có nhóm khớp bộ lọc."}
                  </TableEmpty>
                )}
              </tbody>
            </Table>
          </Card>
          <Pagination
            total={rows.length}
            totalText={`Tổng ${rows.length} nhóm`}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
