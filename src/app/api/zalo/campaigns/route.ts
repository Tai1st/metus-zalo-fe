import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { createCampaign, listCampaigns } from "@/server/zalo/campaigns";
import {
  SESSION_COOKIE,
  allZaloAllowed,
  anyZaloAllowed,
  getSessionUser,
} from "@/lib/auth";
import type { CampaignKind } from "@/lib/campaign";

export const dynamic = "force-dynamic";

const KINDS: CampaignKind[] = [
  "phone",
  "friend",
  "group_member",
  "group_link",
  "sent_request",
  "group",
  "backup_file",
];

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  const all = await listCampaigns();
  if (user.role === "admin") return ok(all);
  return ok(all.filter((c) => anyZaloAllowed(user, c.accountIds)));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);

  let body: {
    name?: string;
    kind?: string;
    config?: Record<string, unknown>;
    accountIds?: string[];
    targets?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }

  const name = body.name?.trim();
  if (!name) return fail("Thiếu tên yêu cầu");
  if (!body.kind || !KINDS.includes(body.kind as CampaignKind)) {
    return fail("Loại yêu cầu không hợp lệ");
  }
  const accountIds = Array.isArray(body.accountIds) ? body.accountIds : [];
  const targets = Array.isArray(body.targets)
    ? body.targets.map((t) => String(t).trim()).filter(Boolean)
    : [];
  if (accountIds.length === 0) return fail("Chưa chọn tài khoản gửi");
  if (targets.length === 0) return fail("Chưa có mục tiêu nào");
  if (!allZaloAllowed(user, accountIds)) {
    return fail("Bạn không có quyền dùng một trong các tài khoản đã chọn", 403);
  }

  const campaign = await createCampaign({
    name,
    kind: body.kind as CampaignKind,
    config: (body.config ?? {}) as never,
    accountIds,
    targets,
    createdBy: user.id,
  });
  return ok(campaign, { status: 201 });
}
