"use client";

import { useState } from "react";
import { apiSend } from "@/lib/fetcher";
import { Button, Checkbox, Input, Modal, Notice } from "@/components/ui";
import type { AccountPublic } from "@/lib/types";

export type Employee = {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  isActive: boolean;
  allowedZaloIds: string[];
};

/** Mật khẩu ngẫu nhiên đủ mạnh, tránh ký tự dễ nhầm (0/O, 1/l/I). */
function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** Create a new employee, or edit an existing one (username is fixed once created). */
export function EmployeeModal({
  employee,
  accounts,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  accounts: AccountPublic[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!employee;
  const [username, setUsername] = useState(employee?.username ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState(employee?.fullName ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [isActive, setIsActive] = useState(employee?.isActive ?? true);
  const [allowed, setAllowed] = useState<Set<string>>(
    new Set(employee?.allowedZaloIds ?? []),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(zaloId: string) {
    setAllowed((s) => {
      const next = new Set(s);
      if (next.has(zaloId)) next.delete(zaloId);
      else next.add(zaloId);
      return next;
    });
  }

  async function save() {
    setError(null);
    if (!isEdit) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/.test(username)) {
        return setError(
          "Tên đăng nhập dài 3–32 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới và gạch ngang",
        );
      }
      if (password.length < 8) return setError("Mật khẩu tối thiểu 8 ký tự");
    }
    if (!fullName.trim()) return setError("Nhập họ tên");

    setBusy(true);
    try {
      if (isEdit) {
        await apiSend(`/api/employees/${employee.id}`, "PATCH", {
          fullName: fullName.trim(),
          phone: phone.trim(),
          isActive,
          allowedZaloIds: [...allowed],
        });
      } else {
        await apiSend("/api/employees", "POST", {
          username: username.trim(),
          password,
          fullName: fullName.trim(),
          phone: phone.trim(),
          allowedZaloIds: [...allowed],
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={isEdit ? `Sửa nhân sự — ${employee.username}` : "Thêm nhân sự"}
    >
      <div className="flex flex-col gap-4">
        {!isEdit && (
          <label className="text-sm">
            <span className="text-danger">*</span> Tên đăng nhập
            <Input
              className="mt-1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              placeholder="vd. nhanvien01"
            />
          </label>
        )}
        {!isEdit && (
          <label className="text-sm">
            <span className="text-danger">*</span> Mật khẩu
            <div className="mt-1 flex gap-2">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Tối thiểu 8 ký tự"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPassword(generatePassword());
                  setShowPassword(true);
                }}
              >
                Tạo tự động
              </Button>
            </div>
            {showPassword && password && (
              <p className="mt-1 text-xs text-muted">
                Ghi lại mật khẩu này để gửi cho nhân sự — sẽ không hiện lại sau khi đóng.
              </p>
            )}
          </label>
        )}
        <label className="text-sm">
          <span className="text-danger">*</span> Họ và tên
          <Input
            className="mt-1"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Số điện thoại <span className="text-muted">Tùy chọn</span>
          <Input
            className="mt-1"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xxxxxxxx"
          />
        </label>

        {isEdit && (
          <Checkbox
            label="Đang hoạt động (bỏ chọn để khóa tài khoản này)"
            checked={isActive}
            onChange={setIsActive}
          />
        )}

        <div>
          <span className="text-sm font-medium">
            Tài khoản Zalo được phép dùng
          </span>
          <p className="mt-0.5 text-xs text-muted">
            Nhân sự chỉ thấy và thao tác được với các tài khoản chọn ở đây, ở
            mục Chat.
          </p>
          <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2.5">
            {accounts.length === 0 && (
              <p className="py-2 text-center text-xs text-muted">
                Chưa có tài khoản Zalo nào.
              </p>
            )}
            {accounts.map((a) => (
              <Checkbox
                key={a.zaloId}
                label={a.fullName || a.zaloId}
                checked={allowed.has(a.zaloId)}
                onChange={() => toggle(a.zaloId)}
              />
            ))}
          </div>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={save} loading={busy}>
            {isEdit ? "Lưu" : "Thêm nhân sự"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
