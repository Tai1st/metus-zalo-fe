"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { BrandMark } from "@/components/BrandMark";
import { NotificationsBell } from "@/components/NotificationsBell";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { useApi } from "@/hooks/useApi";
import { Toaster } from "@/components/Toaster";

type Leaf = { label: string; href: string; icon?: IconName };
type Group = {
  label: string;
  icon?: IconName;
  children: Item[];
  defaultOpen?: boolean;
};
type Item = Leaf | Group;

/** Đường dẫn chỉ leader (khách chủ tài khoản) thấy trong menu — nhân sự vẫn dùng
 * phần còn lại đầy đủ như leader (dữ liệu Zalo đã tự lọc theo tài khoản được cấp ở API). */
const LEADER_ONLY_HREFS = new Set(["/accounts/access"]);

function filterNavForRole(items: Item[], isLeader: boolean): Item[] {
  if (isLeader) return items;
  return items
    .filter((item) => !("href" in item) || !LEADER_ONLY_HREFS.has(item.href))
    .map((item) =>
      isGroup(item)
        ? { ...item, children: filterNavForRole(item.children, isLeader) }
        : item,
    );
}

const NAV: Item[] = [
  { label: "Quản lý proxy", href: "/proxies", icon: "globe" },
  {
    label: "Zalo",
    icon: "chat",
    defaultOpen: true,
    children: [
      {
        label: "Tài khoản Zalo",
        icon: "user",
        defaultOpen: true,
        children: [
          { label: "Danh sách tài khoản", href: "/accounts", icon: "list" },
          { label: "Quản lý truy cập", href: "/accounts/access", icon: "key" },
          { label: "Quản lý nhãn", href: "/accounts/labels", icon: "tag" },
        ],
      },
      {
        label: "Chat",
        icon: "chat",
        children: [
          { label: "Tổng quan", href: "/chat", icon: "dashboard" },
          { label: "Quản lý nhãn", href: "/chat/labels", icon: "tag" },
        ],
      },
      { label: "Lịch trình", href: "/schedule", icon: "calendar" },
      {
        label: "Nhắn tin",
        icon: "send",
        defaultOpen: true,
        children: [
          {
            label: "Theo số điện thoại",
            href: "/campaigns?kind=phone&action=message",
            icon: "phone",
          },
          {
            label: "Theo bạn bè",
            href: "/campaigns?kind=friend&action=message",
            icon: "user",
          },
          {
            label: "Theo thành viên nhóm",
            href: "/campaigns?kind=group_member&action=message",
            icon: "users",
          },
          {
            label: "Theo thành viên nhóm khác (kể cả nhóm ẩn)",
            href: "/campaigns?kind=group_link&action=message",
            icon: "users",
          },
        ],
      },
      {
        label: "Kết bạn",
        icon: "userPlus",
        defaultOpen: true,
        children: [
          {
            label: "Theo số điện thoại",
            href: "/campaigns?kind=phone&action=add_friend",
            icon: "phone",
          },
          {
            label: "Theo thành viên nhóm",
            href: "/campaigns?kind=group_member&action=add_friend",
            icon: "users",
          },
          {
            label: "Theo thành viên nhóm khác (kể cả nhóm ẩn)",
            href: "/campaigns?kind=group_link&action=add_friend",
            icon: "user",
          },
          {
            label: "Từ file backup",
            href: "/campaigns?kind=backup_file&action=add_friend",
            icon: "cloud",
          },
          {
            label: "Thu hồi kết bạn",
            href: "/campaigns?kind=sent_request&action=revoke_friend",
            icon: "refresh",
          },
          {
            label: "Xóa bạn",
            href: "/campaigns?kind=friend&action=delete_friend",
            icon: "trash",
          },
        ],
      },
      {
        label: "Nhóm",
        icon: "users",
        defaultOpen: true,
        children: [
          { label: "Danh sách nhóm", href: "/groups", icon: "list" },
          {
            label: "Tham gia nhóm",
            href: "/campaigns?kind=group_link&action=join_group",
            icon: "plus",
          },
          {
            label: "Nhắn tin nhóm",
            href: "/campaigns?kind=group&action=message_group",
            icon: "chat",
          },
          {
            label: "Mời SDT vào nhóm",
            href: "/campaigns?kind=phone&action=invite_group_member",
            icon: "phone",
          },
          {
            label: "Mời bạn bè vào nhóm",
            href: "/campaigns?kind=friend&action=invite_group_member",
            icon: "send",
          },
          {
            label: "Mời thành viên nhóm đã tham gia vào nhóm (kể cả nhóm ẩn)",
            href: "/campaigns?kind=group_member&action=invite_group_member",
            icon: "user",
          },
          {
            label: "Mời thành viên nhóm khác vào nhóm",
            href: "/campaigns?kind=group_link&action=invite_group_member",
            icon: "user",
          },
          { label: "Rời nhóm", href: "/groups/leave", icon: "arrowLeft" },
        ],
      },
      {
        label: "Danh sách lời mời kết bạn",
        href: "/friend-invites",
        icon: "mail",
      },
      { label: "Backup bạn bè", href: "/backup-friends", icon: "cloud" },
    ],
  },
];

