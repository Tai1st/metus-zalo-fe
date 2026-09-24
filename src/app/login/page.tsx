"use client";

import Link from "next/link";
import { useState, type SyntheticEvent } from "react";
import { BrandMark } from "@/components/BrandMark";
import { PasswordInput } from "@/components/ui";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      const next = new URLSearchParams(window.location.search).get("next");
      // chỉ cho chuyển hướng nội bộ
      window.location.href =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/accounts";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại",
      );
      setBusy(false);
    }
  }

  const input =
    "h-12 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-zalo focus:ring-4 focus:ring-zalo/10";

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 shadow-xl shadow-zalo/10">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark size={40} />
          <span className="text-lg font-extrabold">Metus Zalo</span>
        </Link>
        <h1 className="mt-6 text-2xl font-extrabold">Đăng nhập</h1>
        <p className="mt-1 text-sm text-muted">
          Đăng nhập để quản lý tài khoản Zalo của bạn.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              Tên đăng nhập
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              required
              className={input}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Mật khẩu</span>
            <PasswordInput
              inputClassName={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <button
            disabled={busy}
            className="h-12 w-full rounded-xl bg-zalo text-sm font-bold text-white shadow-lg shadow-zalo/30 hover:bg-zalo-dark disabled:opacity-60"
          >
            {busy ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <Link
          href="/"
          className="mt-5 block text-center text-sm text-muted hover:text-foreground"
        >
          ← Về trang chủ
        </Link>
      </div>
    </div>
  );
}
