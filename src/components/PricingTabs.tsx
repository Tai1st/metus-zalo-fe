"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Addon, Plan, PricePoint } from "@/lib/catalog";

const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";
const fmtK = (n: number) => Math.round(n / 1000).toLocaleString("vi-VN") + "K";
const priceOf = (prices: PricePoint[], months: number) =>
  prices.find((p) => p.months === months)?.price;

function Tick({ dark }: { dark?: boolean }) {
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${dark ? "bg-white/25 text-white" : "bg-[#dbe7ff] text-[#2563eb]"}`}
    >
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
        <path
          d="m5 10.5 3.2 3.2L15 7"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
      <path
        d="M4 10h12m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tiết kiệm so với mua liên tiếp chu kỳ ngắn nhất (vd. 4 lần gói 3 tháng = 12 tháng). */
function saving(prices: PricePoint[], shortest: number, months: number) {
  const base = priceOf(prices, shortest);
  const price = priceOf(prices, months);
  if (base === undefined || price === undefined || months === shortest)
    return { amount: 0, pct: 0 };
  const full = (base * months) / shortest;
  return {
    amount: full - price,
    pct: Math.round(((full - price) / full) * 100),
  };
}

export function PricingTabs({
  plans,
  addons,
}: {
  plans: Plan[];
  addons: Addon[];
}) {
  const periods = useMemo(
    () =>
      [...new Set(plans.flatMap((p) => p.prices.map((x) => x.months)))].sort(
        (a, b) => a - b,
      ),
    [plans],
  );
  const shortest = periods[0];
  const longest = periods[periods.length - 1];
  const [chosen, setChosen] = useState<number | null>(null);
  const months = chosen ?? longest;

  if (plans.length === 0) {
    return (
      <p className="mx-auto mt-10 max-w-md rounded-2xl bg-white/80 p-6 text-center text-sm text-[#667085]">
        Bảng giá đang được cập nhật. Vui lòng quay lại sau hoặc liên hệ để được
        báo giá.
      </p>
    );
  }

  const badge = saving(plans[0].prices, shortest, longest).pct;

  return (
    <div>
      <div className="mx-auto mt-9 flex w-fit gap-1 rounded-2xl border border-white bg-white p-1 shadow-sm">
        {periods.map((m) => {
          const active = months === m;
          return (
            <button
              key={m}
              onClick={() => setChosen(m)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-linear-to-r from-[#2563eb] to-[#1d3fae] text-white"
                  : "text-[#1f2a44] hover:bg-[#eef4fd]"
              }`}
            >
              {m} tháng
              {m === longest && badge > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-[#3b2a00]">
                  -{badge}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const price = priceOf(plan.prices, months);
          if (price === undefined) return null;
          const perMonth = Math.round(price / months / 1000) * 1000;
          const save = saving(plan.prices, shortest, months);
          const team = plan.maxUsers > 1;

          if (!plan.isPopular) {
            return (
              <div
                key={plan.id}
                className="rounded-4xl border border-white bg-white/95 p-9 shadow-xl shadow-blue-900/5"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef4ff] text-[#2563eb]">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#2563eb]">
                      {plan.tagline}
                    </div>
                    <div className="text-xl font-extrabold">{plan.name}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#667085]">
                  {plan.description}
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-5xl font-extrabold tracking-tight">
                    {fmt(price)}
                  </span>
                  <span className="pb-1.5 text-sm text-[#667085]">
                    /{months} tháng
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#667085]">
                  Tương đương {fmt(perMonth)}/tháng
                  {save.pct > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Tiết kiệm {save.pct}%
                    </span>
                  )}
                </div>
                <Link
                  href="#trial"
                  className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-[#0b1220] py-3.5 text-sm font-bold text-white"
                >
                  Bắt đầu ngay <Arrow />
                </Link>
                <div className="mt-6 border-t border-[#eef0f4] pt-5 text-[11px] font-bold uppercase tracking-wider text-[#98a2b3]">
                  Bao gồm
                </div>
                <ul className="mt-4 space-y-3 text-sm text-[#344054]">
                  {plan.features.map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <Tick />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          return (
            <div
              key={plan.id}
              className="rounded-4xl bg-linear-to-br from-[#1d4ed8] via-[#1e3fae] to-[#0b1220] p-9 text-white shadow-2xl shadow-blue-900/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
                    {team ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="9" cy="8" r="3.5" />
                        <path d="M2 20c0-3.5 3-5 7-5s7 1.5 7 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2.5.5 4 2 4 5" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-sky-200">
                      {plan.tagline}
                    </div>
                    <div className="text-xl font-extrabold">{plan.name}</div>
                  </div>
                </div>
                <span className="rounded-full border border-amber-300 bg-amber-400/90 px-3 py-1 text-[10px] font-extrabold uppercase text-[#3b2a00]">
                  ♛ Được lựa chọn nhiều nhất
                </span>
              </div>
              <p className="mt-4 text-sm text-white/80">{plan.description}</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-5xl font-extrabold tracking-tight">
                  {fmt(price)}
                </span>
                <span className="pb-1.5 text-sm text-white/70">
                  /{months} tháng
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-white/70">
                Tương đương {fmt(perMonth)}/tháng
                {save.amount > 0 && (
                  <span className="rounded-full bg-amber-300/90 px-2 py-0.5 text-[10px] font-semibold text-[#3b2a00]">
                    Tiết kiệm {fmtK(save.amount)}
                  </span>
                )}
              </div>
              <Link
                href="#trial"
                className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-[#2563eb]"
              >
                Bắt đầu ngay <Arrow />
              </Link>
              <div className="mt-6 border-t border-white/15 pt-5 text-[11px] font-bold uppercase tracking-wider text-white/60">
                Bao gồm
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                {plan.features.map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <Tick dark />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Team add-on */}
      {addons.length > 0 && (
        <div className="mt-8 rounded-4xl border border-white bg-white/95 p-9 shadow-xl shadow-blue-900/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="inline-block rounded-full bg-[#eef4ff] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2563eb]">
                ✦ Mua thêm tài khoản nhân sự
              </span>
              <h3 className="mt-3 text-2xl font-extrabold">
                Mở rộng team — linh hoạt theo nhu cầu
              </h3>
              <p className="mt-1 text-sm text-[#667085]">
                Chỉ áp dụng khi đã sở hữu gói Doanh nghiệp. Tài khoản nhân sự
                dùng độc lập, quản lý tập trung.
              </p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              Phân quyền & quản lý tập trung
            </span>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-[#eef0f4]">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="bg-[#f7f9fc] text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                  <th className="px-4 py-3 text-left">
                    Số lượng tài khoản nhân sự
                  </th>
                  {periods.map((m) => (
                    <th key={m} className="px-4 py-3">
                      Chu kỳ {m} tháng
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {addons.map((a) => (
                  <tr key={a.id} className="border-t border-[#eef0f4]">
                    <td className="px-4 py-5">
                      <span className="flex items-center gap-3 font-semibold">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eef4ff] text-xs font-bold text-[#2563eb]">
                          +{a.seats}
                        </span>
                        +{a.seats} tài khoản nhân sự
                      </span>
                    </td>
                    {periods.map((m) => {
                      const v = priceOf(a.prices, m);
                      return (
                        <td
                          key={m}
                          className="px-4 py-5 text-center font-extrabold"
                        >
                          {v === undefined ? "—" : fmt(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 text-xs text-[#667085] md:grid-cols-3">
            {[
              "Chỉ áp dụng khi đã có gói Doanh nghiệp",
              "Tài khoản nhân sự dùng độc lập trong hệ thống",
              "Quản lý & phân quyền tập trung trên tài khoản tổng",
            ].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="text-[#2563eb]">✓</span>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
