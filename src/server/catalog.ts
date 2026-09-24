import "server-only";
import { backendUrl } from "@/lib/auth";
import type { Addon, Plan } from "@/lib/catalog";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${backendUrl()}${path}`, {
    // Giá ít đổi: cache ngắn để trang chủ không gọi backend mỗi lượt xem.
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Gói cước + gói mua thêm đang bán. Backend lỗi → danh sách rỗng, trang vẫn dựng được. */
export async function getCatalog(): Promise<{
  plans: Plan[];
  addons: Addon[];
}> {
  try {
    const [plans, addons] = await Promise.all([
      get<Plan[]>("/plans"),
      get<Addon[]>("/addons"),
    ]);
    return { plans, addons };
  } catch {
    return { plans: [], addons: [] };
  }
}
