import "server-only";
import { be } from "./be-client";
import {
  type Campaign,
  type CampaignConfig,
  type CampaignKind,
  type CampaignLog,
  type CampaignStatus,
  DEFAULT_CONFIG,
} from "@/lib/campaign";

type CampaignRow = {
  id: number;
  name: string;
  kind: CampaignKind;
  status: CampaignStatus;
  config: string;
  accountIds: string[];
  targets: string[];
  sentOk: number;
  sentFail: number;
  createdAt: string;
  updatedAt: string;
};

function rowToCampaign(r: CampaignRow): Campaign {
  const raw = JSON.parse(r.config) as Partial<CampaignConfig> & {
    attachmentPath?: string;
  };
  // migrate single attachmentPath → attachments[]
  if ((!raw.attachments || raw.attachments.length === 0) && raw.attachmentPath) {
    raw.attachments = [raw.attachmentPath];
  }
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    status: r.status,
    config: { ...DEFAULT_CONFIG, ...raw },
    accountIds: r.accountIds,
    targets: r.targets,
    sentOk: r.sentOk,
    sentFail: r.sentFail,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const rows = await be<CampaignRow[]>("", undefined, "/campaigns");
  return rows.map(rowToCampaign);
}

export async function getCampaign(id: number): Promise<Campaign | undefined> {
  const row = await be<CampaignRow | null>(`/${id}`, undefined, "/campaigns");
  return row ? rowToCampaign(row) : undefined;
}

export async function createCampaign(input: {
  name: string;
  kind: CampaignKind;
  config: Partial<CampaignConfig>;
  accountIds: string[];
  targets: string[];
}): Promise<Campaign> {
  const row = await be<CampaignRow>(
    "",
    {
      method: "POST",
      body: {
        name: input.name,
        kind: input.kind,
        config: JSON.stringify({ ...DEFAULT_CONFIG, ...input.config }),
        accountIds: input.accountIds,
        targets: input.targets,
      },
    },
    "/campaigns",
  );
  return rowToCampaign(row);
}

export async function updateCampaign(
  id: number,
  input: {
    name?: string;
    config?: Partial<CampaignConfig>;
    accountIds?: string[];
    targets?: string[];
  },
): Promise<Campaign | undefined> {
  const cur = await getCampaign(id);
  if (!cur) return undefined;
  const row = await be<CampaignRow>(
    `/${id}`,
    {
      method: "PATCH",
      body: {
        name: input.name?.trim() || cur.name,
        config: JSON.stringify({ ...cur.config, ...(input.config ?? {}) }),
        accountIds: input.accountIds ?? cur.accountIds,
        targets: input.targets ?? cur.targets,
      },
    },
    "/campaigns",
  );
  return rowToCampaign(row);
}

export async function updateCampaignStatus(
  id: number,
  status: CampaignStatus,
): Promise<void> {
  await be(`/${id}/status`, { method: "PATCH", body: { status } }, "/campaigns");
}

/** Wipe a campaign's send history and reset its counters (run mode "restart"). */
export async function resetCampaignProgress(id: number): Promise<void> {
  await be(`/${id}/reset`, { method: "POST" }, "/campaigns");
}

export async function bumpCampaignCounters(id: number, ok: boolean): Promise<void> {
  await be(`/${id}/counters`, { method: "PATCH", body: { ok } }, "/campaigns");
}

export async function deleteCampaign(id: number): Promise<void> {
  await be(`/${id}`, { method: "DELETE" }, "/campaigns");
}

export async function addLog(entry: Omit<CampaignLog, "id" | "ts">): Promise<void> {
  await be(
    `/${entry.campaignId}/logs`,
    {
      method: "POST",
      body: {
        target: entry.target,
        accountId: entry.accountId,
        ok: entry.ok,
        message: entry.message,
      },
    },
    "/campaigns",
  );
}

export async function listLogs(
  campaignId: number,
  limit = 200,
): Promise<CampaignLog[]> {
  return be<CampaignLog[]>(
    `/${campaignId}/logs?limit=${limit}`,
    undefined,
    "/campaigns",
  );
}

/** Targets that already have a success / failure log entry for this campaign. */
export async function targetsWithOutcome(
  campaignId: number,
  ok: boolean,
): Promise<Set<string>> {
  const rows = await be<string[]>(
    `/${campaignId}/logs/targets?ok=${ok}`,
    undefined,
    "/campaigns",
  );
  return new Set(rows);
}

/** Count sends in the trailing window for the daily-limit check. */
export async function countSentSince(
  campaignId: number,
  sinceIso: string,
): Promise<number> {
  const { count } = await be<{ count: number }>(
    `/${campaignId}/logs/count-since?since=${encodeURIComponent(sinceIso)}`,
    undefined,
    "/campaigns",
  );
  return count;
}
