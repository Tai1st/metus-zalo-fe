import type { NextRequest } from "next/server";
import { fail, withAccount } from "@/server/zalo/http";

export const dynamic = "force-dynamic";

export type StickerInfo = { id: number; url: string };

/** Sticker catalog id → image URL, resolved lazily for stickers seen in chat. */
export function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("ids")?.trim();
  if (!raw) return fail("Thiếu ids");
  const ids = [
    ...new Set(
      raw
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ].slice(0, 50);
  if (ids.length === 0) return fail("Thiếu ids");

  return withAccount(req, async (api) => {
    const details = await api.getStickersDetail(ids);
    return details.map(
      (d): StickerInfo => ({
        id: d.id,
        url: d.stickerWebpUrl || d.stickerUrl,
      }),
    );
  });
}
