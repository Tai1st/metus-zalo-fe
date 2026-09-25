"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { apiSend } from "@/lib/fetcher";
import { Icon } from "@/components/icons";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  Badge,
  Button,
  Card,
  FilterTh,
  PageHeader,
  Pagination,
  RowAction,
  RowActions,
  Table,
  TableEmpty,
  Td,
  Th,
  Thead,
  textMatch,
  Tr,
  useColumnFilters,
} from "@/components/ui";
import {
  ACTION_LABEL,
  CATEGORY_LABEL,
  categoryOf,
  type CampaignAction,
  type CampaignCategory,
} from "@/lib/campaign";
import { REPEAT_LABEL, type Schedule } from "@/lib/schedule";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN") : "—";

const TABS: CampaignCategory[] = ["message", "friend", "group"];

export default function SchedulePage() {
  const { data, loading, reload } = useApi<Schedule[]>(
    "/api/zalo/schedules",
    15000,
  );
  const [tab, setTab] = useState<CampaignCategory>("message");
  const { confirm, dialog: confirmDialog } = useConfirm();
  const counts = (data ?? []).reduce(
    (acc, s) => {
      const c = categoryOf(s.campaignAction);
      acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    },
    {} as Record<CampaignCategory, number>,
  );

  async function toggle(s: Schedule) {
    try {
      await apiSend(`/api/zalo/schedules/${s.id}`, "PATCH", {
        enabled: !s.enabled,
      });
    } catch (e) {
      alert((e as Error).message);
    }
    reload();
  }
  async function runNow(s: Schedule) {
    const ok = await confirm(`Chạy ngay yêu cầu "${s.campaignName}"?`, {
      confirmLabel: "Chạy ngay",
    });
    if (!ok) return;
    try {
      await apiSend(`/api/zalo/schedules/${s.id}/run`, "POST");
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  }
  async function remove(id: number) {
    const ok = await confirm("Xoá lịch trình này?", {
      tone: "danger",
      confirmLabel: "Xoá",
    });
    if (!ok) return;
    await apiSend(`/api/zalo/schedules/${id}`, "DELETE");
    reload();
  }

  const f = useColumnFilters<"name" | "campaign" | "status">();
  const rows = (data ?? []).filter(
    (s) =>
      categoryOf(s.campaignAction) === tab &&
      textMatch(s.name, f.filters.name) &&
      textMatch(s.campaignName, f.filters.campaign) &&
      textMatch(s.enabled ? "đang bật" : "tắt", f.filters.status),
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageStart =
    (Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize))) - 1) *
    pageSize;
  const pageRows = rows.slice(pageStart, pageStart + pageSize);

  return (
    <div>
      <PageHeader
        title="Lịch trình"
        subtitle="Tự động chạy một yêu cầu theo giờ đã đặt."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reload}>
              <Icon name="refresh" size={14} /> Làm mới
            </Button>
            <Link href={`/schedule/new?category=${tab}`}>
              <Button>
                <Icon name="plus" size={14} /> Tạo mới
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex gap-6 border-b border-border text-sm">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
            className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2 ${
              tab === t
                ? "border-zalo font-medium text-zalo"
                : "border-transparent text-muted"
            }`}
          >
            {CATEGORY_LABEL[t]}
            <span className="text-xs text-muted">({counts[t] ?? 0})</span>
          </button>
        ))}
      </div>

      <Card className="p-0">
        <Table minWidth={1100}>
          <Thead>
            <Th className="w-10">#</Th>
            <FilterTh
              value={f.filters.name ?? ""}
              onChange={(v) => f.setFilter("name", v)}
            >
              Tên
            </FilterTh>
            <FilterTh
              value={f.filters.campaign ?? ""}
              onChange={(v) => f.setFilter("campaign", v)}
            >
              Yêu cầu
            </FilterTh>
            <Th>Loại</Th>
            <Th>Lặp lại</Th>
            <Th>Giờ bắt đầu</Th>
            <Th>Giờ kết thúc</Th>
            <Th>Interval</Th>
            <Th>Từ ngày</Th>
            <Th>Đến ngày</Th>
            <Th>Lần chạy tiếp theo lúc</Th>
            <FilterTh
              value={f.filters.status ?? ""}
              onChange={(v) => f.setFilter("status", v)}
            >
              Trạng thái
            </FilterTh>
            <Th>Hành động</Th>
          </Thead>
          <tbody>
            {pageRows.map((s, i) => (
              <Tr key={s.id}>
                <Td className="text-muted">{pageStart + i + 1}</Td>
                <Td className="font-medium">{s.name}</Td>
                <Td className="text-muted">
                  <div>{s.campaignName}</div>
                  <div className="text-xs">
                    {ACTION_LABEL[s.campaignAction as CampaignAction] ??
                      s.campaignAction}
                  </div>
                </Td>
                <Td className="text-muted">
                  {CATEGORY_LABEL[categoryOf(s.campaignAction)]}
                </Td>
                <Td>{REPEAT_LABEL[s.repeat]}</Td>
                <Td>{s.timeOfDay}</Td>
                <Td>{s.timeOfDayEnd ?? "—"}</Td>
                <Td>
                  {s.repeat === "daily"
                    ? `${s.intervalDays} ngày`
                    : s.repeat === "hourly"
                      ? `${s.intervalHours} giờ`
                      : "—"}
                </Td>
                <Td className="text-muted">{s.fromDate}</Td>
                <Td className="text-muted">{s.toDate ?? "—"}</Td>
                <Td className="text-muted">{fmt(s.nextRun)}</Td>
                <Td>
                  <button onClick={() => toggle(s)}>
                    {s.enabled ? (
                      <Badge tone="success">Đang bật</Badge>
                    ) : (
                      <Badge>Tắt</Badge>
                    )}
                  </button>
                </Td>
                <Td>
                  <RowActions>
                    <RowAction
                      icon="play"
                      label="Chạy ngay"
                      onClick={() => runNow(s)}
                    />
                    <RowAction
                      icon="edit"
                      label="Sửa"
                      tone="primary"
                      href={`/schedule/new?id=${s.id}`}
                    />
                    <RowAction
                      icon="trash"
                      label="Xoá"
                      tone="danger"
                      onClick={() => remove(s.id)}
                    />
                  </RowActions>
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <TableEmpty colSpan={13}>
                {loading
                  ? "Đang tải…"
                  : (data ?? []).length === 0
                    ? "Chưa có lịch trình. Bấm “Tạo mới” để thêm."
                    : "Không có lịch trình khớp bộ lọc."}
              </TableEmpty>
            )}
          </tbody>
        </Table>
        <div className="px-3 pb-3">
          <Pagination
            total={rows.length}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </div>
      </Card>
      {confirmDialog}
    </div>
  );
}
