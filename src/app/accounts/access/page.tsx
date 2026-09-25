"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiSend } from "@/lib/fetcher";
import { EmployeeModal, type Employee } from "@/components/EmployeeModal";
import { ResetEmployeePasswordModal } from "@/components/ResetEmployeePasswordModal";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  RowAction,
  RowActions,
  Table,
  TableEmpty,
  Td,
  Th,
  Thead,
  Tr,
} from "@/components/ui";
import type { AccountPublic } from "@/lib/types";

export default function AccessPage() {
  const { data: employees, loading, reload } = useApi<Employee[]>(
    "/api/employees",
    15000,
  );
  const { data: accounts } = useApi<AccountPublic[]>("/api/zalo/accounts");
  const accountById = new Map((accounts ?? []).map((a) => [a.zaloId, a]));

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [resetting, setResetting] = useState<Employee | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function remove(e: Employee) {
    const ok = await confirm(`Xóa nhân sự "${e.username}"? Không thể hoàn tác.`, {
      tone: "danger",
      confirmLabel: "Xoá",
    });
    if (!ok) return;
    await apiSend(`/api/employees/${e.id}`, "DELETE");
    reload();
  }

  const rows = employees ?? [];

  return (
    <div>
      <PageHeader
        title="Quản lý truy cập"
        subtitle="Tạo tài khoản cho nhân sự và gán tài khoản Zalo họ được phép dùng ở mục Chat."
        action={<Button onClick={() => setShowAdd(true)}>Thêm nhân sự</Button>}
      />

      <Card className="p-0">
        <Table>
          <Thead>
            <Th>Tên đăng nhập</Th>
            <Th>Họ và tên</Th>
            <Th>Số điện thoại</Th>
            <Th>Tài khoản Zalo được phép</Th>
            <Th>Trạng thái</Th>
            <Th align="right">Thao tác</Th>
          </Thead>
          <tbody>
            {rows.map((e) => (
              <Tr key={e.id}>
                <Td className="font-medium">{e.username}</Td>
                <Td>{e.fullName}</Td>
                <Td>
                  {e.phone || <span className="text-xs text-muted">—</span>}
                </Td>
                <Td>
                  {e.allowedZaloIds.length === 0 ? (
                    <span className="text-xs text-muted">Chưa gán tài khoản nào</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {e.allowedZaloIds.map((id) => (
                        <Badge key={id} tone="zalo">
                          {accountById.get(id)?.fullName || id}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Td>
                <Td>
                  <Badge tone={e.isActive ? "success" : "danger"}>
                    {e.isActive ? "Đang hoạt động" : "Đã khóa"}
                  </Badge>
                </Td>
                <Td align="right">
                  <RowActions>
                    <RowAction
                      icon="edit"
                      label="Sửa"
                      tone="primary"
                      onClick={() => setEditing(e)}
                    />
                    <RowAction
                      icon="key"
                      label="Đặt lại mật khẩu"
                      onClick={() => setResetting(e)}
                    />
                    <RowAction
                      icon="trash"
                      label="Xóa"
                      tone="danger"
                      onClick={() => remove(e)}
                    />
                  </RowActions>
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <TableEmpty colSpan={6}>
                {loading
                  ? "Đang tải…"
                  : "Chưa có nhân sự nào. Bấm “Thêm nhân sự”."}
              </TableEmpty>
            )}
          </tbody>
        </Table>
      </Card>

      {showAdd && (
        <EmployeeModal
          employee={null}
          accounts={accounts ?? []}
          onClose={() => setShowAdd(false)}
          onSaved={reload}
        />
      )}
      {editing && (
        <EmployeeModal
          employee={editing}
          accounts={accounts ?? []}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
      {resetting && (
        <ResetEmployeePasswordModal
          employeeId={resetting.id}
          username={resetting.username}
          onClose={() => setResetting(null)}
        />
      )}
      {confirmDialog}
    </div>
  );
}
