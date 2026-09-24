import "server-only";
import { be, isNotFound } from "./be-client";

export type ChatLabel = {
  id: number;
  name: string;
  color: string;
  createdAt: string;
};

export function listChatLabels(): Promise<ChatLabel[]> {
  return be<ChatLabel[]>("/chat-labels");
}

export function createChatLabel(
  name: string,
  color: string,
): Promise<ChatLabel> {
  return be<ChatLabel>("/chat-labels", {
    method: "POST",
    body: { name, color },
  });
}

export async function updateChatLabel(
  id: number,
  fields: { name?: string; color?: string },
): Promise<void> {
  try {
    await be(`/chat-labels/${id}`, { method: "PATCH", body: fields });
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
}

export async function deleteChatLabel(id: number): Promise<void> {
  await be(`/chat-labels/${id}`, { method: "DELETE" });
}

export function getThreadLabelIds(
  accountId: string,
  threadId: string,
): Promise<number[]> {
  const q = new URLSearchParams({ accountId, threadId });
  return be<number[]>(`/chat-label-assignments?${q}`);
}

export async function setThreadLabels(
  accountId: string,
  threadId: string,
  labelIds: number[],
): Promise<void> {
  const q = new URLSearchParams({ accountId, threadId });
  await be(`/chat-label-assignments?${q}`, {
    method: "PUT",
    body: { labelIds },
  });
}

/** thread_id -> label ids, for one account (to badge the conversation list). */
export function threadLabelsForAccount(
  accountId: string,
): Promise<Record<string, number[]>> {
  const q = new URLSearchParams({ accountId });
  return be<Record<string, number[]>>(
    `/chat-label-assignments/by-account?${q}`,
  );
}
