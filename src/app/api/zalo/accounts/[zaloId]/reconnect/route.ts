import type { NextRequest } from "next/server";
import { ok } from "@/server/zalo/http";
import { reconnectAccount } from "@/server/zalo/accounts";
import { requireZaloAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ zaloId: string }> },
) {
  const { zaloId } = await params;
  const access = await requireZaloAccess(req, zaloId);
  if (access.response) return access.response;
  const connected = await reconnectAccount(zaloId);
  return ok({ zaloId, connected });
}
