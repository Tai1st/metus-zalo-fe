import "server-only";
import { be, isNotFound } from "./be-client";

export type AccountLabel = {
  id: number;
  name: string;
  color: string;
  accountCount: number;
  createdAt: string;
};

export function listLabels(): Promise<AccountLabel[]> {
  return be<AccountLabel[]>("/account-labels");
}

export function createLabel(
  name: string,
  color: string,
): Promise<AccountLabel> {
  return be<AccountLabel>("/account-labels", {
    method: "POST",
    body: { name, color },
  });
}

export async function updateLabel(
  id: number,
  fields: { name?: string; color?: string },
): Promise<void> {
  try {
    await be(`/account-labels/${id}`, { method: "PATCH", body: fields });
  } catch (err) {
    // Old SQLite version silently did nothing for an unknown id.
    if (!isNotFound(err)) throw err;
  }
}

export async function deleteLabel(id: number): Promise<void> {
  await be(`/account-labels/${id}`, { method: "DELETE" });
}

/** Label ids attached to an account. */
export function getAccountLabelIds(zaloId: string): Promise<number[]> {
  return be<number[]>(`/accounts/${zaloId}/labels`);
}

export async function setAccountLabels(
  zaloId: string,
  labelIds: number[],
): Promise<void> {
  await be(`/accounts/${zaloId}/labels`, { method: "PUT", body: { labelIds } });
}

/** Map of zaloId -> label ids, for rendering the accounts table. */
export function labelIdsByAccount(): Promise<Record<string, number[]>> {
  return be<Record<string, number[]>>("/account-label-map");
}
