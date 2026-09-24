"use client";

import { LabelManager } from "@/components/LabelManager";

const SWATCHES = [
  "#0068ff",
  "#12b76a",
  "#f79009",
  "#f04438",
  "#7a5af8",
  "#ec4899",
  "#0ea5e9",
  "#64748b",
];

export default function AccountLabelsPage() {
  return (
    <LabelManager
      endpoint="/api/zalo/labels"
      title="Quản lý nhãn tài khoản"
      swatches={SWATCHES}
      showCount
      namePlaceholder="VD: team ma"
    />
  );
}
