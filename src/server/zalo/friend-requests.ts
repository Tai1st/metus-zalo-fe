import "server-only";
import { be } from "./be-client";

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export type FriendRequestPublic = {
  id: number;
  accountId: string;
  fromUid: string;
  fromName: string;
  fromAvatar: string;
  message: string;
  status: FriendRequestStatus;
  receivedAt: string;
  updatedAt: string;
};

export function listFriendRequests(
  accountId?: string,
): Promise<FriendRequestPublic[]> {
  return be<FriendRequestPublic[]>(
    accountId ? `?accountId=${encodeURIComponent(accountId)}` : "",
    undefined,
    "/friend-requests",
  );
}

export function recordFriendRequest(input: {
  accountId: string;
  fromUid: string;
  fromName?: string;
  fromAvatar?: string;
  message?: string;
  receivedAt?: string;
}): Promise<void> {
  return be<{ ok: true }>(
    "",
    { method: "POST", body: input },
    "/friend-requests",
  ).then(() => undefined);
}

export function setFriendRequestStatus(
  id: number,
  status: "accepted" | "rejected",
): Promise<void> {
  return be<{ ok: true }>(
    `/${id}`,
    { method: "PATCH", body: { status } },
    "/friend-requests",
  ).then(() => undefined);
}

export function removeFriendRequest(id: number): Promise<void> {
  return be<{ removed: number }>(
    `/${id}`,
    { method: "DELETE" },
    "/friend-requests",
  ).then(() => undefined);
}
