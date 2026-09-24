"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { apiGet, apiSend } from "@/lib/fetcher";
import {
  Button,
  Card,
  Field,
  inputCls,
  Notice,
  PageHeader,
} from "@/components/ui";
import {
  ACTION_LABEL,
  actionOf,
  CATEGORY_LABEL,
  categoryOf,
  KIND_LABEL,
  type Campaign,
  type CampaignCategory,
} from "@/lib/campaign";
import type { Schedule, ScheduleRepeat } from "@/lib/schedule";

const today = () => new Date().toISOString().slice(0, 10);
const TABS: CampaignCategory[] = ["message", "friend", "group"];

export default function NewSchedulePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải…</p>}>
      <NewScheduleForm />
    </Suspense>
  );
}

function NewScheduleForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const initialCategory = params.get("category");

  const { data: campaigns } = useApi<Campaign[]>("/api/zalo/campaigns");
  const [tab, setTab] = useState<CampaignCategory>(
    TABS.includes(initialCategory as CampaignCategory)
      ? (initialCategory as CampaignCategory)
      : "message",
  );
  const [form, setForm] = useState({
    name: "",
    campaignId: "",
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

  useEffect(() => {
    if (!editId) return;
    let alive = true;
    (async () => {
      const list = await apiGet<Schedule[]>("/api/zalo/schedules");
      const s = list.find((x) => String(x.id) === editId);
      if (!s || !alive) return;
      setTab(categoryOf(s.campaignAction));
      setForm({
        name: s.name,
        campaignId: String(s.campaignId),
        repeat: s.repeat,
        timeOfDay: s.timeOfDay,
        timeOfDayEnd: s.timeOfDayEnd ?? "",
        intervalDays: String(s.intervalDays),
        intervalHours: String(s.intervalHours),
        fromDate: s.fromDate,
        toDate: s.toDate ?? "",
        skipFailed: s.skipFailed,
        skipSucceeded: s.skipSucceeded,
      });
    })();
    return () => {
      alive = false;
    };
  }, [editId]);

  async function save() {
    setError(null);
    if (!form.name.trim()) return setError("Nhập tên lịch trình");
    if (!form.campaignId) return setError("Chọn một task");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        campaignId: Number(form.campaignId),
        repeat: form.repeat,
        timeOfDay: form.timeOfDay,
        timeOfDayEnd: form.timeOfDayEnd || null,
        intervalDays: Math.max(1, Number(form.intervalDays) || 1),
        intervalHours: Math.max(1, Number(form.intervalHours) || 1),
        fromDate: form.fromDate,
        toDate: form.toDate || null,
        skipFailed: form.skipFailed,
        skipSucceeded: form.skipSucceeded,
      };
      if (editId) {
        await apiSend(`/api/zalo/schedules/${editId}`, "PATCH", payload);
      } else {
        await apiSend("/api/zalo/schedules", "POST", payload);
      }
      router.push("/schedule");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div>
      <PageHeader
        title="Tạo yêu cầu · Lịch trình"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.push("/schedule")}>
              ← Quay lại
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu"}
            </Button>
          </div>
        }
      />

      <Card className="max-w-2xl">
        <div className="mb-4 flex gap-6 border-b border-border text-sm">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                set("campaignId", "");
              }}
              className={`-mb-px border-b-2 pb-2 ${
                tab === t
                  ? "border-zalo font-medium text-zalo"
                  : "border-transparent text-muted"
              }`}
            >
              {CATEGORY_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="divide-y divide-border">
            <Field label="Tên" required>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="VD: Gửi sáng 8h"
              />
            </Field>

            <Field label="Task" required>
              {(() => {
                const options = (campaigns ?? []).filter(
                  (c) => categoryOf(actionOf(c)) === tab,
                );
                return (
                  <select
                    className={inputCls}
                    value={form.campaignId}
                    disabled={options.length === 0}
                    onChange={(e) => set("campaignId", e.target.value)}
                  >
                    <option value="">
                      {options.length === 0
                        ? "Chưa có task trong mục này"
                        : "Chọn task"}
                    </option>
                    {options.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {ACTION_LABEL[actionOf(c)]} ·{" "}
                        {KIND_LABEL[c.kind]}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </Field>

            <Field label="Lặp lại" required>
              <select
                className={inputCls}
                value={form.repeat}
                onChange={(e) =>
                  set("repeat", e.target.value as ScheduleRepeat)
                }
              >
                <option value="once">Một lần</option>
                <option value="daily">Theo ngày</option>
                <option value="hourly">Theo giờ</option>
              </select>
            </Field>

            <Field label="Khung giờ" required>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className={`${inputCls} w-40`}
                  value={form.timeOfDay}
                  onChange={(e) => set("timeOfDay", e.target.value)}
                />
                <span className="text-muted">–</span>
                <input
                  type="time"
                  className={`${inputCls} w-40`}
                  value={form.timeOfDayEnd}
                  onChange={(e) => set("timeOfDayEnd", e.target.value)}
                  placeholder="Kết thúc"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {form.repeat === "hourly"
                  ? "Chạy lặp lại trong khung giờ này mỗi ngày. Bỏ trống ô kết thúc = tới hết ngày."
                  : "Bỏ trống ô kết thúc để chạy đúng giờ cố định; điền cả hai để mỗi lần chạy tự chọn ngẫu nhiên 1 giờ trong khoảng."}
              </p>
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

            <Field label="Ngày bắt đầu" required>
              <input
                type="date"
                className={`${inputCls} w-56`}
                value={form.fromDate}
                onChange={(e) => set("fromDate", e.target.value)}
              />
            </Field>

            <Field label="Ngày kết thúc">
              <input
                type="date"
                className={`${inputCls} w-56`}
                value={form.toDate}
                onChange={(e) => set("toDate", e.target.value)}
              />
            </Field>

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
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
      </Card>
    </div>
  );
}
