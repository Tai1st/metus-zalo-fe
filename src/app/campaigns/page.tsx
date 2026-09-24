"use client";

import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { apiSend } from "@/lib/fetcher";
import { Icon } from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  FilterTh,
  PageHeader,
  RowAction,
  RowActions,
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
import {
  type Campaign,
  type CampaignKind,
  type CampaignStatus,
  ACTION_LABEL,
  actionOf,
  type CampaignAction,
  KIND_LABEL,
  type RunMode,
  RUN_MODE_LABEL,
  STATUS_LABEL,
} from "@/lib/campaign";

const KINDS: CampaignKind[] = [
  "phone",
  "friend",
  "group_member",
  "group_link",
  "sent_request",
  "group",
  "backup_file",
];

const STATUS_TONE: Record<
  CampaignStatus,
  "muted" | "success" | "danger" | "zalo" | "warning"
> = {
  draft: "warning",
  running: "zalo",
  paused: "warning",
  done: "success",
  error: "danger",
};

export default function CampaignsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải…</p>}>
      <CampaignsList />
    </Suspense>
  );
}

function CampaignsList() {
  const router = useRouter();
  const kindParam = useSearchParams().get("kind");
  const kind = KINDS.includes(kindParam as CampaignKind)
    ? (kindParam as CampaignKind)
    : null;

  const actionParam = useSearchParams().get("action");
  const action = (
    [
      "message",
      "add_friend",
      "delete_friend",
      "revoke_friend",
      "join_group",
      "message_group",
      "invite_group_member",
    ].includes(actionParam ?? "")
      ? actionParam
      : null
  ) as CampaignAction | null;

  const { data, loading, reload } = useApi<Campaign[]>(
    "/api/zalo/campaigns",
    5000,
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const f = useColumnFilters<"name" | "status">();
  const rows = (data ?? []).filter(
    (c) =>
      (!kind || c.kind === kind) &&
      (!action || actionOf(c) === action) &&
      textMatch(c.name, f.filters.name) &&
      textMatch(STATUS_LABEL[c.status], f.filters.status),
  );

  const isMessage = (action ?? "message") === "message";
  const pageStart =
    (Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize))) - 1) *
    pageSize;
  const pageRows = rows.slice(pageStart, pageStart + pageSize);

  async function start(id: number, mode: RunMode) {
    await apiSend(`/api/zalo/campaigns/${id}/actions`, "POST", {
      action: "start",
      mode,
    });
    reload();
  }
  async function stop(id: number) {
    await apiSend(`/api/zalo/campaigns/${id}/actions`, "POST", {
      action: "stop",
    });
    reload();
  }
  async function remove(id: number) {
    if (!confirm("Xoá yêu cầu này?")) return;
    await apiSend(`/api/zalo/campaigns/${id}`, "DELETE");
    reload();
  }
  async function duplicate(c: Campaign) {
    await apiSend("/api/zalo/campaigns", "POST", {
      name: `${c.name} (sao chép)`,
      kind: c.kind,
      config: c.config,
      accountIds: c.accountIds,
      targets: c.targets,
    });
    reload();
  }

  return (
    <div>
      <PageHeader
        title={
          kind
            ? action === "invite_group_member"
              ? kind === "group_member"
                ? "Mời thành viên nhóm đã tham gia vào nhóm"
                : kind === "group_link"
                  ? "Mời thành viên nhóm khác vào nhóm"
                  : kind === "friend"
                    ? "Mời bạn bè vào nhóm"
                    : "Mời SDT vào nhóm"
              : action === "revoke_friend" ||
                  action === "delete_friend" ||
                  action === "join_group" ||
                  action === "message_group"
                ? ACTION_LABEL[action]
                : `${ACTION_LABEL[action ?? "message"]} · ${KIND_LABEL[kind]}`
            : "Danh sách yêu cầu"
        }
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reload}>
              <Icon name="refresh" size={14} /> Làm mới
            </Button>
            <Link
              href={`/campaigns/new?kind=${kind ?? "phone"}&action=${action ?? "message"}`}
            >
              <Button>Tạo yêu cầu</Button>
            </Link>
          </div>
        }
      />

      <Card className="p-0">
        <Table minWidth={880}>
          <Thead>
            <Th className="w-10">#</Th>
            <FilterTh
              value={f.filters.name ?? ""}
              onChange={(v) => f.setFilter("name", v)}
            >
              Tên yêu cầu
            </FilterTh>
            {isMessage && <Th>Ảnh / Video</Th>}
            <Th>Số lượng</Th>
            <Th>Thành công</Th>
            <Th>Thất bại</Th>
            <FilterTh
              value={f.filters.status ?? ""}
              onChange={(v) => f.setFilter("status", v)}
            >
              Trạng thái
            </FilterTh>
            <Th>Ngày tạo</Th>
            <Th>Hành động</Th>
          </Thead>
          <tbody>
            {pageRows.map((c, i) => (
              <Tr key={c.id}>
                <Td className="text-muted">{pageStart + i + 1}</Td>
                <Td className="font-medium">{c.name}</Td>
                {isMessage && (
                  <Td className="text-muted">
                    {c.config.attachments?.length ? (
                      <span className="flex items-center gap-1">
                        {/\.(jpg|jpeg|png|gif|webp)$/i.test(
                          c.config.attachments[0],
                        ) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/zalo/${c.config.attachments[0]}`}
                            alt=""
                            className="h-9 w-9 rounded object-cover"
                          />
                        ) : (
                          "🎬"
                        )}
                        {c.config.attachments.length > 1 && (
                          <span className="text-xs">
                            +{c.config.attachments.length - 1}
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Td>
                )}
                <Td>{c.targets.length}</Td>
                <Td className="text-success">{c.sentOk}</Td>
                <Td className="text-danger">{c.sentFail}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[c.status]}>
                    {STATUS_LABEL[c.status]}
                  </Badge>
                </Td>
                <Td className="text-muted">
                  {new Date(c.createdAt).toLocaleString("vi-VN")}
                </Td>
                <Td>
                  <RowActions>
                    {c.status === "running" ? (
                      <RowAction
                        icon="pause"
                        label="Dừng"
                        onClick={() => stop(c.id)}
                      />
                    ) : (
                      <RunMenu onPick={(m) => start(c.id, m)} />
                    )}
                    <RowAction
                      icon="edit"
                      label="Sửa"
                      onClick={() =>
                        router.push(
                          `/campaigns/new?id=${c.id}&kind=${c.kind}&action=${actionOf(c)}`,
                        )
                      }
                    />
                    <RowAction
                      icon="copy"
                      label="Sao chép"
                      onClick={() => duplicate(c)}
                    />
                    <RowAction
                      icon="eye"
                      label="Xem"
                      href={`/campaigns/${c.id}`}
                    />
                    <RowAction
                      icon="trash"
                      label="Xoá"
                      tone="danger"
                      onClick={() => remove(c.id)}
                    />
                  </RowActions>
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <TableEmpty colSpan={isMessage ? 9 : 8}>
                {loading
                  ? "Đang tải…"
                  : (data ?? []).length === 0
                    ? "Chưa có yêu cầu nào."
                    : "Không có yêu cầu khớp bộ lọc."}
              </TableEmpty>
            )}
          </tbody>
        </Table>
      </Card>

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
  );
}

const RUN_MODES: RunMode[] = ["resume_retry_failed", "resume", "restart"];

function RunMenu({ onPick }: { onPick: (mode: RunMode) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
  }, [open]);

  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-zalo hover:underline"
        onClick={() => onPick("resume_retry_failed")}
      >
        <Icon name="play" size={13} />
        Bắt đầu
      </button>
      <button
        ref={anchorRef}
        className="text-zalo hover:bg-background"
        onClick={() => setOpen((v) => !v)}
        aria-label="Chế độ chạy"
      >
        <Icon name="chevronDown" size={13} />
      </button>
      {open &&
        pos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-50 w-56 rounded-lg border border-border bg-surface py-1 text-xs shadow-lg"
              style={{ top: pos.top, left: pos.left }}
            >
              {RUN_MODES.map((m) => (
                <button
                  key={m}
                  className="block w-full px-3 py-1.5 text-left hover:bg-background"
                  onClick={() => {
                    setOpen(false);
                    onPick(m);
                  }}
                >
                  {RUN_MODE_LABEL[m]}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </span>
  );
}
