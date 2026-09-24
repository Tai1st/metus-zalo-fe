import "server-only";
import fs from "node:fs";
import path from "node:path";
import { ThreadType } from "zca-js";
import type {
  Campaign,
  CampaignConfig,
  MessageVariant,
  RunMode,
} from "@/lib/campaign";
import { getApiFor } from "./accounts";
import {
  addLog,
  bumpCampaignCounters,
  countSentSince,
  getCampaign,
  resetCampaignProgress,
  targetsWithOutcome,
  updateCampaignStatus,
} from "./campaigns";

export type RunOptions = {
  /** restart | resume | resume_retry_failed — from the "Bắt đầu ▾" picker. */
  mode?: RunMode;
  /** Legacy per-target skips (used by the scheduler); ignored when `mode` set. */
  skipFailed?: boolean;
  skipSucceeded?: boolean;
};

const EMOJIS = ["😀", "😍", "🥰", "👍", "🔥", "✨", "🎉", "💯", "😊", "🙌"];
const randEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
const randInt = (a: number, b: number) =>
  Math.floor(a + Math.random() * Math.max(0, b - a));
const pickRandom = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

/** Effective variant pool — falls back to legacy `content`. */
function variantPool(config: CampaignConfig): MessageVariant[] {
  const valid = (config.messageVariants ?? []).filter((v) =>
    v.dynamicEnabled ? v.template.trim() : v.text.trim(),
  );
  if (valid.length > 0) return valid;
  return [
    {
      text: config.content,
      dynamicEnabled: false,
      template: "",
      prefixes: [],
    },
  ];
}

/** Fill one variant for a recipient. */
function renderVariant(variant: MessageVariant, zaloName: string): string {
  if (!variant.dynamicEnabled) return variant.text;
  const prefix =
    variant.prefixes.length > 0 ? pickRandom(variant.prefixes) : "";
  return variant.template
    .replaceAll("{{zaloName}}", zaloName || "")
    .replaceAll("{{prefix}}", prefix)
    .trim();
}

class CampaignRunner {
  private active = new Map<number, { abort: boolean }>();

  isRunning(id: number): boolean {
    return this.active.has(id);
  }

  stop(id: number): void {
    const h = this.active.get(id);
    if (h) h.abort = true;
  }

  /** Fire-and-forget; progress is tracked via campaign status + logs. */
  start(id: number, opts: RunOptions = {}): void {
    if (this.active.has(id)) return;
    const handle = { abort: false };
    this.active.set(id, handle);
    void updateCampaignStatus(id, "running")
      .then(() => this.loop(id, handle, opts))
      .finally(() => this.active.delete(id));
  }

  private async sleep(
    seconds: number,
    handle: { abort: boolean },
  ): Promise<void> {
    const until = Date.now() + seconds * 1000;
    while (Date.now() < until) {
      if (handle.abort) return;
      await new Promise((r) =>
        setTimeout(r, Math.min(500, until - Date.now())),
      );
    }
  }

  private async resolveTargets(
    campaign: Campaign,
    handle: { abort: boolean },
  ): Promise<{ list: string[]; names: Map<string, string> }> {
    const names = new Map<string, string>();
    if (
      (campaign.kind !== "group_member" && campaign.kind !== "group_link") ||
      campaign.config.action === "join_group"
    ) {
      return { list: campaign.targets, names };
    }

    const uids = new Set<string>();
    const api = await getApiFor(campaign.accountIds[0]);
    for (const link of campaign.targets) {
      if (handle.abort) break;
      // Members picked straight from the table are plain user ids.
      if (/^\d+$/.test(link)) {
        uids.add(link);
        continue;
      }
      try {
        const info = await api.getGroupLinkInfo({ link });
        for (const m of info.currentMems ?? []) {
          uids.add(m.id);
          if (m.dName) names.set(m.id, m.dName);
        }
      } catch (err) {
        await addLog({
          campaignId: campaign.id,
          target: link,
          accountId: campaign.accountIds[0],
          ok: false,
          message: `Không đọc được nhóm: ${(err as Error).message}`,
        });
      }
    }
    return { list: [...uids], names };
  }