const isGroup = (item: Item): item is Group => "children" in item;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  // Đổi trang trên mobile thì tự đóng drawer lại. (Không đọc useSearchParams
  // ở đây — AppShell bọc toàn bộ layout, không nằm trong <Suspense>.)
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (pathname === "/" || pathname === "/login") return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col">
      <Toaster />
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 bg-linear-to-r from-zalo to-zalo-dark px-3 text-white shadow-md shadow-zalo/15 sm:h-16 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="Mở menu"
            className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-white/15 lg:hidden"
          >
            <Icon name="menu" size={20} />
          </button>
          <BrandMark
            size={34}
            className="shrink-0 shadow-sm ring-1 ring-white/40"
          />
          <span className="hidden truncate text-base font-bold tracking-tight sm:inline">
            Metus Zalo
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <PlanBadge />
          <NotificationsBell />
          <div className="mx-1 h-6 w-px bg-white/20 sm:mx-1.5" />
          <HeaderUser />
        </div>
      </header>

      <div className="flex flex-1">
        {navOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setNavOpen(false)}
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto border-r border-border bg-surface px-2.5 py-4 transition-transform duration-200 lg:static lg:top-0 lg:z-auto lg:translate-x-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Suspense fallback={<nav className="flex flex-col gap-1" />}>
            <SidebarNav />
          </Suspense>
        </aside>

        <main className="min-w-0 flex-1 bg-background p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function PlanBadge() {
  const { data } = useApi<{ planName: string; expiresAt: string | null } | null>(
    "/api/subscription",
  );
  if (!data) return null;
  const days = data.expiresAt
    ? Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / 86_400_000)
    : null;
  const urgent = days !== null && days <= 7;
  return (
    <span
      className={`mr-1 hidden max-w-64 truncate text-xs font-semibold sm:inline sm:text-sm ${
        urgent ? "text-red-200" : "text-yellow-200"
      }`}
      title={
        data.expiresAt
          ? `Hết hạn ${new Date(data.expiresAt).toLocaleDateString("vi-VN")}`
          : undefined
      }
    >
      Gói {data.planName}
      {days !== null &&
        (days > 0 ? ` · còn ${days} ngày` : " · đã hết hạn")}
    </span>
  );
}

function HeaderUser() {
  const { data } = useApi<{ fullName: string; username: string }>(
    "/api/auth/me",
  );
  const [open, setOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const name = data?.fullName || data?.username || "";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2 text-sm transition-colors hover:bg-white/15 sm:pr-2.5"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/20 text-xs font-semibold ring-1 ring-white/30">
          {name.trim().charAt(0).toUpperCase() || "M"}
        </span>
        <span className="hidden max-w-32 truncate font-medium sm:inline">
          {name}
        </span>
        <Icon
          name="chevronDown"
          size={13}
          className={`hidden shrink-0 text-white/70 transition-transform sm:block ${open ? "" : "-rotate-90"}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-surface py-1.5 text-foreground shadow-2xl shadow-black/20">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setChangingPassword(true);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-surface-hover"
          >
            <Icon name="key" size={15} className="text-muted" />
            Đổi mật khẩu
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-danger hover:bg-danger/5"
          >
            <Icon name="logout" size={15} />
            Đăng xuất
          </button>
        </div>
      )}

      {changingPassword && (
        <ChangePasswordModal onClose={() => setChangingPassword(false)} />
      )}
    </div>
  );
}

function SidebarNav() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { data } = useApi<{ role: string }>("/api/auth/me");
  // Chỉ ẩn "Quản lý truy cập" khi đã BIẾT chắc là nhân sự — tránh nháy
  // menu đầy đủ→rút gọn khi đang tải; chặn thật vẫn ở proxy.ts.
  const nav = filterNavForRole(NAV, !data || data.role !== "staff");
  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => (
        <NavNode
          key={item.label}
          item={item}
          pathname={pathname}
          search={search}
          depth={0}
        />
      ))}
    </nav>
  );
}

function pathActive(href: string, pathname: string, search: string): boolean {
  const [base, q] = href.split("?");
  if (base === "/") return pathname === "/" && !search;
  if (pathname !== base) return false;
  if (q) {
    const want = new URLSearchParams(q);
    const have = new URLSearchParams(search);
    for (const [k, v] of want) if (have.get(k) !== v) return false;
    return true;
  }
  return !search;
}

function groupContainsActive(
  group: Group,
  pathname: string,
  search: string,
): boolean {
  return group.children.some((c) =>
    isGroup(c)
      ? groupContainsActive(c, pathname, search)
      : pathActive(c.href, pathname, search),
  );
}

function NavNode({
  item,
  pathname,
  search,
  depth,
}: {
  item: Item;
  pathname: string;
  search: string;
  depth: number;
}) {
  if (isGroup(item)) {
    return (
      <NavGroupNode
        group={item}
        pathname={pathname}
        search={search}
        depth={depth}
      />
    );
  }
  const active = pathActive(item.href, pathname, search);
  return (
    <Link
      href={item.href}
      style={{ paddingLeft: 10 + depth * 16 }}
      className={`flex items-center gap-2.5 rounded-xl py-2 pr-3 text-sm transition-colors ${
        active
          ? "bg-zalo font-medium text-white shadow-sm shadow-zalo/30"
          : "text-foreground hover:bg-surface-hover"
      }`}
    >
      {item.icon ? (
        <Icon
          name={item.icon}
          size={16}
          className={`shrink-0 ${active ? "text-white" : "text-muted"}`}
        />
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavGroupNode({
  group,
  pathname,
  search,
  depth,
}: {
  group: Group;
  pathname: string;
  search: string;
  depth: number;
}) {
  const [open, setOpen] = useState(
    Boolean(group.defaultOpen) || groupContainsActive(group, pathname, search),
  );
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: 10 + depth * 16 }}
        className="flex w-full items-center gap-2.5 rounded-xl py-2 pr-3 text-sm font-medium text-foreground hover:bg-surface-hover"
      >
        {group.icon ? (
          <Icon name={group.icon} size={16} className="shrink-0 text-muted" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="flex-1 truncate text-left">{group.label}</span>
        <Icon
          name="chevronDown"
          size={13}
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <div className="flex flex-col">
          {group.children.map((c) => (
            <NavNode
              key={c.label}
              item={c}
              pathname={pathname}
              search={search}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
