import "server-only";
import fs from "node:fs";
import { EventEmitter } from "node:events";
import { API, FriendEventType, ThreadType, Zalo } from "zca-js";
import type { Message, TFriendEventRequest } from "zca-js";
import { imageSize } from "image-size";
import { effectiveSystemLabel, type LiveMessage } from "@/lib/types";
import { be } from "./be-client";
import { recordFriendRequest } from "./friend-requests";
import { buildProxyAgent, type ProxyLike } from "./proxyAgent";

/**
 * A shared-contact message (zca-js `sendCard`, msgType 6) round-trips its
 * own request shape back on receive: `content.params` is a JSON string
 * holding `contactUid` (and optionally `phone`) — never a real photo URL.
 */
function parseCardParams(
  params: string | undefined,
): { phone?: string } | null {
  if (!params) return null;
  try {
    const p = JSON.parse(params) as { contactUid?: unknown; phone?: unknown };
    if (!p || typeof p !== "object" || !("contactUid" in p)) return null;
    return { phone: typeof p.phone === "string" ? p.phone : undefined };
  } catch {
    return null;
  }
}

/**
 * Structured info for a call-ended "bubble" message. Zalo's own bubble
 * action carries call info in `params` (JSON) — we don't know its exact
 * shape, so read known-looking fields if present; direction (đến/đi/nhỡ) is
 * derived client-side from `isSelf` + duration, see `callLabel()`.
 */
function parseCallAction(
  action: string | undefined,
  params: string | undefined,
): LiveMessage["call"] | undefined {
  if (action !== "sendBubbleMessage") return undefined;
  try {
    const p = params ? (JSON.parse(params) as Record<string, unknown>) : null;
    const isVideo = Boolean(p?.isVideoCall ?? p?.videoCall);
    const durationSec = Number(p?.callDuration ?? p?.duration ?? 0);
    return {
      kind: isVideo ? "video" : "voice",
      durationSec: Number.isFinite(durationSec) ? Math.max(0, durationSec) : 0,
    };
  } catch {
    return { kind: "voice", durationSec: 0 };
  }
}

/** zca-js needs image dimensions to send image attachments. */
export async function imageMetadataGetter(filePath: string) {
  try {
    const buf = fs.readFileSync(filePath);
    const { width, height } = imageSize(buf);
    return { width: width ?? 0, height: height ?? 0, size: buf.length };
  } catch {
    return null;
  }
}

export type Auth = {
  zaloId: string;
  cookies: string; // JSON string: serialized tough-cookie jar
  imei: string;
  userAgent: string;
  proxy?: ProxyLike | null;
};

type Connection = {
  api: API;
  authKey: string;
  listenerStarted: boolean;
  handlersBound?: boolean;
  createdAt: number;
};

const MAX_BUFFERED_MESSAGES = 300;

class ConnectionManager {
  private connections = new Map<string, Connection>();
  private pending = new Map<string, Promise<Connection>>();
  /** Incoming-message ring buffer, per account. */
  private buffers = new Map<string, LiveMessage[]>();
  /** Fires `zaloId` → LiveMessage for every newly stored message (SSE feed). */
  private feed = new EventEmitter().setMaxListeners(0);

  /** Subscribe to new messages for an account; returns an unsubscribe fn. */
  subscribe(zaloId: string, fn: (m: LiveMessage) => void): () => void {
    this.feed.on(zaloId, fn);
    return () => this.feed.off(zaloId, fn);
  }

  private authKey(auth: Auth): string {
    return Buffer.from(auth.cookies).toString("base64");
  }

  isConnected(zaloId: string): boolean {
    return this.connections.has(zaloId);
  }

  listConnected(): string[] {
    return [...this.connections.keys()];
  }

  messages(zaloId: string, since = 0): LiveMessage[] {
    const buf = this.buffers.get(zaloId) ?? [];
    return since ? buf.filter((m) => m.ts > since) : buf;
  }

  /** Messages for a single thread, oldest → newest. */
  async threadMessages(
    zaloId: string,
    threadId: string,
  ): Promise<LiveMessage[]> {
    // Zalo exposes no 1-1 history to linked sessions, so every message we see
    // is persisted and served from metus-zalo-be (MongoDB) — history survives
    // restarts.
    const rows = await be<LiveMessage[]>(
      `/messages/thread?zaloId=${encodeURIComponent(zaloId)}&threadId=${encodeURIComponent(threadId)}`,
      undefined,
      "/chat",
    );
    const byId = new Map<string, LiveMessage>();
    for (const m of rows) byId.set(m.id, m);
    for (const m of this.buffers.get(zaloId) ?? []) {
      if (m.threadId === threadId) byId.set(m.id, m);
    }
    return [...byId.values()].sort((a, b) => a.ts - b.ts);
  }

  private async persist(zaloId: string, m: LiveMessage): Promise<void> {
    try {
      await be(
        "/messages",
        { method: "POST", body: { zaloId, ...m } },
        "/chat",
      );
    } catch {
      /* persistence is best-effort */
    }
  }

