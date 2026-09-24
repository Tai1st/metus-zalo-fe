import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { getAccountLabelIds, setAccountLabels } from "@/server/zalo/labels";
import { requireZaloAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ zaloId: string }> },
) {
  const { zaloId } = await params;
  const access = await requireZaloAccess(req, zaloId);
  if (access.response) return access.response;
  return ok(await getAccountLabelIds(zaloId));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ zaloId: string }> },
) {
  const { zaloId } = await params;
  const access = await requireZaloAccess(req, zaloId);
  if (access.response) return access.response;
  let body: { labelIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const ids = Array.isArray(body.labelIds)
    ? body.labelIds.map(Number).filter((n) => Number.isInteger(n))
    : [];
  await setAccountLabels(zaloId, ids);
  return ok({ zaloId, labelIds: ids });
}
