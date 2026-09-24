"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useMessageStream } from "@/hooks/useMessageStream";
import { apiSend, apiUpload } from "@/lib/fetcher";
import { AccountSelect } from "@/components/AccountSelect";
import { Icon } from "@/components/icons";
import { Button, inputCls } from "@/components/ui";
import { callLabel, effectiveSystemLabel, type LiveMessage } from "@/lib/types";

type Thread = {
  id: string;
  name: string;
  avatar: string;
  type: "user" | "group";
  labelIds: number[];
  lastMessageAt: number;
  lastMessage: string;
};

/** Compact relative time for the conversation list (like a normal chat app). */
function relativeTime(ts: number): string {
  if (!ts) return "";
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày`;
  return new Date(ts).toLocaleDateString("vi-VN");
}
type ChatLabel = { id: number; name: string; color: string };
type UserAvatarInfo = { id: string; name: string; avatar: string };
type StickerInfo = { id: number; url: string };
type FriendStatus = {
  isFriend: boolean;
  isRequested: boolean;
  isRequesting: boolean;
};

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const [account, setAccount] = useState("");
  const [tab, setTab] = useState<"user" | "group">("user");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rightOpen, setRightOpen] = useState(true);

  // Deep link from the notification bell / anywhere else: /chat?account=&type=&thread=
  // Re-runs on every change (not just on mount) — clicking another
  // notification while already on /chat only changes the query string, it
  // doesn't remount this page.
  const deepLinkParams = useSearchParams();
  useEffect(() => {
    const acc = deepLinkParams.get("account");
    const type = deepLinkParams.get("type");
    const thread = deepLinkParams.get("thread");
    if (acc) setAccount(acc);
    if (type === "user" || type === "group") setTab(type);
    if (thread) setSelectedId(thread);
  }, [deepLinkParams]);

  const {
    data: threads,
    error: threadsError,
    loading: threadsLoading,
    reload: reloadThreads,
  } = useApi<Thread[]>(
    account ? `/api/zalo/threads?account=${account}&type=${tab}` : null,
    20000,
  );
  const { data: labels, reload: reloadLabels } = useApi<ChatLabel[]>(
    "/api/zalo/chat-labels",
    30000,
  );
  const { data: accounts } =
    useApi<{ zaloId: string; fullName: string }[]>("/api/zalo/accounts");
  const accountName =
    accounts?.find((a) => a.zaloId === account)?.fullName ?? "";
  const labelById = useMemo(
    () => new Map((labels ?? []).map((l) => [l.id, l])),
    [labels],
  );

  // The list is conversations only: threads with no known activity (e.g. the
  // hundreds of friends who never messaged) stay out of it. Searching still
  // finds them, so a new chat can be started with anyone.
  const query = search.trim().toLowerCase();
  const filtered = (threads ?? []).filter(
    (t) =>
      t.name.toLowerCase().includes(query) &&
      (query !== "" || t.lastMessageAt > 0),
  );
  // Selection is derived: when account/tab changes the id falls out of the list.
  const thread = (threads ?? []).find((t) => t.id === selectedId) ?? null;

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <span aria-hidden>💬</span> Chat Zalo
      </h1>

      <div
        className="flex overflow-hidden rounded-xl border border-border bg-surface"
        style={{ height: "calc(100vh - 180px)" }}
      >
        {/* Left: conversation list */}
        <div className="flex w-[300px] shrink-0 flex-col border-r border-border">
          <div className="border-b border-border p-3">
            <AccountSelect value={account} onChange={setAccount} />
            <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-border text-sm">
              <button
                onClick={() => setTab("user")}
                className={`py-1.5 ${tab === "user" ? "bg-zalo text-white" : "bg-surface"}`}
              >
                Cá nhân
              </button>
              <button
                onClick={() => setTab("group")}
                className={`py-1.5 ${tab === "group" ? "bg-zalo text-white" : "bg-surface"}`}
              >
                Nhóm
              </button>
            </div>
            <input
              className={`${inputCls} mt-3`}
              placeholder="Tìm theo tên…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {!account && (
              <p className="p-4 text-sm text-muted">Chọn một tài khoản.</p>
            )}
            {account && threadsError && (threads ?? []).length === 0 && (
              <div className="p-4 text-sm">
                <p className="text-danger">
                  Không tải được danh sách: {threadsError}
                </p>
                <button
                  onClick={reloadThreads}
                  className="mt-2 text-xs text-zalo hover:underline"
                >
                  Thử lại
                </button>
              </div>
            )}
            {account &&
              !threadsError &&
              !threadsLoading &&
              filtered.length === 0 && (
                <p className="p-4 text-sm text-muted">
                  {query
                    ? "Không tìm thấy hội thoại nào."
                    : "Chưa có hội thoại nào. Nhập tên vào ô tìm kiếm để bắt đầu trò chuyện."}
                </p>
              )}
            {account && threadsLoading && (threads ?? []).length === 0 && (
              <p className="p-4 text-sm text-muted">Đang tải…</p>
            )}
            {filtered.map((t) => (
              <div key={t.id}>
                <button
                  onClick={() => setSelectedId(t.id)}
                  className={`flex w-full items-center gap-2.5 border-b border-border px-3 py-2.5 text-left hover:bg-background ${
                    thread?.id === t.id ? "bg-zalo/10" : ""
                  }`}
                >
                  {t.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.avatar}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="h-9 w-9 shrink-0 rounded-full bg-background" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {t.name}
                      </span>
                      {t.lastMessageAt > 0 && (
                        <span className="shrink-0 text-[11px] text-muted">
                          {relativeTime(t.lastMessageAt)}
                        </span>
                      )}
                    </span>
                    {t.lastMessage && (
                      <span className="block truncate text-xs text-muted">
                        {t.lastMessage}
                      </span>
                    )}
                    {accountName && (
                      <span className="block truncate text-[11px] font-semibold">
                        {accountName}
                      </span>
                    )}
                    <span className="flex flex-wrap gap-1">
                      {t.labelIds.map((id) => {
                        const l = labelById.get(id);
                        return l ? (
                          <span
                            key={id}
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                            style={{ backgroundColor: l.color }}
                          >
                            {l.name}
                          </span>
                        ) : null;
                      })}
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: thread */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!thread ? (
            <div className="grid flex-1 place-items-center text-sm text-muted">
              Chọn một hội thoại để xem tin nhắn.
            </div>
          ) : (
            <ThreadView
              key={`${account}:${thread.id}`}
              account={account}
              thread={thread}
              labels={labels ?? []}
              onLabelsChanged={reloadLabels}
              onToggleRight={() => setRightOpen((v) => !v)}
            />
          )}
        </div>

        {/* Right: actions */}
        {thread && rightOpen && (
          <RightPanel
            account={account}
            thread={thread}
            onClose={() => setRightOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function ThreadView({
  account,
  thread,
  labels,
  onLabelsChanged,
  onToggleRight,
}: {
  account: string;
  thread: Thread;
  labels: ChatLabel[];
  onLabelsChanged: () => void;
  onToggleRight: () => void;
}) {
  // Live updates arrive over SSE; the slow poll is only a safety net.
  const { data: messages, reload: reloadMessages } = useApi<LiveMessage[]>(
    `/api/zalo/history?account=${account}&threadId=${thread.id}&type=${thread.type}`,
    30000,
  );
  useMessageStream(account, (threadId) => {
    if (threadId === thread.id) reloadMessages();
  });
  const { data: status } = useApi<FriendStatus>(
    thread.type === "user"
      ? `/api/zalo/friend-status?account=${account}&userId=${thread.id}`
      : null,
  );
  // Group messages carry no per-sender avatar — resolve lazily for whoever
  // actually sent a message we're rendering (groups can have 900+ members,
  // fetching the whole roster isn't practical).
  const senderIds = useMemo(() => {
    if (thread.type !== "group") return [];
    const ids = new Set<string>();
    for (const m of messages ?? [])
      if (!m.isSelf && m.fromId) ids.add(m.fromId);
    return [...ids].sort();
  }, [messages, thread.type]);

  const { data: avatars } = useApi<UserAvatarInfo[]>(
    senderIds.length > 0
      ? `/api/zalo/user-avatars?account=${account}&ids=${senderIds.join(",")}`
      : null,
    15000,
  );
  const avatarById = useMemo(
    () => new Map((avatars ?? []).map((u) => [u.id, u.avatar])),
    [avatars],
  );
  const senderAvatar = (m: LiveMessage) =>
    thread.type === "group" ? (avatarById.get(m.fromId) ?? "") : thread.avatar;

  // Sticker messages only carry a catalog id — resolve the actual images for
  // whichever stickers are visible.
  const stickerIds = useMemo(() => {
    const ids = new Set<number>();
    for (const m of messages ?? []) if (m.stickerId) ids.add(m.stickerId);
    return [...ids].sort((a, b) => a - b);
  }, [messages]);
  const { data: stickers } = useApi<StickerInfo[]>(
    stickerIds.length > 0
      ? `/api/zalo/stickers?account=${account}&ids=${stickerIds.join(",")}`
      : null,
    30000,
  );
  const stickerUrlById = useMemo(
    () => new Map((stickers ?? []).map((s) => [s.id, s.url])),
    [stickers],
  );

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set(thread.labelIds));
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<{
    path: string;
    name: string;
    isImage: boolean;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setSendError(null);
    setUploading(true);
    try {
      const res = await apiUpload<{ path: string; name: string }>(
        "/api/zalo/upload",
        file,
      );
      setPendingFile({
        path: res.path,
        name: res.name,
        isImage: /\.(jpe?g|png|gif|webp)$/i.test(res.name),
      });
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !pendingFile) return;
    setSending(true);
    setSendError(null);
    try {
      await apiSend(`/api/zalo/messages?account=${account}`, "POST", {
        threadId: thread.id,
        type: thread.type === "group" ? 1 : 0,
        message: text,
        attachmentPath: pendingFile?.path,
      });
      setText("");
      setPendingFile(null);
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function toggleLabel(id: number) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
    await apiSend(
      `/api/zalo/chat-labels/assign?account=${account}&threadId=${thread.id}`,
      "PUT",
      { labelIds: [...next] },
    );
    onLabelsChanged();
  }

  return (
    <>
      <div className="flex items-start justify-between border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{thread.name}</span>
            {thread.type === "user" && status && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  status.isFriend
                    ? "bg-success/10 text-success"
                    : "bg-background text-muted"
                }`}
              >
                {status.isFriend ? "Bạn bè" : "Người lạ"}
              </span>
            )}
          </div>

          <div className="relative mt-1 flex items-center gap-1.5">
            <button
              type="button"
              title="Gán nhãn"
              onClick={() => setLabelOpen((v) => !v)}
              className="text-muted hover:text-zalo"
            >
              <Icon name="tag" size={15} />
            </button>
            {[...picked].map((id) => {
              const l = labels.find((x) => x.id === id);
              return l ? (
                <span
                  key={id}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </span>
              ) : null;
            })}

            {labelOpen && (
              <div className="absolute left-0 top-7 z-10 w-56 rounded-lg border border-border bg-surface p-3 shadow-lg">
                {labels.length === 0 ? (
                  <p className="text-xs text-muted">
                    Chưa có nhãn. Tạo ở “Chat → Quản lý nhãn”.
                  </p>
                ) : (
                  labels.map((l) => (
                    <label
                      key={l.id}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={picked.has(l.id)}
                        onChange={() => toggleLabel(l.id)}
                      />
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: l.color }}
                      >
                        {l.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onToggleRight}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs hover:bg-background"
        >
          »
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto bg-background p-4">
        {(messages ?? []).length === 0 && (
          <p className="text-center text-sm text-muted">Chưa có tin nhắn.</p>
        )}
        {(messages ?? []).map((m) => {
          const avatar = senderAvatar(m);
          const stickerUrl = m.stickerId
            ? stickerUrlById.get(m.stickerId)
            : undefined;
          const systemLabel = effectiveSystemLabel(m);
          return (
            <div
              key={m.id}
              className={`flex items-end gap-1.5 ${m.isSelf ? "justify-end" : "justify-start"}`}
            >
              {!m.isSelf &&
                (avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt=""
                    title={m.fromName}
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="h-6 w-6 shrink-0 rounded-full border border-border bg-surface" />
                ))}
              {m.stickerId ? (
                // Stickers render as a standalone image — no chat bubble.
                <div className="max-w-[120px]">
                  {!m.isSelf && thread.type === "group" && (
                    <div className="mb-0.5 text-[11px] font-medium text-muted">
                      {m.fromName}
                    </div>
                  )}
                  {stickerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stickerUrl} alt="" className="w-full" />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-lg border border-dashed border-border text-[11px] text-muted">
                      Sticker
                    </div>
                  )}
                  <div className="mt-0.5 text-[10px] text-muted">
                    {new Date(m.ts).toLocaleTimeString("vi-VN")}
                  </div>
                </div>
              ) : m.call ? (
                // Call-ended "bubble" — its own dark card, like Zalo's own UI,
                // not the usual colored chat bubble.
                <div className="max-w-[220px]">
                  {!m.isSelf && thread.type === "group" && (
                    <div className="mb-0.5 text-[11px] font-medium text-muted">
                      {m.fromName}
                    </div>
                  )}
                  <div className="rounded-2xl bg-[#1c1e21] px-3 py-2.5 text-white">
                    <div className="flex items-center gap-2">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="h-7 w-7 shrink-0 rounded-full bg-white/10" />
                      )}
                      <span className="text-sm font-semibold">
                        {callLabel(m)?.header}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/70">
                      <Icon name="phone" size={13} />
                      {callLabel(m)?.detail}
                    </div>
                    <div className="mt-1 text-xs font-medium text-[#5b9bff]">
                      Gọi lại
                    </div>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted">
                    {new Date(m.ts).toLocaleTimeString("vi-VN")}
                  </div>
                </div>
              ) : (
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    m.isSelf
                      ? "bg-zalo text-white"
                      : "border border-border bg-surface"
                  }`}
                >
                  {!m.isSelf && thread.type === "group" && (
                    <div className="mb-0.5 text-[11px] font-medium opacity-70">
                      {m.fromName}
                    </div>
                  )}
                  {systemLabel ? (
                    <div
                      className={`flex items-center gap-1.5 italic ${m.isSelf ? "text-white/85" : "text-muted"}`}
                    >
                      {systemLabel}
                    </div>
                  ) : (
                    <>
                      {m.attachment &&
                        (m.attachment.isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.attachment.href || m.attachment.thumb}
                            alt={m.attachment.title}
                            className="max-w-[220px] cursor-pointer rounded-lg"
                            onClick={() =>
                              window.open(
                                m.attachment!.href || m.attachment!.thumb,
                                "_blank",
                              )
                            }
                          />
                        ) : (
                          <a
                            href={m.attachment.href}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                              m.isSelf
                                ? "border-white/30"
                                : "border-border bg-background"
                            }`}
                          >
                            <Icon name="link" size={14} />
                            <span className="truncate text-xs underline">
                              {m.attachment.title || "Tệp đính kèm"}
                            </span>
                          </a>
                        ))}
                      {m.content && (
                        <div className="whitespace-pre-wrap break-words">
                          {m.content}
                        </div>
                      )}
                    </>
                  )}
                  <div
                    className={`mt-0.5 text-right text-[10px] ${m.isSelf ? "text-white/70" : "text-muted"}`}
                  >
                    {new Date(m.ts).toLocaleTimeString("vi-VN")}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border">
        {pendingFile && (
          <div className="flex items-center gap-2 px-3 pt-2 text-xs text-muted">
            {pendingFile.isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/zalo/${pendingFile.path}`}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <Icon name="link" size={14} />
            )}
            <span className="truncate">{pendingFile.name}</span>
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="text-danger hover:underline"
            >
              Xoá
            </button>
          </div>
        )}
        {sendError && (
          <p className="px-3 pt-2 text-xs text-danger">{sendError}</p>
        )}
        <form onSubmit={send} className="flex items-end gap-2 p-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/quicktime,video/webm"
            hidden
            onChange={pickFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="shrink-0 rounded-lg border border-border p-2 text-muted hover:bg-background disabled:opacity-50"
            aria-label="Đính kèm ảnh / video"
          >
            <Icon name="upload" size={16} />
          </button>
          <textarea
            className={`${inputCls} max-h-28 min-h-[40px] flex-1 resize-none`}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập tin nhắn…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(e as unknown as React.FormEvent);
              }
            }}
          />
          <Button type="submit" disabled={sending || uploading}>
            {sending ? "…" : "Gửi"}
          </Button>
        </form>
      </div>
    </>
  );
}

function RightPanel({
  account,
  thread,
  onClose,
}: {
  account: string;
  thread: Thread;
  onClose: () => void;
}) {
  const { data: status } = useApi<FriendStatus>(
    thread.type === "user"
      ? `/api/zalo/friend-status?account=${account}&userId=${thread.id}`
      : null,
  );
  const { data: groups } = useApi<Thread[]>(
    `/api/zalo/threads?account=${account}&type=group`,
    30000,
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [invitePicked, setInvitePicked] = useState<Set<string>>(new Set());
  const [showInvite, setShowInvite] = useState(false);

  async function sendFriendRequest() {
    setMsg(null);
    try {
      await apiSend(`/api/zalo/friend-request?account=${account}`, "POST", {
        userId: thread.id,
      });
      setMsg("Đã gửi lời mời kết bạn.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function invite() {
    setMsg(null);
    try {
      await apiSend(`/api/zalo/group-invite?account=${account}`, "POST", {
        userId: thread.id,
        groupIds: [...invitePicked],
      });
      setMsg("Đã gửi lời mời vào nhóm.");
      setShowInvite(false);
      setInvitePicked(new Set());
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="flex w-[220px] shrink-0 flex-col gap-2 border-l border-border p-3">
      <button
        onClick={onClose}
        className="self-end text-xs text-muted hover:text-foreground"
      >
        «
      </button>

      {thread.type === "user" && (
        <Button onClick={sendFriendRequest} disabled={status?.isFriend}>
          {status?.isFriend
            ? "Đã là bạn bè"
            : status?.isRequesting
              ? "Đã gửi lời mời"
              : "Gửi lời mời kết bạn"}
        </Button>
      )}

      {thread.type === "user" && (
        <Button variant="ghost" onClick={() => setShowInvite((v) => !v)}>
          Mời vào nhóm
        </Button>
      )}

      {showInvite && (
        <div className="rounded-lg border border-border p-2">
          <div className="max-h-48 overflow-y-auto">
            {(groups ?? []).map((g) => (
              <label
                key={g.id}
                className="flex items-center gap-2 py-1 text-xs"
              >
                <input
                  type="checkbox"
                  checked={invitePicked.has(g.id)}
                  onChange={() =>
                    setInvitePicked((s) => {
                      const n = new Set(s);
                      if (n.has(g.id)) n.delete(g.id);
                      else n.add(g.id);
                      return n;
                    })
                  }
                />
                <span className="truncate">{g.name}</span>
              </label>
            ))}
            {(groups ?? []).length === 0 && (
              <p className="text-xs text-muted">Không có nhóm.</p>
            )}
          </div>
          <Button size="sm" onClick={invite} disabled={invitePicked.size === 0}>
            Mời ({invitePicked.size})
          </Button>
        </div>
      )}

      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
