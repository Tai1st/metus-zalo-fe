"use client";

import { use } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { apiSend } from "@/lib/fetcher";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import {
  ACTION_LABEL,
  actionOf,
  type Campaign,
  type CampaignLog,
  KIND_LABEL,
  STATUS_LABEL,
} from "@/lib/campaign";

type Resp = { campaign: Campaign; logs: CampaignLog[]; running: boolean };

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, reload } = useApi<Resp>(`/api/zalo/campaigns/${id}`, 3000);

  async function act(action: "start" | "stop") {
    await apiSend(`/api/zalo/campaigns/${id}/actions`, "POST", { action });
    reload();
  }

  if (!data) {
    return <p className="text-sm text-muted">Đang tải…</p>;
  }

  const { campaign: c, logs } = data;
  const cfg = c.config;
  const done = c.sentOk + c.sentFail;

  return (
    <div>
      <PageHeader
        title={c.name}
        subtitle={`${ACTION_LABEL[actionOf(c)]} · ${KIND_LABEL[c.kind]} · ${c.accountIds.length} tài khoản · ${c.targets.length} mục tiêu`}
        action={
          <div className="flex gap-2">
            <Link href="/campaigns">
              <Button variant="ghost">← Danh sách</Button>
            </Link>
            {c.status === "running" ? (
              <Button variant="ghost" onClick={() => act("stop")}>
                Dừng
              </Button>
            ) : (
              <Button onClick={() => act("start")}>
                {c.status === "paused" ? "Tiếp tục" : "Chạy"}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Badge
              tone={
                c.status === "running"
                  ? "zalo"
                  : c.status === "done"
                    ? "success"
                    : c.status === "error"
                      ? "danger"
                      : "warning"
              }
            >
              {STATUS_LABEL[c.status]}
            </Badge>
            <span className="text-sm text-muted">
              {done}/{c.targets.length} · ✓{c.sentOk} ✗{c.sentFail}
            </span>
          </div>
          <dl className="space-y-1.5 text-sm">
            <Row k="Đổi TK nếu lỗi" v={`${cfg.switchAccountOnError} lần`} />
            <Row
              k="Tạm dừng giữa các lần"
              v={`${cfg.pauseFrom}–${cfg.pauseTo} giây`}
            />
            <Row
              k="Nghỉ sau thành công"
              v={
                cfg.stopAfterSuccess
                  ? `${cfg.stopAfterSuccess} lần / ${cfg.stopAfterSuccessPause}s`
                  : "Tắt"
              }
            />
            <Row
              k="Giới hạn"
              v={`${cfg.dailyLimit} / ${cfg.dailyLimitUnit === "hour" ? "giờ" : "ngày"}`}
            />
            <Row k="Tự kết bạn" v={cfg.autoAddFriend ? "Bật" : "Tắt"} />
            <Row k="Chèn emoji" v={cfg.autoEmoji ? "Bật" : "Tắt"} />
          </dl>
          <div className="mt-3 rounded-lg bg-background p-3 text-sm">
            {cfg.content}
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            Nhật ký gửi
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-4 py-2 font-medium">Thời gian</th>
                  <th className="px-4 py-2 font-medium">Mục tiêu</th>
                  <th className="px-4 py-2 font-medium">Tài khoản</th>
                  <th className="px-4 py-2 font-medium">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-2 text-muted">
                      {new Date(l.ts).toLocaleTimeString("vi-VN")}
                    </td>
                    <td className="px-4 py-2">{l.target}</td>
                    <td className="px-4 py-2 text-muted">
                      {l.accountId || "—"}
                    </td>
                    <td className="px-4 py-2">
                      {l.ok ? (
                        <span className="text-success">✓ {l.message}</span>
                      ) : (
                        <span className="text-danger">✗ {l.message}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted"
                    >
                      Chưa có nhật ký.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
