import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import {
  deleteCampaign,
  getCampaign,
  listLogs,
  updateCampaign,
} from "@/server/zalo/campaigns";
import { campaignRunner } from "@/server/zalo/campaign-runner";
import {
  SESSION_COOKIE,
  allZaloAllowed,
  anyZaloAllowed,
  getSessionUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  const { id } = await params;
  const campaign = await getCampaign(Number(id));
  if (!campaign) return fail("Không tìm thấy yêu cầu", 404);
  if (!anyZaloAllowed(user, campaign.accountIds)) {
    return fail("Không tìm thấy yêu cầu", 404); // 404, not 403 — don't reveal it exists
  }
  return ok({
    campaign,
    logs: await listLogs(campaign.id),
    running: campaignRunner.isRunning(campaign.id),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  const { id } = await params;
  const cur = await getCampaign(Number(id));
  if (!cur) return fail("Không tìm thấy yêu cầu", 404);
  if (!anyZaloAllowed(user, cur.accountIds)) {
    return fail("Không tìm thấy yêu cầu", 404);
  }

  let body: {
    name?: string;
    config?: Record<string, unknown>;
    accountIds?: string[];
    targets?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const nextAccountIds = Array.isArray(body.accountIds)
    ? body.accountIds
    : undefined;
  if (nextAccountIds && !allZaloAllowed(user, nextAccountIds)) {
    return fail("Bạn không có quyền dùng một trong các tài khoản đã chọn", 403);
  }
  const updated = await updateCampaign(Number(id), {
    name: body.name,
    config: body.config as never,
    accountIds: nextAccountIds,
    targets: Array.isArray(body.targets)
      ? body.targets.map((t) => String(t).trim()).filter(Boolean)
      : undefined,
  });
  if (!updated) return fail("Không tìm thấy yêu cầu", 404);
  return ok(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  const { id } = await params;
  const cur = await getCampaign(Number(id));
  if (!cur) return fail("Không tìm thấy yêu cầu", 404);
  if (!anyZaloAllowed(user, cur.accountIds)) {
    return fail("Không tìm thấy yêu cầu", 404);
  }
  campaignRunner.stop(Number(id));
  await deleteCampaign(Number(id));
  return ok({ removed: Number(id) });
}
