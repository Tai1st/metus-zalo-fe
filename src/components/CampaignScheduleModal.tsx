"use client";

import { useState } from "react";
import { DateInput } from "@/components/DateTimePicker";
import { apiSend } from "@/lib/fetcher";
import { Button, Field, inputCls, Modal, Notice } from "@/components/ui";
import type { Campaign } from "@/lib/campaign";
import type { ScheduleRepeat } from "@/lib/schedule";

const today = () => new Date().toISOString().slice(0, 10);

/** Đặt lịch chạy cho một yêu cầu cụ thể — cùng payload với /schedule/new,
 * nhưng "Task" đã cố định sẵn nên không cần chọn lại. */
export function CampaignScheduleModal({
  campaign,
  onClose,
  onDone,
}: {
  campaign: Campaign;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    name: `Lịch cho ${campaign.name}`,
    repeat: "daily" as ScheduleRepeat,
    timeOfDay: "00:00",
    timeOfDayEnd: "",
    intervalDays: "1",
    intervalHours: "1",
    fromDate: today(),
    toDate: "",
    skipFailed: true,
    skipSucceeded: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setError(null);
    if (!form.name.trim()) return setError("Nhập tên lịch trình");
    setSaving(true);
    try {
      await apiSend("/api/zalo/schedules", "POST", {
        name: form.name.trim(),
        campaignId: campaign.id,
        repeat: form.repeat,
        timeOfDay: form.timeOfDay,
        timeOfDayEnd: form.timeOfDayEnd || null,
        intervalDays: Math.max(1, Number(form.intervalDays) || 1),
        intervalHours: Math.max(1, Number(form.intervalHours) || 1),
        fromDate: form.fromDate,
        toDate: form.toDate || null,
        skipFailed: form.skipFailed,
        skipSucceeded: form.skipSucceeded,
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Đặt lịch chạy"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu"}
          </Button>
        </>
      }
    >
      <p className="-mt-2 mb-4 text-sm text-muted">Task: {campaign.name}</p>
      <div className="space-y-3">
        <Field label="Tên lịch trình" required>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>

        <Field label="Lặp lại" required>
          <select
            className={inputCls}
            value={form.repeat}
            onChange={(e) => set("repeat", e.target.value as ScheduleRepeat)}
          >
            <option value="once">Một lần</option>
            <option value="daily">Theo ngày</option>
            <option value="hourly">Theo giờ</option>
          </select>
        </Field>

        <Field label="Giờ chạy" required>
          <div className="flex items-center gap-2">
            <input
              type="time"
              className={`${inputCls} w-32`}
              value={form.timeOfDay}
              onChange={(e) => set("timeOfDay", e.target.value)}
            />
            <span className="text-muted">–</span>
            <input
              type="time"
              className={`${inputCls} w-32`}
              value={form.timeOfDayEnd}
              onChange={(e) => set("timeOfDayEnd", e.target.value)}
              placeholder="Kết thúc"
            />
          </div>
        </Field>

        {form.repeat === "daily" && (
          <Field label="Lặp lại mỗi (ngày)">
            <input
              type="number"
              min={1}
              className={`${inputCls} w-24`}
              value={form.intervalDays}
              onChange={(e) => set("intervalDays", e.target.value)}
            />
          </Field>
        )}
        {form.repeat === "hourly" && (
          <Field label="Lặp lại mỗi (giờ)">
            <input
              type="number"
              min={1}
              className={`${inputCls} w-24`}
              value={form.intervalHours}
              onChange={(e) => set("intervalHours", e.target.value)}
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày bắt đầu" required>
            <DateInput value={form.fromDate} onChange={(v) => set("fromDate", v)} />
          </Field>
          <Field label="Ngày kết thúc">
            <DateInput value={form.toDate} onChange={(v) => set("toDate", v)} />
          </Field>
        </div>

        <Field label="Tùy chọn gửi">
          <div className="flex flex-col gap-2 pt-1 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.skipFailed}
                onChange={(e) => set("skipFailed", e.target.checked)}
              />
              Bỏ qua item đã thất bại
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.skipSucceeded}
                onChange={(e) => set("skipSucceeded", e.target.checked)}
              />
              Bỏ qua item đã thành công
            </label>
          </div>
        </Field>
      </div>

      {error && (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </Modal>
  );
}
