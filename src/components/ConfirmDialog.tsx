"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button, Modal } from "@/components/ui";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" đổi nút xác nhận sang màu đỏ — dùng cho thao tác không hoàn tác. */
  tone?: "default" | "danger";
};

/**
 * Thay cho window.confirm() gốc của trình duyệt — cùng giao diện Modal với
 * phần còn lại của app. Dùng: const { confirm, dialog } = useConfirm(); rồi
 * render {dialog} một lần trong component và `if (!(await confirm("..."))) return;`
 */
export function useConfirm() {
  const [state, setState] = useState<{ message: ReactNode; opts: ConfirmOptions } | null>(
    null,
  );
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((message: ReactNode, opts: ConfirmOptions = {}) => {
    setState({ message, opts });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(result: boolean) {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  }

  const dialog = state ? (
    <Modal
      open
      onClose={() => close(false)}
      size="sm"
      title={state.opts.title ?? "Xác nhận"}
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>
            {state.opts.cancelLabel ?? "Huỷ"}
          </Button>
          <Button
            variant={state.opts.tone === "danger" ? "danger" : "primary"}
            onClick={() => close(true)}
          >
            {state.opts.confirmLabel ?? "Đồng ý"}
          </Button>
        </>
      }
    >
      <p className="text-sm">{state.message}</p>
    </Modal>
  ) : null;

  return { confirm, dialog };
}
