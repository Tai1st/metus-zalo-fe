"use client";

import { useState, type FormEvent } from "react";
import { apiSend } from "@/lib/fetcher";
import { Button, Modal, Notice, PasswordInput } from "@/components/ui";

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) return setError("Mật khẩu mới phải có ít nhất 6 ký tự");
    if (newPassword !== confirm) return setError("Xác nhận mật khẩu mới không khớp");
    setBusy(true);
    try {
      await apiSend("/api/auth/change-password", "POST", {
        currentPassword,
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
    <Modal open onClose={onClose} title="Đổi mật khẩu">
      {done ? (
        <div className="flex flex-col gap-4">
          <Notice tone="success">Đổi mật khẩu thành công.</Notice>
          <div className="flex justify-end">
            <Button onClick={onClose}>Đóng</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="text-sm">
            <span className="text-danger">*</span> Mật khẩu hiện tại
            <PasswordInput
              className="mt-1"
              autoComplete="current-password"
              autoFocus
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="text-danger">*</span> Mật khẩu mới
            <PasswordInput
              className="mt-1"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="text-danger">*</span> Nhập lại mật khẩu mới
            <PasswordInput
              className="mt-1"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>

          {error && <Notice tone="error">{error}</Notice>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={busy}>
              Đổi mật khẩu
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
