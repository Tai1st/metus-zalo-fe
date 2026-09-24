export type LoginStage =
  | "idle"
  | "starting"
  | "qr_ready"
  | "scanned"
  | "declined"
  | "expired"
  | "connected"
  | "error";

export type QrSession = {
  tempId: string;
  stage: LoginStage;
  qrImage?: string;
  scannedUser?: { display_name: string; avatar: string };
  zaloId?: string;
  error?: string;
  createdAt: number;
};

export type AccountPublic = {
  zaloId: string;
  fullName: string;
  avatarUrl: string;
  phone: string;
  isBusiness: boolean;
  isActive: boolean;
  connected: boolean;
  labelIds: number[];
  proxyId: number | null;
  createdAt: string;
  lastSeen: string | null;
};

export type AccountLabel = {
  id: number;
  name: string;
  color: string;
  accountCount: number;
  createdAt: string;
};

export type LiveMessage = {
  id: string;
  threadId: string;
  threadType: number;
  isSelf: boolean;
  fromId: string;
  fromName: string;
  content: string;
  ts: number;
  /** Present when the message is a shared photo/video/file. */
  attachment?: {
    href: string;
    thumb: string;
    title: string;
    isImage: boolean;
  };
  /** Present for sticker messages — resolve the image via /api/zalo/stickers. */
  stickerId?: number;
  /**
   * One-line description for message kinds we don't render richly — a
   * shared contact card, a game invite… Zalo's own payload for these is an
   * internal action/params blob, not a real file or caption, so we never
   * show that raw string; this is the human label to show instead.
   */
  systemLabel?: string;
  /** Present for a call-ended "bubble" message — rendered as a call card. */
  call?: {
    kind: "voice" | "video";
    /** 0 (or absent) means not answered — shown as "nhỡ" when incoming. */
    durationSec: number;
  };
};

// Zalo's own call-card always shows both units, e.g. "0 phút 21 giây" — match
// that instead of dropping "0 phút".
const fmtDuration = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m} phút ${s} giây`;
};

/** Human header + duration line for a call card, e.g. "Cuộc gọi thoại đến" / "0 phút 21 giây". */
export function callLabel(
  m: LiveMessage,
): { header: string; detail: string } | undefined {
  if (!m.call) return undefined;
  const { kind, durationSec } = m.call;
  const kindLabel = kind === "video" ? "video" : "thoại";
  const answered = durationSec > 0;
  if (m.isSelf) {
    return {
      header: `Cuộc gọi ${kindLabel} đi`,
      detail: answered ? fmtDuration(durationSec) : "Không trả lời",
    };
  }
  if (!answered) {
    return { header: `Cuộc gọi ${kindLabel} nhỡ`, detail: "Không trả lời" };
  }
  return {
    header: `Cuộc gọi ${kindLabel} đến`,
    detail: fmtDuration(durationSec),
  };
}

/**
 * Rows persisted before `systemLabel` existed never got a proper label — the
 * ingest code back then stuffed Zalo's internal action name straight into
 * `attachment.title` (e.g. a call-ended bubble came through as a "file"
 * titled literally "sendBubbleMessage"). That exact string is never real
 * user content, so it's a safe, deterministic signal to retroactively show
 * a sane label for old data too, without a DB migration.
 */
const KNOWN_JUNK_TITLES: Record<string, string> = {
  sendBubbleMessage: "📞 Cuộc gọi",
};

/** `systemLabel` if the server already set one, else a best-effort guess for old rows. */
export function effectiveSystemLabel(m: LiveMessage): string | undefined {
  if (m.systemLabel) return m.systemLabel;
  const title = m.attachment?.title;
  return title ? KNOWN_JUNK_TITLES[title] : undefined;
}

/** zca-js `User` is loosely typed; pick the fields the UI actually renders. */
export type ZaloUser = {
  userId?: string;
  uid?: string;
  displayName?: string;
  zaloName?: string;
  avatar?: string;
  phoneNumber?: string;
  gender?: number;
  [key: string]: unknown;
};

export type ZaloGroup = {
  groupId?: string;
  name?: string;
  desc?: string;
  avt?: string;
  fullAvt?: string;
  totalMember?: number;
  creatorId?: string;
  [key: string]: unknown;
};
