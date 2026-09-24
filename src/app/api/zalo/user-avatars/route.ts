import type { NextRequest } from "next/server";
import { fail, withAccount } from "@/server/zalo/http";

export const dynamic = "force-dynamic";

export type UserAvatarInfo = { id: string; name: string; avatar: string };

/**
 * Name/avatar for a set of user ids — resolved lazily for whoever actually
 * sent a message we're rendering, instead of a group's whole (possibly
 * 900+ member) roster.
 */
export function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("ids")?.trim();
  if (!raw) return fail("Thiếu ids");
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(
    0,
    50,
  );
  if (ids.length === 0) return fail("Thiếu ids");

  return withAccount(req, async (api) => {
    const res = await api.getUserInfo(ids);
    const out: UserAvatarInfo[] = [];
    for (const id of ids) {
      const p = res.changed_profiles?.[id];
      if (p) {
        out.push({
          id,
          name: p.displayName || p.zaloName || id,
          avatar: p.avatar || "",
        });
      }
    }
    return out;
  });
}
