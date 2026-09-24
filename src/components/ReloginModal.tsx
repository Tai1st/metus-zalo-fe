"use client";

import { AddAccountModal } from "@/components/AddAccountModal";
import type { AccountPublic } from "@/lib/types";

/**
 * Re-authenticate an account whose stored session died (silent reconnect
 * failed) — same manual/QR UI as "Thêm tài khoản", just retitled. The server
 * links/upserts by zaloId either way, so pasting fresh cookies or scanning
 * with the same phone refreshes this exact row instead of adding a new one.
 */
export function ReloginModal({
  account,
  onClose,
  onAdded,
}: {
  account: AccountPublic;
  onClose: () => void;
  onAdded: () => void;
}) {
  return (
    <AddAccountModal
      title={`Đăng nhập lại — ${account.fullName || account.zaloId}`}
      submitLabel="Đăng nhập lại"
      onClose={onClose}
      onAdded={onAdded}
    />
  );
}
