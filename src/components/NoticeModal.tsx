"use client";

import { useEffect, useState } from "react";
import { Button, Modal } from "@/components/ui";

const STORAGE_KEY = "mz_notice_hidden_until";
const HIDE_MS = 24 * 60 * 60 * 1000;
const ZALO_HREF = "https://zalo.me/0987533112";

const link = "font-medium text-zalo hover:underline";

function isHidden(): boolean {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

/** Thông báo hỗ trợ hiện khi vào ứng dụng; tick "không hiện lại 24h" để ẩn. */
export function NoticeModal() {
  const [open, setOpen] = useState(false);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    if (!isHidden()) setOpen(true);
  }, []);

  function close() {
    if (skip) {
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now() + HIDE_MS));
      } catch {
        /* bỏ qua: chỉ mất tính năng nhớ lựa chọn */
      }
    }
    setOpen(false);
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Thông báo"
      size="md"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skip}
              onChange={(e) => setSkip(e.target.checked)}
            />
            Không hiển thị lại trong vòng 24h
          </label>
          <Button onClick={close}>Đóng</Button>
        </div>
      }
    >
      <div className="space-y-2 text-sm leading-relaxed">
        <p>Hỗ trợ ở đây</p>
        <p>
          Zalo:{" "}
          <a href={ZALO_HREF} target="_blank" rel="noreferrer" className={link}>
            0987.533.112
          </a>{" "}
          (bấm để nhắn tin)
        </p>
        <p>
          Nên dùng proxy IPv4 riêng cho từng tài khoản Zalo để ổn định và an
          toàn hơn.
        </p>
        <p>
          Nếu dùng proxy dùng chung thì chỉ nên thêm 1 tài khoản Zalo, không
          thì dễ bị Zalo khoá.
        </p>
      </div>
    </Modal>
  );
}
