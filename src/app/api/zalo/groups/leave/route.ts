import type { NextRequest } from "next/server";
import { withAccount } from "@/server/zalo/http";

export const dynamic = "force-dynamic";

export type LeaveGroupResult = {
  groupId: string;
  ok: boolean;
  message: string;
};

/** Rời hàng loạt nhóm — mỗi nhóm gọi riêng để một lỗi không chặn các nhóm còn lại. */
export function POST(req: NextRequest) {
  return withAccount(req, async (api) => {
    let body: { groupIds?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new Error("Body không hợp lệ");
    }
    const groupIds = Array.isArray(body.groupIds)
      ? [...new Set(body.groupIds.map((id) => String(id)).filter(Boolean))]
      : [];
    if (groupIds.length === 0) throw new Error("Chưa chọn nhóm nào");

    const results: LeaveGroupResult[] = [];
    for (const groupId of groupIds) {
      try {
        await api.leaveGroup(groupId);
        results.push({ groupId, ok: true, message: "Đã rời nhóm" });
      } catch (err) {
        results.push({
          groupId,
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return results;
  });
}