  private async loop(
    id: number,
    handle: { abort: boolean },
    opts: RunOptions = {},
  ): Promise<void> {
    const campaign = await getCampaign(id);
    if (!campaign) return;
    const { config } = campaign;

    let skipSet: Set<string>;
    if (opts.mode === "restart") {
      await resetCampaignProgress(id);
      skipSet = new Set();
    } else if (opts.mode === "resume") {
      const [succeeded, failed] = await Promise.all([
        targetsWithOutcome(id, true),
        targetsWithOutcome(id, false),
      ]);
      skipSet = new Set<string>([...succeeded, ...failed]);
    } else if (opts.mode === "resume_retry_failed") {
      skipSet = await targetsWithOutcome(id, true);
    } else {
      const [failed, succeeded] = await Promise.all([
        opts.skipFailed ? targetsWithOutcome(id, false) : Promise.resolve([]),
        opts.skipSucceeded ? targetsWithOutcome(id, true) : Promise.resolve([]),
      ]);
      skipSet = new Set<string>([...failed, ...succeeded]);
    }

    if (campaign.accountIds.length === 0) {
      await updateCampaignStatus(id, "error");
      await addLog({
        campaignId: id,
        target: "-",
        accountId: "",
        ok: false,
        message: "Chưa chọn tài khoản gửi",
      });
      return;
    }

    if (config.action === "invite_group_member" && !config.inviteGroupId) {
      await updateCampaignStatus(id, "error");
      await addLog({
        campaignId: id,
        target: "-",
        accountId: "",
        ok: false,
        message: "Chưa chọn nhóm đích",
      });
      return;
    }

    let targets: string[];
    let names = new Map<string, string>();
    try {
      const resolved = await this.resolveTargets(campaign, handle);
      targets = resolved.list;
      names = resolved.names;
    } catch (err) {
      await updateCampaignStatus(id, "error");
      await addLog({
        campaignId: id,
        target: "-",
        accountId: "",
        ok: false,
        message: `Lỗi lấy danh sách: ${(err as Error).message}`,
      });
      return;
    }

    if (config.dedupeTargets) targets = [...new Set(targets)];

    // So sánh trước với thành viên hiện có của nhóm đích — tránh gọi mời lại
    // người đã ở trong nhóm (best-effort: một lỗi ở bước này không chặn chạy).
    let existingGroupMembers: Set<string> | null = null;
    if (config.action === "invite_group_member" && config.inviteGroupId) {
      try {
        const api = await getApiFor(campaign.accountIds[0]);
        const info = await api.getGroupInfo(config.inviteGroupId);
        existingGroupMembers = new Set(
          info.gridInfoMap[config.inviteGroupId]?.memberIds ?? [],
        );
      } catch {
        /* không lấy được danh sách — vẫn chạy, để Zalo tự báo lỗi nếu trùng */
      }
    }

    const pool = variantPool(config);
    const attachAbs = (config.attachments ?? [])
      .map((p) => path.join(process.cwd(), "data", p))
      .filter((p) => fs.existsSync(p));
    let accountIdx = 0;
    let consecutiveErrors = 0;
    let successStreak = 0;

    for (const target of targets) {
      if (handle.abort) {
        await updateCampaignStatus(id, "paused");
        return;
      }
      if (skipSet.has(target)) continue;

      const windowStart = new Date(
        Date.now() - (config.dailyLimitUnit === "hour" ? 3600e3 : 86400e3),
      ).toISOString();
      if ((await countSentSince(id, windowStart)) >= config.dailyLimit) {
        await updateCampaignStatus(id, "paused");
        await addLog({
          campaignId: id,
          target,
          accountId: "",
          ok: false,
          message: `Đã đạt giới hạn ${config.dailyLimit}/${config.dailyLimitUnit === "hour" ? "giờ" : "ngày"}`,
        });
        return;
      }

      const accountId = campaign.accountIds[accountIdx];
      let ok = false;
      let message = "";

      try {
        const api = await getApiFor(accountId);

        let uid = target;
        let zaloName = names.get(target) ?? "";
        if (campaign.kind === "phone") {
          const user = await api.findUser(target);
          uid = user.uid;
          zaloName = user.display_name || zaloName;
        }

        const action = config.action ?? "message";
        if (action === "message_group") {
          const rendered = renderVariant(pickRandom(pool), "");
          const body = config.autoEmoji
            ? `${rendered} ${randEmoji()}`
            : rendered;
          if (attachAbs.length > 0) {
            await api.sendMessage(
              { msg: body, attachments: attachAbs },
              target,
              ThreadType.Group,
            );
          } else {
            await api.sendMessage(body, target, ThreadType.Group);
          }
          ok = true;
          message = "Đã gửi";
        } else if (action === "add_friend") {
          const greeting = pool.length
            ? renderVariant(pickRandom(pool), zaloName)
            : "Xin chào, kết bạn nhé!";
          const text = config.autoEmoji
            ? `${greeting} ${randEmoji()}`
            : greeting;
          await api.sendFriendRequest(text, uid);
          ok = true;
          message = "Đã gửi lời mời kết bạn";
        } else if (action === "join_group") {
          await api.joinGroupLink(target);
          ok = true;
          message = "Đã gửi yêu cầu tham gia nhóm";
        } else if (action === "revoke_friend") {
          await api.undoFriendRequest(uid);
          ok = true;
          message = "Đã thu hồi lời mời kết bạn";
        } else if (action === "delete_friend") {
          await api.removeFriend(uid);
          ok = true;
          message = "Đã xóa bạn";
        } else if (action === "invite_group_member") {
          if (existingGroupMembers?.has(uid)) {
            ok = true;
            message = "Đã có trong nhóm, bỏ qua";
          } else {
            const res = await api.addUserToGroup(uid, config.inviteGroupId);
            ok = !(res.errorMembers ?? []).includes(uid);
            message = ok
              ? "Đã mời vào nhóm"
              : (res.error_data?.[uid]?.[0] ?? "Mời vào nhóm thất bại");
          }
        } else {
          if (config.autoAddFriend && campaign.kind !== "friend") {
            try {
              await api.sendFriendRequest("Xin chào, kết bạn nhé!", uid);
            } catch {
              /* already friends or rejected — continue */
            }
          }

          const rendered = renderVariant(pickRandom(pool), zaloName);
          const body = config.autoEmoji
            ? `${rendered} ${randEmoji()}`
            : rendered;
          if (attachAbs.length > 0) {
            await api.sendMessage(
              { msg: body, attachments: attachAbs },
              uid,
              ThreadType.User,
            );
          } else {
            await api.sendMessage(body, uid, ThreadType.User);
          }
          ok = true;
          message = "Đã gửi";
        }
      } catch (err) {
        message = (err as Error).message;
      }

      await addLog({ campaignId: id, target, accountId, ok, message });
      await bumpCampaignCounters(id, ok);

      if (ok) {
        consecutiveErrors = 0;
        successStreak += 1;
        if (
          config.stopAfterSuccess > 0 &&
          successStreak % config.stopAfterSuccess === 0
        ) {
          await this.sleep(config.stopAfterSuccessPause, handle);
        }
      } else {
        consecutiveErrors += 1;
        if (
          consecutiveErrors >= config.switchAccountOnError &&
          campaign.accountIds.length > 1
        ) {
          accountIdx = (accountIdx + 1) % campaign.accountIds.length;
          consecutiveErrors = 0;
        }
      }

      // "Chia đều": rotate to the next account after every message.
      if (config.distributeEvenly && campaign.accountIds.length > 1) {
        accountIdx = (accountIdx + 1) % campaign.accountIds.length;
      }

      await this.sleep(randInt(config.pauseFrom, config.pauseTo), handle);
    }

    await updateCampaignStatus(id, handle.abort ? "paused" : "done");
  }
}

const globalRef = globalThis as unknown as { __zaloRunner?: CampaignRunner };
export const campaignRunner: CampaignRunner =
  globalRef.__zaloRunner ?? (globalRef.__zaloRunner = new CampaignRunner());
