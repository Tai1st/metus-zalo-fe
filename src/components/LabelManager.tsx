"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiSend } from "@/lib/fetcher";
import { Icon } from "@/components/icons";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  Button,
  Card,
  FilterTh,
  Input,
  Modal,
  Notice,
  PageHeader,
  RowAction,
  RowActions,
  StatusPill,
  Table,
  TableEmpty,
  Td,
  Th,
  Thead,
  textMatch,
  Tr,
  useColumnFilters,
} from "@/components/ui";

export type LabelRow = {
  id: number;
  name: string;
  color: string;
  accountCount?: number;
};

/**
 * Shared CRUD screen for account labels and chat labels — same table + colour
 * picker modal, only the endpoint / copy differ.
 */
export function LabelManager({
  endpoint,
  title,
  subtitle,
  swatches,
  showCount = false,
  namePlaceholder = "VD: khách vip",
}: {
  endpoint: string;
  title: string;
  subtitle?: string;
  swatches: string[];
  showCount?: boolean;
  namePlaceholder?: string;
}) {
  const { data, loading, reload } = useApi<LabelRow[]>(endpoint, 8000);
  const [editing, setEditing] = useState<LabelRow | "new" | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function remove(id: number) {
    const ok = await confirm("Xoá nhãn này?", { tone: "danger", confirmLabel: "Xoá" });
    if (!ok) return;
    await apiSend(`${endpoint}/${id}`, "DELETE");
    reload();
  }

  const f = useColumnFilters<"name">();
  const rows = (data ?? []).filter((l) => textMatch(l.name, f.filters.name));
  const cols = showCount ? 4 : 3;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reload}>
              <Icon name="refresh" size={14} /> Làm mới
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Icon name="plus" size={14} /> Thêm nhãn
            </Button>
          </div>
        }
      />

      <p className="mb-3 text-sm text-muted">Tổng: {rows.length} nhãn</p>

      <Card className="p-0">
        <Table>
          <Thead>
            <Th className="w-12">#</Th>
            <FilterTh
              value={f.filters.name ?? ""}
              onChange={(v) => f.setFilter("name", v)}
            >
              Nhãn
            </FilterTh>
            {showCount && <Th>Accounts gắn</Th>}
            <Th>Thao tác</Th>
          </Thead>
          <tbody>
            {rows.map((l, i) => (
              <Tr key={l.id}>
                <Td className="text-muted">{i + 1}</Td>
                <Td>
                  <StatusPill color={l.color}>{l.name}</StatusPill>
                </Td>
                {showCount && <Td>{l.accountCount ?? 0}</Td>}
                <Td>
                  <RowActions>
                    <RowAction
                      icon="edit"
                      label="Sửa"
                      tone="primary"
                      onClick={() => setEditing(l)}
                    />
                    <RowAction
                      icon="trash"
                      label="Xoá"
                      tone="danger"
                      onClick={() => remove(l.id)}
                    />
                  </RowActions>
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <TableEmpty colSpan={cols}>
                {loading
                  ? "Đang tải…"
                  : (data ?? []).length === 0
                    ? "Chưa có nhãn nào."
                    : "Không có nhãn khớp bộ lọc."}
              </TableEmpty>
            )}
          </tbody>
        </Table>
      </Card>

      <LabelModal
        open={editing !== null}
        endpoint={endpoint}
        swatches={swatches}
        namePlaceholder={namePlaceholder}
        label={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
      {confirmDialog}
    </div>
  );
}

function LabelModal({
  open,
  endpoint,
  swatches,
  namePlaceholder,
  label,
  onClose,
  onSaved,
}: {
  open: boolean;
  endpoint: string;
  swatches: string[];
  namePlaceholder: string;
  label: LabelRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(swatches[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seededFor, setSeededFor] = useState<number | "new" | null>(null);

  // Reset fields when the modal target changes.
  const target = label ? label.id : open ? "new" : null;
  if (open && target !== seededFor) {
    setName(label?.name ?? "");
    setColor(label?.color ?? swatches[0]);
    setError(null);
    setSeededFor(target);
  }

  async function save() {
    if (!name.trim()) return setError("Nhập tên nhãn");
    setSaving(true);
    try {
      if (label) {
        await apiSend(`${endpoint}/${label.id}`, "PATCH", { name, color });
      } else {
        await apiSend(endpoint, "POST", { name, color });
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={label ? "Sửa nhãn" : "Thêm nhãn"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={save} loading={saving}>
            Lưu
          </Button>
        </>
      }
    >
      <label className="text-sm">Tên nhãn</label>
      <Input
        className="mt-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={namePlaceholder}
        autoFocus
      />
      <div className="mt-3 text-sm">Màu</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-7 w-7 rounded-full ${
              color === c ? "ring-2 ring-foreground ring-offset-2" : ""
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      {error && (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </Modal>
  );
}