  /** Latest message timestamp seen per thread — for sorting conversation lists. */
  async lastMessageTimestamps(zaloId: string): Promise<Record<string, number>> {
    const out = await be<Record<string, number>>(
      `/messages/last-timestamps?zaloId=${encodeURIComponent(zaloId)}`,
      undefined,
      "/chat",
    );
    for (const m of this.buffers.get(zaloId) ?? []) {
      if (!out[m.threadId] || m.ts > out[m.threadId]) out[m.threadId] = m.ts;
    }
    return out;
  }

  /** One-line preview of the newest stored message per thread. */
  async lastMessagePreviews(zaloId: string): Promise<Record<string, string>> {
    const rows = await be<Record<string, LiveMessage>>(
      `/messages/last-previews?zaloId=${encodeURIComponent(zaloId)}`,
      undefined,
      "/chat",
    );
    const out: Record<string, string> = {};
    for (const [threadId, m] of Object.entries(rows)) {
      const label = effectiveSystemLabel(m);
      const text = label
        ? label
        : m.stickerId
          ? "Sticker"
          : m.attachment
            ? m.attachment.isImage
              ? "Hình ảnh"
              : m.attachment.title || "Tệp đính kèm"
            : m.content;
      const who = m.isSelf
        ? "Bạn: "
        : m.threadType === 1 && m.fromName
          ? `${m.fromName}: `
          : "";
      out[threadId] = (who + text).replace(/\s+/g, " ").slice(0, 120);
    }
    return out;
  }

  /** Insert a pre-mapped message into the buffer (e.g. from REST chat history). */
  ingestExternal(zaloId: string, msg: LiveMessage): void {
    if (!this.buffers.has(zaloId)) this.buffers.set(zaloId, []);
    const buf = this.buffers.get(zaloId)!;
    if (buf.some((m) => m.id === msg.id && m.threadId === msg.threadId)) return;
    void this.persist(zaloId, msg);
    this.feed.emit(zaloId, msg);
    buf.unshift(msg);
    if (buf.length > MAX_BUFFERED_MESSAGES) buf.length = MAX_BUFFERED_MESSAGES;
  }

  /** Ask the socket to backfill older messages for a thread type. */
  requestHistory(zaloId: string, type: ThreadType): void {
    const conn = this.connections.get(zaloId);
    if (!conn) return;
    try {
      conn.api.listener.requestOldMessages(type);
    } catch {
      /* ignore */
    }
  }

  /** Reuse a live connection or build one from stored credentials. */
  async getOrCreate(
    auth: Auth,
    opts: { startListener?: boolean } = {},
  ): Promise<API> {
    const existing = this.connections.get(auth.zaloId);
    if (existing) {
      if (opts.startListener) this.ensureListener(auth.zaloId, existing);
      return existing.api;
    }

    const key = this.authKey(auth);
    let inflight = this.pending.get(key);
    if (!inflight) {
      inflight = this.build(auth, key);
      this.pending.set(key, inflight);
      inflight.finally(() => this.pending.delete(key));
    }
    const conn = await inflight;
    if (opts.startListener) this.ensureListener(auth.zaloId, conn);
    return conn.api;
  }

  /**
   * Register an API instance obtained elsewhere (fresh QR login) so the manager
   * owns its lifecycle and message buffer.
   */
  adopt(zaloId: string, authKey: string, api: API): void {
    const conn: Connection = {
      api,
      authKey,
      listenerStarted: false,
      createdAt: Date.now(),
    };
    this.connections.set(zaloId, conn);
    this.ensureListener(zaloId, conn);
  }

  disconnect(zaloId: string): void {
    const conn = this.connections.get(zaloId);
    if (!conn) return;
    try {
      conn.api.listener.stop();
    } catch {
      /* ignore */
    }
    this.connections.delete(zaloId);
    this.buffers.delete(zaloId);
  }

  /** Drop the live connection and rebuild it from the given credentials. */
  async reconnect(auth: Auth): Promise<API> {
    this.disconnect(auth.zaloId);
    this.pending.delete(this.authKey(auth));
    return this.getOrCreate(auth, { startListener: true });
  }

  private async build(auth: Auth, key: string): Promise<Connection> {
    const zalo = new Zalo({
      imageMetadataGetter,
      selfListen: true, // also receive messages you send from your phone/other devices
      ...(auth.proxy ? { agent: buildProxyAgent(auth.proxy) } : {}),
    });
    const api = await zalo.login({
      cookie: JSON.parse(auth.cookies),
      imei: auth.imei,
      userAgent: auth.userAgent,
    });
    const conn: Connection = {
      api,
      authKey: key,
      listenerStarted: false,
      createdAt: Date.now(),
    };
    this.connections.set(auth.zaloId, conn);
    return conn;
  }

