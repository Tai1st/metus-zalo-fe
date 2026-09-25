"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Icon } from "@/components/icons";
import {
  Badge,
  Button,
  Modal,
  Pagination,
  Table,
  TableEmpty,
  Td,
  Th,
  Thead,
  Tr,
} from "@/components/ui";
import type { Campaign, CampaignLog } from "@/lib/campaign";
import type { AccountPublic } from "@/lib/types";

type Resp = { campaign: Campaign; logs: CampaignLog[]; running: boolean };

/** Bỏ tiền tố "<id nhóm>::" mà một số loại mục tiêu ghép vào target để lưu
 * kèm ngữ cảnh — người dùng chỉ cần thấy số điện thoại/uid thật sự. */
function targetLabel(target: string): string {
  const i = target.indexOf("::");
  return i === -1 ? target : target.slice(i + 2);
}

function toCsv(rows: CampaignLog[], accounts: Map<string, string>): string {
  const header = ["Mục tiêu", "Tài khoản", "Trạng thái", "Lý do thất bại", "Thời gian"];
  const lines = [header.join(",")];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  for (const l of rows) {
    lines.push(
      [
        esc(targetLabel(l.target)),
        esc(accounts.get(l.accountId) ?? l.accountId ?? ""),
        esc(l.ok ? "Thành công" : "Thất bại"),
        esc(l.ok ? "" : l.message),
        esc(new Date(l.ts).toLocaleString("vi-VN")),
      ].join(","),
    );
  }
  return lines.join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Nhật ký gửi của một yêu cầu — tối đa 1000 dòng gần nhất, phân trang tại chỗ. */
export function CampaignLogsModal({
  campaignId,
  campaignName,
  onClose,
}: {
  campaignId: number;
  campaignName: string;
  onClose: () => void;
}) {
  const { data, loading, error } = useApi<Resp>(
    `/api/zalo/campaigns/${campaignId}?limit=1000`,
  );
  const { data: accountsList } = useApi<AccountPublic[]>("/api/zalo/accounts");
  const accounts = new Map(
    (accountsList ?? []).map((a) => [a.zaloId, a.fullName || a.phone || a.zaloId]),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const logs = data?.logs ?? [];
  const pageStart = (Math.min(page, Math.max(1, Math.ceil(logs.length / pageSize))) - 1) * pageSize;
  const pageLogs = logs.slice(pageStart, pageStart + pageSize);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Chi tiết: ${campaignName}`}
    >
      <div className="mb-3 flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          disabled={logs.length === 0}
          onClick={() => downloadCsv(`${campaignName}.csv`, toCsv(logs, accounts))}
        >
          <Icon name="download" size={14} /> Export CSV
        </Button>
      </div>
      <Table minWidth={720}>
        <Thead>
          <Th className="w-10">#</Th>
          <Th>Mục tiêu</Th>
          <Th>Tài khoản</Th>
          <Th>Trạng thái</Th>
          <Th>Lý do thất bại</Th>
          <Th>Thời gian</Th>
        </Thead>
        <tbody>
          {pageLogs.map((l, i) => (
            <Tr key={l.id}>
              <Td className="text-muted">{pageStart + i + 1}</Td>
              <Td>{targetLabel(l.target)}</Td>
              <Td className="text-muted">{accounts.get(l.accountId) ?? l.accountId ?? "—"}</Td>
              <Td>
                {l.ok ? (
                  <Badge tone="success">Thành công</Badge>
                ) : (
                  <Badge tone="danger">Thất bại</Badge>
                )}
              </Td>
              <Td className="text-muted">{l.ok ? "—" : l.message}</Td>
              <Td className="text-muted">{new Date(l.ts).toLocaleString("vi-VN")}</Td>
            </Tr>
          ))}
          {pageLogs.length === 0 && (
            <TableEmpty colSpan={6}>
              {loading ? "Đang tải…" : error ? error : "Chưa có nhật ký."}
            </TableEmpty>
          )}
        </tbody>
      </Table>
      {logs.length > 0 && (
        <Pagination
          total={logs.length}
          page={page}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      )}
    </Modal>
  );
}
