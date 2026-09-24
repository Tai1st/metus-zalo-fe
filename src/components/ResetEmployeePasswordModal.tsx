"use client";

import { useState } from "react";
import { apiSend } from "@/lib/fetcher";
import { Button, Modal, Notice, PasswordInput } from "@/components/ui";

export function ResetEmployeePasswordModal({
  employeeId,
  username,
  onClose,
}: {
  employeeId: string;
  username: string;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (newPassword.length < 8) return setError("Mật khẩu tối thiểu 8 ký tự");
    setBusy(true);
    try {
      await apiSend(`/api/employees/${employeeId}/password`, "PATCH", {
        newPassword,
      });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Đặt lại mật khẩu — ${username}`}>
      {done ? (
        <div className="flex flex-col gap-4">
          <Notice tone="success">Đã đặt lại mật khẩu thành công.</Notice>
          <div className="flex justify-end">
            <Button onClick={onClose}>Đóng</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="text-sm">
            <span className="text-danger">*</span> Mật khẩu mới
            <PasswordInput
              className="mt-1"
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
            />
          </label>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={submit} loading={busy}>
              Đặt lại
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
