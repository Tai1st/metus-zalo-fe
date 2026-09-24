/** Shared campaign types (used by both server and client). */

/** What a request does to each target. Stored in `config.action`; requests
 * created before this existed have none and mean "message". */
export type CampaignAction =
  | "message"
  | "add_friend"
  | "delete_friend"
  | "revoke_friend"
  | "join_group"
  | "message_group"
  | "invite_group_member";

export const ACTION_LABEL: Record<CampaignAction, string> = {
  message: "Nhắn tin",
  add_friend: "Kết bạn",
  delete_friend: "Xóa bạn bè",
  revoke_friend: "Thu hồi kết bạn",
  join_group: "Tham gia nhóm",
  message_group: "Nhắn tin nhóm",
  invite_group_member: "Mời vào nhóm",
};

export function actionOf(c: {
  config: { action?: CampaignAction };
}): CampaignAction {
  return c.config.action ?? "message";
}

/** Nhóm task lớn theo action — dùng để chia tab "Nhắn tin / Kết bạn / Nhóm". */
export type CampaignCategory = "message" | "friend" | "group";

export const CATEGORY_LABEL: Record<CampaignCategory, string> = {
  message: "Nhắn tin",
  friend: "Kết bạn",
  group: "Nhóm",
};

const CATEGORY_OF_ACTION: Record<CampaignAction, CampaignCategory> = {
  message: "message",
  add_friend: "friend",
  delete_friend: "friend",
  revoke_friend: "friend",
  join_group: "group",
  message_group: "group",
  invite_group_member: "group",
};

export function categoryOf(action: string): CampaignCategory {
  return CATEGORY_OF_ACTION[action as CampaignAction] ?? "message";
}

export type CampaignKind =
  | "phone"
  | "friend"
  | "group_member"
  | "group_link"
  | "sent_request"
  | "group"
  | "backup_file";
export type CampaignStatus = "draft" | "running" | "paused" | "done" | "error";

/**
 * One message variant. Static `text`, or — when `dynamicEnabled` — a
 * `template` with `{{zaloName}}` / `{{prefix}}` tokens filled per recipient
 * (`{{prefix}}` picks a random entry from `prefixes`).
 */
export type MessageVariant = {
  text: string;
  dynamicEnabled: boolean;
  template: string;
  prefixes: string[];
};

export const EMPTY_VARIANT: MessageVariant = {
  text: "",
  dynamicEnabled: false,
  template: "",
  prefixes: [],
};

export type RunMode = "restart" | "resume" | "resume_retry_failed";

export const RUN_MODE_LABEL: Record<RunMode, string> = {
  restart: "Chạy lại từ đầu",
  resume: "Tiếp tục (bỏ qua lỗi)",
  resume_retry_failed: "Tiếp tục + thử lại lỗi",
};

export type CampaignConfig = {
  action?: CampaignAction;
  /** Switch to the next account after this many consecutive send errors. */
  switchAccountOnError: number;
  /** Random pause between sends, in seconds. */
  pauseFrom: number;
  pauseTo: number;
  /** After N successful sends, pause for `stopAfterSuccessPause` seconds. */
  stopAfterSuccess: number;
  stopAfterSuccessPause: number;
  /** Max sends per period. */
  dailyLimit: number;
  dailyLimitUnit: "hour" | "day";
  /** Send a friend request first if the target is not a friend. */
  autoAddFriend: boolean;
  /** Append a random emoji to each message. */
  autoEmoji: boolean;
  /** Rotate the sending account after every message so the load is even. */
  distributeEvenly: boolean;
  /** Drop duplicate targets before sending. */
  dedupeTargets: boolean;
  /** Message body — kept for backward compatibility; use `messageVariants`. */
  content: string;
  /** One is picked at random per send. Falls back to `content` when empty. */
  messageVariants: MessageVariant[];
  /** data/-relative paths of image/video files sent with every message. */
  attachments: string[];
  /** Destination group id for action "invite_group_member". */
  inviteGroupId: string;
  /** Link nhóm gốc đã nhập (kind "group_link") — lưu lại để khi sửa yêu cầu
   * có thể chạy lại link, lấy danh sách thành viên mới nhất thay vì chỉ còn
   * uid tĩnh của lần tải trước. */
  sourceLinks: string[];
};

export const DEFAULT_CONFIG: CampaignConfig = {
  switchAccountOnError: 5,
  pauseFrom: 15,
  pauseTo: 20,
  stopAfterSuccess: 0,
  stopAfterSuccessPause: 10,
  dailyLimit: 50,
  dailyLimitUnit: "day",
  autoAddFriend: false,
  autoEmoji: true,
  distributeEvenly: true,
  dedupeTargets: true,
  content: "",
  messageVariants: [],
  attachments: [],
  inviteGroupId: "",
  sourceLinks: [],
};

export type Campaign = {
  id: number;
  name: string;
  kind: CampaignKind;
  status: CampaignStatus;
  config: CampaignConfig;
  accountIds: string[];
  targets: string[];
  sentOk: number;
  sentFail: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignLog = {
  id: number;
  campaignId: number;
  target: string;
  accountId: string;
  ok: boolean;
  message: string;
  ts: string;
};

export const KIND_LABEL: Record<CampaignKind, string> = {
  phone: "Theo số điện thoại",
  friend: "Theo bạn bè",
  group_member: "Theo thành viên nhóm",
  group_link: "Theo thành viên nhóm khác (kể cả nhóm ẩn)",
  sent_request: "Yêu cầu kết bạn đã gửi",
  group: "Nhóm của tôi",
  backup_file: "Từ file backup",
};

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Đang chờ",
  running: "Đang chạy",
  paused: "Tạm dừng",
  done: "Hoàn tất",
  error: "Lỗi",
};
