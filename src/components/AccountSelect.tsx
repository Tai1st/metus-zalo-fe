"use client";

import { useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { inputCls } from "@/components/ui";
import type { AccountPublic } from "@/lib/types";

/** Account picker for pages that operate on one account at a time. */
export function AccountSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (zaloId: string) => void;
}) {
  const { data } = useApi<AccountPublic[]>("/api/zalo/accounts", 10000);
  const accounts = data ?? [];

  const first = accounts[0]?.zaloId;
  useEffect(() => {
    if (!value && first) onChange(first);
  }, [value, first, onChange]);

  return (
    <select
      className={`${inputCls} max-w-xs`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {accounts.length === 0 && <option value="">Chưa có tài khoản</option>}
      {accounts.map((a) => (
        <option key={a.zaloId} value={a.zaloId}>
          {a.fullName || a.zaloId} {a.connected ? "" : "(offline)"}
        </option>
      ))}
    </select>
  );
}
