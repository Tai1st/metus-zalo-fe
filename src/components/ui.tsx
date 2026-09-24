"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/icons";

/* ------------------------------------------------------------------ layout */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-sm shadow-black/2 ${className}`}
    >
      {children}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const tones = {
    info: "bg-background text-muted",
    error: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
  } as const;
  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

/** Label + control row, matching the Auto Zalo form layout. */
export function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-4 py-2.5">
      <label className="pt-1.5 text-sm text-foreground">
        {required && <span className="text-danger">* </span>}
        {label}
      </label>
      <div>
        {children}
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ button */

export function Button({
  children,
  onClick,
  type = "button",
  disabled,
  loading,
  variant = "primary",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
}) {
  const variants = {
    primary: "bg-zalo text-white shadow-sm shadow-zalo/25 hover:bg-zalo-dark",
    ghost: "border border-border bg-surface hover:bg-surface-hover",
    danger: "bg-danger text-white shadow-sm shadow-danger/25 hover:opacity-90",
  } as const;
  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-4 py-1.5 text-sm",
  } as const;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ inputs */

export const inputCls =
  "w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-sm outline-none transition-shadow focus:border-zalo focus:ring-4 focus:ring-zalo/10 disabled:bg-background disabled:text-muted";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};
export function Input({ className = "", invalid, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`${inputCls} ${invalid ? "border-danger" : ""} ${className}`}
    />
  );
}

export function PasswordInput({
  className = "",
  inputClassName = inputCls,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputClassName?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className={`relative block ${className}`}>
      <input
        {...props}
        type={show ? "text" : "password"}
        className={`${inputClassName} pr-9`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className={`absolute right-2.5 top-1/2 -translate-y-1/2 hover:text-foreground ${show ? "text-zalo" : "text-muted"}`}
        aria-label="Hiện / ẩn mật khẩu"
      >
        <Icon name="eye" size={16} />
      </button>
    </span>
  );
}

type TextareaProps =React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};
export function Textarea({ className = "", invalid, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`${inputCls} ${invalid ? "border-danger" : ""} ${className}`}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;
export function Select({ className = "", children, ...props }: SelectProps) {
  return (
    <select {...props} className={`${inputCls} ${className}`}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  className = "",
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <label className={`flex items-center gap-2 text-sm ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-zalo" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* --------------------------------------------------------------- actions */

/**
 * Compact inline action for table rows — icon + label, colour by tone.
 * Keeps every list's "Thao tác" column visually consistent.
 */