  private ensureListener(zaloId: string, conn: Connection): void {
    if (conn.listenerStarted) return;
    conn.listenerStarted = true;

    if (!this.buffers.has(zaloId)) this.buffers.set(zaloId, []);
    const buf = this.buffers.get(zaloId)!;

    const ingest = (msg: Message) => {
      const data = msg.data;
      let content = "";
      let attachment: LiveMessage["attachment"];
      let stickerId: number | undefined;
      let systemLabel: string | undefined;
      let call: LiveMessage["call"];
      if (typeof data.content === "string") {
        content = data.content;
      } else if (data.content && "sticker_id" in data.content) {
        // Sticker messages only carry a catalog id, not a URL — resolved
        // lazily client-side via /api/zalo/stickers.
        stickerId =
          Number((data.content as { sticker_id?: number }).sticker_id) ||
          undefined;
      } else if (data.content && typeof data.content === "object") {
        const c = data.content as {
          title?: string;
          href?: string;
          thumb?: string;
          type?: string;
          action?: string;
          params?: string;
        };
        const card = parseCardParams(c.params);
        if (card) {
          // A shared contact card (zca-js sendCard: msgType 6) — no real
          // photo/href, so don't try to render one; the title is the
          // contact's display name.
          systemLabel = `Đã chia sẻ danh thiếp: ${c.title || card.phone || "liên hệ"}`;
        } else if (c.href) {
          const url = c.thumb || c.href || "";
          content = c.title || "";
          attachment = {
            href: c.href || c.thumb || "",
            thumb: c.thumb || c.href || "",
            title: c.title || "",
            isImage: /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url),
          };
        } else if (c.action || c.type) {
          // Some other internal action bubble (call ended, game invite…) —
          // Zalo's own label here is a protocol action name, not something
          // to show a user, so never surface it raw.
          call = parseCallAction(c.action, c.params);
          if (!call) systemLabel = "Thông báo cuộc gọi/hoạt động";
        } else {
          content = "[đính kèm]";
        }
      } else {
        content = "[đính kèm]";
      }
      const entry: LiveMessage = {
        id: String(data.msgId || data.cliMsgId || Date.now()),
        threadId: msg.threadId,
        threadType: msg.type,
        isSelf: msg.isSelf,
        fromId: data.uidFrom || "",
        fromName: data.dName || "",
        content,
        attachment,
        stickerId,
        systemLabel,
        call,
        ts: Number(data.ts) || Date.now(),
      };
      if (buf.some((m) => m.id === entry.id && m.threadId === entry.threadId)) {
        return;
      }
      void this.persist(zaloId, entry);
      this.feed.emit(zaloId, entry);
      buf.unshift(entry);
      if (buf.length > MAX_BUFFERED_MESSAGES)
        buf.length = MAX_BUFFERED_MESSAGES;
    };

    if (!conn.handlersBound) {
      conn.handlersBound = true;
      conn.api.listener.on("message", ingest);
      conn.api.listener.on("old_messages", (msgs) => msgs.forEach(ingest));

      // Lời mời kết bạn đến chỉ báo qua sự kiện real-time (zca-js không có
      // API liệt kê lại lịch sử) — ghi lại ngay để "Danh sách lời mời kết
      // bạn" còn hiển thị được sau này.
      conn.api.listener.on("friend_event", (ev) => {
        if (ev.type !== FriendEventType.REQUEST) return;
        const d = ev.data as TFriendEventRequest;
        void (async () => {
          let fromName = "";
          let fromAvatar = "";
          try {
            const info = await conn.api.getUserInfo(d.fromUid);
            const p = info.changed_profiles?.[d.fromUid];
            fromName = p?.displayName || p?.zaloName || "";
            fromAvatar = p?.avatar || "";
          } catch {
            /* best-effort — vẫn ghi lại record dù thiếu tên/avatar */
          }
          try {
            await recordFriendRequest({
              accountId: zaloId,
              fromUid: d.fromUid,
              fromName,
              fromAvatar,
              message: d.message,
            });
          } catch {
            /* ignore — best effort */
          }
        })();
      });

      conn.api.listener.on("error", () => {
        /* keep process alive; a dropped socket surfaces via "closed" */
      });

      // Every (re)connect: pull the latest messages so a short outage leaves no
      // gap. Duplicates are ignored by id.
      conn.api.listener.on("connected", () => {
        for (const t of [ThreadType.User, ThreadType.Group]) {
          try {
            conn.api.listener.requestOldMessages(t);
          } catch {
            /* ignore */
          }
        }
      });

      // The socket can be closed by Zalo (e.g. another web session takes over) or
      // by the network; without this the account silently stops receiving.
      conn.api.listener.on("closed", () => {
        conn.listenerStarted = false;
        setTimeout(() => {
          if (this.connections.get(zaloId) !== conn) return; // disconnected on purpose
          this.ensureListener(zaloId, conn);
        }, 5000);
      });
    }

    try {
      conn.api.listener.start({ retryOnClose: true });
    } catch {
      conn.listenerStarted = false;
    }
  }
}

export { ThreadType };

const globalRef = globalThis as unknown as {
  __zaloConnections?: ConnectionManager;
};
export const connectionManager: ConnectionManager =
  globalRef.__zaloConnections ??
  (globalRef.__zaloConnections = new ConnectionManager());
