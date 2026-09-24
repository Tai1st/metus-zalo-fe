"use client";

import { useApi } from "@/hooks/useApi";
import { actionOf, categoryOf, type Campaign } from "@/lib/campaign";
import {
  Card,
  PageHeader,
  Table,
  TableEmpty,
  Td,
  Th,
  Thead,
  Tr,
} from "@/components/ui";

type Employee = { id: string; username: string; fullName: string };
type Me = { id: string; username: string; fullName: string };

type Row = {
  id: string;
  name: string;
  sentOk: number;
  sentFail: number;
  campaigns: number;
};

export default function ReportsPage() {
  const cmp = useApi<Campaign[]>("/api/zalo/campaigns");
  const emp = useApi<Employee[]>("/api/employees");
  const me = useApi<Me>("/api/auth/me");

  const loading = cmp.loading || emp.loading || me.loading;
  const error = cmp.error || emp.error || me.error;

  const rows = buildRows(cmp.data ?? [], emp.data ?? [], me.data);
  const totalOk = rows.reduce((s, r) => s + r.sentOk, 0);
  const totalFail = rows.reduce((s, r) => s + r.sentFail, 0);

  return (
    <div>
      <PageHeader
        title="Báo cáo"
        subtitle="Số lượng tin nhắn đã gửi của bạn và từng nhân sự (chỉ tính các yêu cầu Nhắn tin)."
      />
      <Card className="p-0">
        <Table minWidth={640}>
          <Thead>
            <Th>Người gửi</Th>
            <Th>Số yêu cầu</Th>
            <Th>Gửi thành công</Th>
            <Th>Gửi thất bại</Th>
          </Thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium">{r.name}</Td>
                <Td className="text-muted">{r.campaigns}</Td>
                <Td className="font-semibold text-success">{r.sentOk}</Td>
                <Td className="text-muted">{r.sentFail}</Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <TableEmpty colSpan={4}>
                {loading
                  ? "Đang tải…"
                  : error
                    ? error
                    : "Chưa có yêu cầu Nhắn tin nào."}
              </TableEmpty>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <Tr>
                <Td className="font-semibold">Tổng cộng</Td>
                <Td className="text-muted">
                  {rows.reduce((s, r) => s + r.campaigns, 0)}
                </Td>
                <Td className="font-semibold text-success">{totalOk}</Td>
                <Td className="text-muted">{totalFail}</Td>
              </Tr>
            </tfoot>
          )}
        </Table>
      </Card>
    </div>
  );
}

function buildRows(
  campaigns: Campaign[],
  employees: Employee[],
  me: Me | null,
): Row[] {
  const byId = new Map<string, Row>();
  const nameOf = (id: string) => {
    if (me && id === me.id) return `${me.fullName || me.username} (bạn)`;
    const e = employees.find((x) => x.id === id);
    return e ? e.fullName || e.username : "Nhân sự đã xoá";
  };
  const bucket = (id: string): Row => {
    const existing = byId.get(id);
    if (existing) return existing;
    const row: Row = { id, name: nameOf(id), sentOk: 0, sentFail: 0, campaigns: 0 };
    byId.set(id, row);
    return row;
  };

  for (const c of campaigns) {
    if (categoryOf(actionOf(c)) !== "message") continue;
    const ownerId = c.createdBy || me?.id || "";
    if (!ownerId) continue;
    const row = bucket(ownerId);
    row.sentOk += c.sentOk;
    row.sentFail += c.sentFail;
    row.campaigns += 1;
  }

  // Nhân sự chưa gửi tin nào cũng hiện với số 0, để leader thấy đủ danh sách.
  if (me) bucket(me.id);
  for (const e of employees) bucket(e.id);

  return Array.from(byId.values()).sort((a, b) => b.sentOk - a.sentOk);
}
