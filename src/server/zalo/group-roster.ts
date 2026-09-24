import "server-only";
import type { API } from "zca-js";

/** Raw group record from Zalo's older `getmg` endpoint, which (unlike
 * `getmg-v2`) includes the full `memberIds` roster. */
export type GroupRosterRecord = {
  type?: number;
  creatorId?: string;
  adminIds?: string[];
  memberIds?: string[];
  memVerList?: string[];
  totalMember?: number;
  name?: string;
  [key: string]: unknown;
};

type RosterApi = {
  getGroupRoster: (p: { groupId: string; base: string }) => Promise<unknown>;
  zpwServiceMap: { group: string[] };
};

export async function fetchGroupRoster(
  api: API,
  groupId: string,
): Promise<GroupRosterRecord | undefined> {
  // api.custom defines a read-only property, so register it once per API.
  if (!("getGroupRoster" in api)) {
    api.custom("getGroupRoster", async ({ ctx, utils, props }) => {
      const { groupId: gid, base } = props as { groupId: string; base: string };
      const url = utils.makeURL(`${base}/api/group/getmg`);
      const params = utils.encodeAES(
        JSON.stringify({
          grids: [gid],
          avatar_size: 120,
          member_avatar_size: 120,
          imei: ctx.imei,
        }),
      );
      if (!params) throw new Error("Không mã hóa được yêu cầu");
      const res = await utils.request(url, {
        method: "POST",
        body: new URLSearchParams({ params }),
      });
      return utils.resolve(res);
    });
  }
  const ra = api as unknown as RosterApi;
  const data = (await ra.getGroupRoster({
    groupId,
    base: ra.zpwServiceMap.group[0],
  })) as {
    gridInfoMap?: Record<string, GroupRosterRecord>;
    [id: string]: unknown;
  };
  return data?.gridInfoMap?.[groupId] ?? (data?.[groupId] as GroupRosterRecord);
}

const ROLE_RANK = { owner: 0, admin: 1, member: 2 } as const;

/** Trưởng nhóm → phó nhóm → thành viên (stable within each role). */
export function sortByRole<T extends { role: keyof typeof ROLE_RANK }>(
  list: T[],
): T[] {
  return [...list].sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role]);
}

export type GroupMember = {
  id: string;
  name: string;
  avatar: string;
  role: "owner" | "admin" | "member";
};

/** Resolve a roster record's member ids into named profiles (self excluded). */
export async function rosterMembers(
  api: API,
  selfId: string,
  rec: GroupRosterRecord | undefined,
): Promise<GroupMember[]> {
  const admins = new Set<string>(rec?.adminIds ?? []);
  const raw = rec?.memberIds?.length ? rec.memberIds : (rec?.memVerList ?? []);
  const ids = [
    ...new Set(raw.map((v) => v.split("_")[0]).filter(Boolean)),
  ].filter((id) => id !== selfId);

  const members: GroupMember[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const res = await api.getGroupMembersInfo(ids.slice(i, i + 100));
    for (const prof of Object.values(res.profiles ?? {})) {
      const id = String(prof.id);
      members.push({
        id,
        name: prof.displayName || prof.zaloName || id,
        avatar: prof.avatar ?? "",
        role:
          id === rec?.creatorId ? "owner" : admins.has(id) ? "admin" : "member",
      });
    }
  }
  return sortByRole(members);
}
