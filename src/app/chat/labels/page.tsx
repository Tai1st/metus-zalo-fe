"use client";

import { LabelManager } from "@/components/LabelManager";

const SWATCHES = [
  "#f04438",
  "#f79009",
  "#12b76a",
  "#0068ff",
  "#7a5af8",
  "#ec4899",
  "#0ea5e9",
  "#64748b",
];

export default function ChatLabelsPage() {
  return (
    <LabelManager
      endpoint="/api/zalo/chat-labels"
      title="Quản lý nhãn hội thoại"
      subtitle="Nhãn gắn cho từng cuộc trò chuyện trong Chat (VD: khách vip, khách chưa cho SĐT)."
      swatches={SWATCHES}
      namePlaceholder="VD: khách vip"
    />
  );
}
