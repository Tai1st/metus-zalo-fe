"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

const HASH = "#trial";
const ZALO_HREF = "https://zalo.me/0987533112";

const SCALES = [
  ["personal", "Cá nhân / Freelancer"],
  ["small", "Shop nhỏ (2–3 nhân sự)"],
  ["medium", "Doanh nghiệp vừa (4–10 nhân sự)"],
  ["large", "Doanh nghiệp lớn (trên 10 nhân sự)"],
];

const ic = (d: string) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

function Field({ label, icon, children, optional }: { label: string; icon: ReactNode; children: ReactNode; optional?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#0b1220]">
        {label} {optional ? <span className="font-normal text-[#8a97b1]">(không bắt buộc)</span> : <span className="text-red-500">*</span>}
      </span>
      <span className="flex items-center gap-3 rounded-2xl border border-[#e3e8f2] bg-white px-4 text-[#8a97b1] focus-within:border-[#2563eb] focus-within:ring-4 focus-within:ring-[#2563eb]/10">
        {icon}
        {children}
      </span>
    </label>
  );
}

export function LeadModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [scale, setScale] = useState("");
  const [referrer, setReferrer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const close = useCallback(() => {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    setOpen(false);
    setError("");
    setDone(false);
  }, []);

  useEffect(() => {
    const sync = () => setOpen(window.location.hash === HASH);
    sync();
    // Next <Link> đổi hash bằng history API nên không có hashchange — bắt click trực tiếp
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href="#trial"]');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      history.replaceState(null, "", HASH);
      setOpen(true);
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name, phone, scale, referrer }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setDone(true);
      setName("");
      setPhone("");
      setScale("");
      setReferrer("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const input = "h-13 w-full bg-transparent text-[15px] text-[#0b1220] outline-none placeholder:text-[#a3aec5]";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#050b1f]/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div role="dialog" aria-modal="true" className="w-full max-w-115 overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="relative bg-linear-to-br from-[#2f66e0] to-[#1d3fae] px-8 pb-7 pt-8 text-white">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-200">Dùng thử Metus Zalo</div>
          <h2 className="mt-2 pr-10 text-2xl font-extrabold leading-tight">Để lại thông tin, chúng tôi hỗ trợ ngay qua Zalo!</h2>
          <button onClick={close} aria-label="Đóng" className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-xl bg-white/20 hover:bg-white/30">
            {ic("M6 6l12 12M18 6 6 18")}
          </button>
        </div>

        {done ? (
          <div className="px-8 py-10 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">{ic("m5 12.5 4.5 4.5L19 7.5")}</span>
            <h3 className="mt-4 text-xl font-extrabold">Đã nhận thông tin của bạn!</h3>
            <p className="mt-2 text-sm text-[#5b6577]">Chúng tôi sẽ liên hệ qua Zalo trong thời gian sớm nhất.</p>
            <a href={ZALO_HREF} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-2xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white">
              Chat Zalo ngay
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 px-8 pb-7 pt-7">
            <Field label="Họ và tên" icon={ic("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-8 9c0-4 4-6 8-6s8 2 8 6")}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" maxLength={100} required className={input} />
            </Field>
            <Field label="Số điện thoại" icon={ic("M6 3h3l2 5-2 1a11 11 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2")}>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912 345 678" inputMode="tel" required className={input} />
            </Field>
            <Field label="Quy mô kinh doanh" icon={ic("M5 21V4h9v17M14 9h5v12M8 8h3M8 12h3M8 16h3")}>
              <select value={scale} onChange={(e) => setScale(e.target.value)} required className={`h-13 w-full bg-transparent text-[15px] outline-none ${scale ? "text-[#0b1220]" : "text-[#5b6577]"}`}>
                <option value="">-- Chọn quy mô --</option>
                {SCALES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Người giới thiệu" optional icon={ic("M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m7 9v-1a4 4 0 0 0-3-3.9M15 4.2a3.5 3.5 0 0 1 0 6.6")}>
              <input value={referrer} onChange={(e) => setReferrer(e.target.value)} placeholder="Tên hoặc SĐT người giới thiệu" maxLength={100} className={input} />
            </Field>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <button
              disabled={busy}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2563eb] to-[#1d3fae] text-sm font-bold text-white shadow-lg shadow-blue-600/30 disabled:opacity-60"
            >
              {busy ? "Đang gửi..." : "Dùng thử ngay"} {ic("M5 12h14m-6-6 6 6-6 6")}
            </button>
            <p className="text-center text-xs text-[#8a97b1]">Thông tin của bạn được bảo mật tuyệt đối.</p>
          </form>
        )}
      </div>
    </div>
  );
}
