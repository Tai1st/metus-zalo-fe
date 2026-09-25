import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { getCampaign, updateCampaignStatus } from "@/server/zalo/campaigns";
import { campaignRunner } from "@/server/zalo/campaign-runner";
import { SESSION_COOKIE, anyZaloAllowed, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  const { id } = await params;
  const campaignId = Number(id);
  const campaign = await getCampaign(campaignId);
  if (!campaign) return fail("Không tìm thấy yêu cầu", 404);
  if (!anyZaloAllowed(user, campaign.accountIds)) {
    return fail("Không tìm thấy yêu cầu", 404);
  }

  let body: { action?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }

  const MODES = ["restart", "resume", "resume_retry_failed"] as const;
  const mode = MODES.includes(body.mode as (typeof MODES)[number])
    ? (body.mode as (typeof MODES)[number])
    : "resume_retry_failed";

  switch (body.action) {
    case "start":
    case "resume":
      campaignRunner.start(campaignId, { mode });
      return ok({ status: "running", mode });
    case "stop":
      campaignRunner.stop(campaignId);
      await updateCampaignStatus(campaignId, "paused");
      return ok({ status: "paused" });
    // Dừng hẳn: không giữ cờ "đang tạm dừng, chờ tiếp tục" — về "draft" để
    // lần sau chạy lại người dùng tự chọn lại chế độ (tiếp tục/làm lại) như
    // với một yêu cầu chưa từng chạy.
    case "cancel":
      campaignRunner.stop(campaignId);
      await updateCampaignStatus(campaignId, "draft");
      return ok({ status: "draft" });
    default:
      return fail("Hành động không hợp lệ");
  }
}
