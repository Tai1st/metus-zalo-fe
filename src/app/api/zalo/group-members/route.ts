import type { NextRequest } from "next/server";
import { fail, withAccount } from "@/server/zalo/http";
import {
  fetchGroupRoster,
  rosterMembers,
  type GroupMember,
} from "@/server/zalo/group-roster";

export const dynamic = "force-dynamic";

export type { GroupMember };
export type GroupMembersResult = { total: number; members: GroupMember[] };

/**
 * Members of one group the account belongs to. The full roster comes from the
 * older `getmg` endpoint (`memberIds`); `getmg-v2` truncates large groups, so
 * its `memVerList` is only a fallback.
 */
export function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get("groupId")?.trim();
  if (!groupId) return fail("Thiếu groupId");

  return withAccount(req, async (api, zaloId): Promise<GroupMembersResult> => {
    let rec = await fetchGroupRoster(api, groupId).catch(() => undefined);
    if (!rec?.memberIds?.length && !rec?.memVerList?.length) {
      const info = await api.getGroupInfo(groupId);
      rec = Object.values(info.gridInfoMap ?? {})[0] as typeof rec;
    }
    const members = await rosterMembers(api, zaloId, rec);
    return { total: Number(rec?.totalMember) || members.length, members };
  });
}
