import type { NextRequest } from "next/server";
import { withAccount } from "@/server/zalo/http";
import {
  listFriendRequests,
  removeFriendRequest,
  setFriendRequestStatus,
} from "@/server/zalo/friend-requests";

export const dynamic = "force-dynamic";

/** Chấp nhận / từ chối một lời mời kết bạn đến. Body: `{ action: "accept" | "reject" }`. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withAccount(req, async (api, zaloId) => {
    let body: { action?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new Error("Body không hợp lệ");
    }
    const row = (await listFriendRequests(zaloId)).find(
      (r) => r.id === Number(id),
    );
    if (!row) throw new Error("Không tìm thấy lời mời kết bạn");

    if (body.action === "accept") {
      await api.acceptFriendRequest(row.fromUid);
      await setFriendRequestStatus(row.id, "accepted");
      return { id: row.id, status: "accepted" };
    }
    if (body.action === "reject") {
      await api.rejectFriendRequest(row.fromUid);
      await setFriendRequestStatus(row.id, "rejected");
      return { id: row.id, status: "rejected" };
    }
    throw new Error("action không hợp lệ");
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withAccount(req, async (_api, zaloId) => {
    const row = (await listFriendRequests(zaloId)).find(
      (r) => r.id === Number(id),
    );
    if (!row) throw new Error("Không tìm thấy lời mời kết bạn");
    await removeFriendRequest(row.id);
    return { removed: row.id };
  });
}
