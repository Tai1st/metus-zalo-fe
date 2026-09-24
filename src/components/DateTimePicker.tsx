"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  showTime?: boolean;
  placeholder?: string;
  minDate?: Date | null;
  disabled?: boolean;
};

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const TIME_PRESETS = [
  { h: 9, m: 0 },
  { h: 12, m: 0 },
  { h: 14, m: 30 },
  { h: 17, m: 0 },
  { h: 23, m: 55 },
];

const pad = (n: number) => String(n).padStart(2, "0");
const sameDay = (a: Date | null, b: Date | null) =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function format(d: Date, withTime: boolean) {
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

const Icon = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);
const CAL = "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z";
const CLOCK = "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z";

export function DateTimePicker({
  value,
  onChange,
  showTime = true,
  placeholder,
  minDate,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => value ?? new Date());
  const [hours, setHours] = useState(() => value?.getHours() ?? 23);
  const [minutes, setMinutes] = useState(() => value?.getMinutes() ?? 55);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const isDisabled = (d: Date) => !!minDate && startOfDay(d) < startOfDay(minDate);

  function pickDay(day: number) {
    const d = new Date(view.getFullYear(), view.getMonth(), day, hours, minutes);
    if (!isDisabled(d)) onChange(d);
  }

  function setTime(h: number, m: number) {
    setHours(h);
    setMinutes(m);
    const base = value ?? new Date();
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m);
    if (!isDisabled(d)) onChange(d);
  }

  function preset(target: Date) {
    if (isDisabled(target)) return;
    setView(target);
    setHours(target.getHours());
    setMinutes(target.getMinutes());
    onChange(target);
  }

  const year = view.getFullYear();
  const month = view.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const today = new Date();

  const inDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(23, 55, 0, 0);
    return d;
  };
  const inMonths = (n: number) => {
    const base = value && value > today ? value : today;
    const d = new Date(base);
    d.setMonth(d.getMonth() + n);
    return d;
  };
  const shortcuts: { label: string; make: () => Date }[] = [
    { label: "Hôm nay", make: () => inDays(0) },
    { label: "Ngày mai", make: () => inDays(1) },
    { label: "+ 7 ngày", make: () => inDays(7) },
    { label: "+ 1 tháng", make: () => inMonths(1) },
    { label: "+ 3 tháng", make: () => inMonths(3) },
    { label: "+ 6 tháng", make: () => inMonths(6) },
    { label: "+ 12 tháng", make: () => inMonths(12) },
  ];

  const presetBtn =
    "whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-zalo/10 hover:text-zalo";
  const selectCls =
    "rounded-md border border-border bg-surface px-2 py-1 text-xs font-bold outline-none focus:border-zalo";

  return (
    <div className="relative w-full" ref={ref}>
      <div
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex h-9 w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg border bg-surface px-3 text-sm ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : open
              ? "border-zalo ring-2 ring-zalo/20"
              : "border-border hover:border-zalo"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Icon d={CAL} className="h-4 w-4 shrink-0 text-zalo" />
          <span className={`truncate ${value ? "" : "text-muted"}`}>
            {value
              ? format(value, showTime)
              : placeholder || (showTime ? "Chọn ngày giờ" : "Chọn ngày")}
          </span>
        </div>
        {showTime && <Icon d={CLOCK} className="h-4 w-4 shrink-0 text-muted" />}
      </div>

      {open && (
        <div className="absolute left-0 z-50 mt-1 flex min-w-[280px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl sm:min-w-[500px] sm:flex-row">
          <div className="flex gap-1 overflow-x-auto border-b border-border bg-background p-2 sm:w-36 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r">
            <div className="hidden px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted sm:block">
              Chọn nhanh
            </div>
            {shortcuts.map((s) => (
              <button key={s.label} type="button" className={presetBtn} onClick={() => preset(s.make())}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-col p-3">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView(new Date(year, month - 1, 1))}
                className="rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
              >
                <Icon d="M15 19l-7-7 7-7" />
              </button>
              <div className="text-xs font-bold">
                Tháng {month + 1}, {year}
              </div>
              <button
                type="button"
                onClick={() => setView(new Date(year, month + 1, 1))}
                className="rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
              >
                <Icon d="M9 5l7 7-7 7" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1 text-[10px] font-bold text-muted">
                  {w}
                </div>
              ))}
            </div>

            <div className="mb-3 grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`e${i}`} className="h-9" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const cur = new Date(year, month, d);
                const selected = sameDay(cur, value);
                const off = isDisabled(cur);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={off}
                    onClick={() => pickDay(d)}
                    className={`mx-auto flex h-9 w-full max-w-[36px] items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                      off
                        ? "cursor-not-allowed opacity-30"
                        : selected
                          ? "bg-zalo font-bold text-white shadow-md"
                          : sameDay(cur, today)
                            ? "border-2 border-zalo text-zalo hover:bg-zalo/10"
                            : "hover:bg-background"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {showTime && (
              <div className="border-t border-border pt-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold text-muted">
                    <Icon d={CLOCK} className="h-3.5 w-3.5 text-zalo" />
                    Giờ:
                  </div>
                  <div className="flex gap-1 overflow-x-auto">
                    {TIME_PRESETS.map((tp) => (
                      <button
                        key={`${tp.h}:${tp.m}`}
                        type="button"
                        onClick={() => setTime(tp.h, tp.m)}
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          hours === tp.h && minutes === tp.m
                            ? "bg-zalo text-white"
                            : "bg-background text-muted hover:bg-zalo/10"
                        }`}
                      >
                        {pad(tp.h)}:{pad(tp.m)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background p-2">
                  <label className="text-[10px] font-semibold text-muted">Giờ</label>
                  <select
                    className={selectCls}
                    value={hours}
                    onChange={(e) => setTime(Number(e.target.value), minutes)}
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={h}>{pad(h)}</option>
                    ))}
                  </select>
                  <span className="font-bold text-muted">:</span>
                  <label className="text-[10px] font-semibold text-muted">Phút</label>
                  <select
                    className={selectCls}
                    value={minutes}
                    onChange={(e) => setTime(hours, Number(e.target.value))}
                  >
                    {Array.from({ length: 60 }).map((_, m) => (
                      <option key={m} value={m}>{pad(m)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="mt-2.5 flex justify-end border-t border-border pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-zalo px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-zalo-dark"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Date-only picker bound to a "YYYY-MM-DD" string ("" = empty). */
export function DateInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [y, m, d] = value.split("-").map(Number);
  const date = value && y ? new Date(y, m - 1, d) : null;
  return (
    <DateTimePicker
      showTime={false}
      placeholder={placeholder}
      value={date}
      onChange={(dt) =>
        onChange(
          dt
            ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
            : "",
        )
      }
    />
  );
}
