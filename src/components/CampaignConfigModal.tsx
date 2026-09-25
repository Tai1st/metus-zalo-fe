"use client";

import { Modal } from "@/components/ui";
import type { Campaign } from "@/lib/campaign";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}

/** Xem nhanh cấu hình gửi của một yêu cầu — chỉ đọc. */
export function CampaignConfigModal({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
  const c = campaign.config;
  return (
    <Modal open onClose={onClose} size="md" title={`Cấu hình: ${campaign.name}`}>
      <div className="divide-y divide-border">
        <Row k="Tên yêu cầu" v={campaign.name} />
        <Row k="Đổi tài khoản nếu lỗi" v={`${c.switchAccountOnError} lần`} />
        <Row k="Thời gian tạm dừng" v={`${c.pauseFrom} đến ${c.pauseTo} giây`} />
        <Row
          k="Dừng lại nếu gửi thành công"
          v={
            c.stopAfterSuccess
              ? `${c.stopAfterSuccess} lần, tạm dừng ${c.stopAfterSuccessPause} giây`
              : "Tắt"
          }
        />
        <Row
          k="Giới hạn số lượng thực thi"
          v={`${c.dailyLimit} lần/${c.dailyLimitUnit === "hour" ? "giờ" : "ngày"}`}
        />
        <Row
          k="Tùy chọn"
          v={
            <span className="flex flex-col items-end gap-0.5">
              <span>Phân bổ đều (chia đều): {c.distributeEvenly ? "Có" : "Không"}</span>
              <span>Lọc trùng: {c.dedupeTargets ? "Có" : "Không"}</span>
            </span>
          }
        />
        <Row k="Tự động chèn emoji" v={c.autoEmoji ? "Có" : "Không"} />
      </div>
    </Modal>
  );
}
