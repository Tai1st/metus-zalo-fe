import type { NextRequest } from "next/server";
import { FriendRecommendationsType } from "zca-js";
import { withAccount } from "@/server/zalo/http";
import { recordFriendRequest } from "@/server/zalo/friend-requests";

export const dynamic = "force-dynamic";

/**
 * "Tải danh sách lời mời kết bạn" — zca-js không có API liệt kê lại lịch sử
 * lời mời đã nhận, NHƯNG `getFriendRecommendations()` (gợi ý kết bạn) trả về
 * cả các lời mời đã nhận, đánh dấu `recommType: ReceivedFriendRequest`. Lọc
 * đúng loại đó rồi ghi lại như một sự kiện thật (giống listener real-time).
 */
export async function POST(req: NextRequest) {
  return withAccount(req, async (api, zaloId) => {
    const res = await api.getFriendRecommendations();
    const received = (res.recommItems ?? []).filter(
      (it) =>
        it.dataInfo?.recommType === FriendRecommendationsType.ReceivedFriendRequest,
    );
    for (const it of received) {
      const d = it.dataInfo;
      const receivedAt =
        d.recommTime && Number.isFinite(d.recommTime)
          ? new Date(d.recommTime).toISOString()
          : undefined;
      await recordFriendRequest({
        accountId: zaloId,
        fromUid: d.userId,
        fromName: d.displayName || d.zaloName || "",
        fromAvatar: d.avatar || "",
        message: d.recommInfo?.message || d.recommInfo?.customText || "",
        receivedAt,
      });
    }
    return { pulled: received.length };
  });
}