export function RowAction({
  icon,
  label,
  onClick,
  href,
  tone = "default",
  disabled,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  href?: string;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
}) {
  const tones = {
    default: "text-foreground hover:text-zalo",
    primary: "text-zalo",
    danger: "text-danger",
  } as const;
  const cls = `inline-flex items-center gap-1 whitespace-nowrap text-xs hover:underline disabled:opacity-50 ${tones[tone]}`;
  const inner = (
    <>
      <Icon name={icon} size={13} />
      {label}
    </>
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}

/** Row-action container with consistent gaps. */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- tooltip */

/**
 * Hover label for an icon-only control or truncated text. CSS-only (no
 * portal), so it clips inside a scroll/overflow container — fine for the
 * short-lived hover use cases this is meant for (icon buttons, table cells).
 */
export function Tooltip({
  content,
  side = "bottom",
  children,
  className = "",
}: {
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
  className?: string;
}) {
  const sides = {
    top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
    left: "right-full top-1/2 mr-2 -translate-y-1/2",
    right: "left-full top-1/2 ml-2 -translate-y-1/2",
  } as const;
  return (
    <span className={`group/tooltip relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg shadow-black/20 transition-opacity delay-150 duration-150 group-hover/tooltip:opacity-100 ${sides[side]}`}
      >
        {content}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ badge */

type BadgeTone = "muted" | "success" | "danger" | "zalo" | "warning";
export function Badge({
  tone = "muted",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  const tones: Record<BadgeTone, string> = {
    muted: "bg-background text-muted",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    zalo: "bg-zalo/10 text-zalo",
    warning: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Coloured status pill from a free-form label + a "chip" tone. */
export function StatusPill({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ modal */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "sm",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-3xl" } as const;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`w-full ${widths[size]} rounded-2xl bg-surface p-6 shadow-2xl shadow-black/20`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 text-base font-bold">{title}</h2>}
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ table */

export function Table({
  children,
  minWidth,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-sm"
        style={minWidth ? { minWidth } : undefined}
      >
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border bg-surface-hover text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
        {children}
      </tr>
    </thead>
  );
}

export function Th({
  children,
  align,
  className = "",
}: {
  children?: ReactNode;
  align?: "right";
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-3 font-semibold ${align === "right" ? "text-right" : ""} ${className}`}
    >
      {children}
    </th>
  );
}

/* ---------------------------------------------------------- column filter */

/** `{ colKey: filterText }` state + a setter, for per-column table filtering. */
export function useColumnFilters<K extends string>() {
  const [filters, setFilters] = useState<Partial<Record<K, string>>>({});
  const setFilter = (key: K, value: string) =>
    setFilters((f) => {
      const next = { ...f };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  return { filters, setFilter };
}

/** Case-insensitive "contains". Empty filter always matches. */
export function textMatch(value: unknown, filter?: string): boolean {
  if (!filter) return true;
  return String(value ?? "")
    .toLowerCase()
    .includes(filter.trim().toLowerCase());
}

/** `<Th>` with a funnel icon that opens a text-filter popover. */
export function FilterTh({
  children,
  value,
  onChange,
  align,
  className = "",
}: {
  children: ReactNode;
  value: string;
  onChange: (v: string) => void;
  align?: "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
  }, [open]);

  return (
    <th
      className={`px-3 py-3 font-medium ${align === "right" ? "text-right" : ""} ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Lọc cột"
          className={value ? "text-zalo" : "text-muted/50 hover:text-zalo"}
        >
          <Icon name="filter" size={12} />
        </button>
      </span>

      {open &&
        pos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-50 w-52 rounded-xl border border-border bg-surface p-2 shadow-xl shadow-black/10"
              style={{ top: pos.top, left: pos.left }}
            >
              <input
                autoFocus
                className={inputCls}
                placeholder="Lọc…"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setOpen(false)}
              />
              {value && (
                <button
                  type="button"
                  className="mt-1 text-xs text-danger hover:underline"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  Xoá lọc
                </button>
              )}
            </div>
          </>,
          document.body,
        )}
    </th>
  );
}

export function Tr({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-border transition-colors last:border-0 ${
        onClick ? "cursor-pointer hover:bg-surface-hover" : ""
      } ${active ? "bg-zalo/10" : ""}`}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  align,
  className = "",
  colSpan,
}: {
  children?: ReactNode;
  align?: "right";
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`px-3 py-3 ${align === "right" ? "text-right" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

export function TableEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-3 py-10 text-center text-sm text-muted"
      >
        {children}
      </td>
    </tr>
  );
}

/** "Tổng cộng N bản ghi  < 1 2 3 … 53 >  10 / page" footer for client-side tables. */
export function Pagination({
  total,
  page,
  pageSize,
  onPage,
  onPageSize,
  totalText,
}: {
  totalText?: string;
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, pages);
  const nums = new Set([1, pages, cur - 1, cur, cur + 1]);
  const list = [...nums]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const btn =
    "inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-1 text-xs transition-colors";
  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-xs text-muted">
      <span>{totalText ?? `Tổng cộng ${total} bản ghi`}</span>
      <button
        type="button"
        disabled={cur <= 1}
        onClick={() => onPage(cur - 1)}
        className={`${btn} hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent`}
      >
        ‹
      </button>
      {list.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - list[i - 1] > 1 && <span>…</span>}
          <button
            type="button"
            onClick={() => onPage(n)}
            className={`${btn} ${
              n === cur
                ? "bg-zalo font-semibold text-white"
                : "hover:bg-surface-hover"
            }`}
          >
            {n}
          </button>
        </span>
      ))}
      <button
        type="button"
        disabled={cur >= pages}
        onClick={() => onPage(cur + 1)}
        className={`${btn} hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent`}
      >
        ›
      </button>
      <select
        value={pageSize}
        onChange={(e) => onPageSize(Number(e.target.value))}
        className="h-6 rounded-lg border border-border bg-surface px-1 text-xs text-foreground outline-none"
      >
        {[5, 10, 20, 50, 100].map((n) => (
          <option key={n} value={n}>
            {n} / page
          </option>
        ))}
      </select>
    </div>
  );
}
