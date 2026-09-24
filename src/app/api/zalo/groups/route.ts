import type { NextRequest } from "next/server";
import { withAccount } from "@/server/zalo/http";
import type { ZaloGroup } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return withAccount(req, async (api) => {
    const all = await api.getAllGroups();
    const ids = Object.keys(all.gridVerMap ?? {});
    // getGroupInfo rejects large batches — chunk the lookup.
    const groups: ZaloGroup[] = [];
    for (let i = 0; i < ids.length; i += 40) {
      const info = await api.getGroupInfo(ids.slice(i, i + 40));
      groups.push(...Object.values(info.gridInfoMap ?? {}));
    }
    return groups;
  });
}
