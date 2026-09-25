"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { apiGet, apiSend, apiUpload } from "@/lib/fetcher";
import { Icon } from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  FilterTh,
  inputCls,
  Notice,
  PageHeader,
  Pagination,
  textMatch,
  Toggle,
  useColumnFilters,
} from "@/components/ui";
import {
  ACTION_LABEL,
  type Campaign,
  type CampaignAction,
  type CampaignKind,
  DEFAULT_CONFIG,
  EMPTY_VARIANT,
  KIND_LABEL,
  type MessageVariant,
} from "@/lib/campaign";
import type { AccountPublic, ZaloGroup, ZaloUser } from "@/lib/types";
import type { GroupMembersResult } from "@/app/api/zalo/group-members/route";
import type { SentRequest } from "@/app/api/zalo/sent-requests/route";
import type { GroupLinkMembersResult } from "@/app/api/zalo/group-link-members/route";

type FriendRow = { id: string; name: string; avatar: string; owner: string };

type GroupRow = {
  key: string;
  id: string;
  name: string;
  avatar: string;
  owner: string;
  ownerId: string;
  total: number;
};
type MemberRow = {
  id: string;
  name: string;
  avatar: string;
  role: "owner" | "admin" | "member";
  groupKey: string;
  groupName: string;
  isFriend: boolean;
};
const ROLE_RANK = { owner: 0, admin: 1, member: 2 } as const;
const ROLE_LABEL = {
  owner: "Trưởng nhóm",
  admin: "Phó nhóm",
  member: "Thành viên",
} as const;

const KINDS: CampaignKind[] = [
  "phone",
  "friend",
  "group_member",
  "group_link",
  "sent_request",
  "group",
  "backup_file",
];

const TARGET_META: Record<
  CampaignKind,
  { col: string; placeholder: string; hint: string }
> = {
  phone: {
    col: "Số điện thoại",
    placeholder: "Nhập số điện thoại",
    hint: "Định dạng file .txt, mỗi số điện thoại 1 dòng.",
  },
  friend: {
    col: "ID người dùng",
    placeholder: "Nhập ID người dùng Zalo",
    hint: "Định dạng file .txt, mỗi ID 1 dòng.",
  },
  group_member: {
    col: "Thành viên",
    placeholder: "",
    hint: "",
  },
  group: {
    col: "Nhóm",
    placeholder: "",
    hint: "",
  },
  sent_request: {
    col: "Yêu cầu kết bạn",
    placeholder: "",
    hint: "",
  },
  group_link: {
    col: "Link nhóm",
    placeholder: "Nhập link nhóm Zalo",
    hint: "Định dạng file .txt, mỗi link 1 dòng.",
  },
  backup_file: {
    col: "Người dùng",
    placeholder: "",
    hint: "",
  },
};

function splitRaw(raw: string): string[] {
  return raw
    .split(/[\n,;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải…</p>}>
      <NewCampaignForm />
    </Suspense>
  );
}

function NewCampaignForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const queryKind = (
    params.get("action") === "revoke_friend"
      ? "sent_request"
      : KINDS.includes(params.get("kind") as CampaignKind)
        ? params.get("kind")
        : "phone"
  ) as CampaignKind;

  const { data: accounts } = useApi<AccountPublic[]>(
    "/api/zalo/accounts",
    8000,
  );
  const { data: allCampaigns } = useApi<Campaign[]>("/api/zalo/campaigns");

  const queryAction = (
    [
      "add_friend",
      "delete_friend",
      "revoke_friend",
      "join_group",
      "message_group",
      "invite_group_member",
    ].includes(params.get("action") ?? "")
      ? params.get("action")
      : "message"
  ) as CampaignAction;
  const [action, setAction] = useState<CampaignAction>(queryAction);
  const isMessage = action === "message";
  const isRevoke = action === "revoke_friend";
  const isDelete = action === "delete_friend";
  const singleAccount = isRevoke || isDelete;
  const isJoin = action === "join_group";
  const isMsgGroup = action === "message_group";
  const isInvite = action === "invite_group_member";
  const radioAccount = singleAccount || isMsgGroup;
  const [kind, setKind] = useState<CampaignKind>(queryKind);
  const [targetGroupId, setTargetGroupId] = useState("");
  const [name, setName] = useState("");
  const [cfg, setCfg] = useState({ ...DEFAULT_CONFIG });
  const [variants, setVariants] = useState<MessageVariant[]>([
    { ...EMPTY_VARIANT },
  ]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const acctF = useColumnFilters<"phone" | "name" | "status">();
  const [targets, setTargets] = useState<string[]>([]);
  const [targetInput, setTargetInput] = useState("");
  const [checkedTargets, setCheckedTargets] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const friendF = useColumnFilters<"name" | "owner">();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [pickedGroups, setPickedGroups] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [loadedGroups, setLoadedGroups] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const groupF = useColumnFilters<"name">();
  const [sent, setSent] = useState<(SentRequest & { owner: string })[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentLoaded, setSentLoaded] = useState(false);
  const [sentPage, setSentPage] = useState(1);
  const [sentPageSize, setSentPageSize] = useState(5);
  const sentF = useColumnFilters<"name">();
  const [autoJoin, setAutoJoin] = useState(false);
  const [backupRows, setBackupRows] = useState<
    { id: string; name: string; phone: string; owner: string }[]
  >([]);
  const backupFileRef = useRef<HTMLInputElement>(null);
  const [links, setLinks] = useState<string[]>([]);
  const [checkedLinks, setCheckedLinks] = useState<Set<string>>(new Set());
  const [linkView, setLinkView] = useState<"links" | "members">("links");
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(10);
  const memberF = useColumnFilters<"name" | "role" | "group" | "friend">();

  const meta = TARGET_META[kind];

  const filteredAccounts = (accounts ?? []).filter(
    (a) =>
      textMatch(`${a.phone} ${a.zaloId}`, acctF.filters.phone) &&
      textMatch(a.fullName, acctF.filters.name) &&
      textMatch(a.connected ? "hoạt động" : "offline", acctF.filters.status),
  );

  const [restoredCampaign, setRestoredCampaign] = useState<Campaign | null>(
    null,
  );

  useEffect(() => {
    if (!editId) return;
    let alive = true;
    (async () => {
      const { campaign } = await apiGet<{ campaign: Campaign }>(
        `/api/zalo/campaigns/${editId}`,
      );
      if (!alive || !campaign) return;
      setKind(campaign.kind);
      setAction(campaign.config.action ?? "message");
      setName(campaign.name);
      setCfg({ ...DEFAULT_CONFIG, ...campaign.config });
      const v = campaign.config.messageVariants ?? [];
      setVariants(
        v.length > 0
          ? v
          : [
              {
                ...EMPTY_VARIANT,
                text: campaign.config.content ?? "",
              },
            ],
      );
      setPicked(new Set(campaign.accountIds));
      setTargets(campaign.targets);
      setTargetGroupId(campaign.config.inviteGroupId ?? "");
      const sourceLinks = campaign.config.sourceLinks ?? [];
      if (campaign.config.action === "join_group") {
        setLinks(campaign.targets);
        setCheckedLinks(new Set(campaign.targets));
      } else if (campaign.kind === "group_link" && sourceLinks.length > 0) {
        setLinks(sourceLinks);
        setCheckedLinks(new Set(sourceLinks));
      } else if (campaign.kind === "group_link" && campaign.targets.length > 0) {
        // Yêu cầu cũ chưa lưu link gốc — không còn biết tên/nhóm gốc để hiển
        // thị lại, nên hiện tạm bằng chính uid; người dùng vẫn thấy đúng số
        // lượng & có thể bỏ chọn từng người.
        setMembers(
          campaign.targets.map((id) => ({
            id,
            name: id,
            avatar: "",
            role: "member",
            groupKey: "restored",
            groupName: "(đã lưu trước đó)",
            isFriend: false,
          })),
        );
        setLinkView("members");
      }
      // Kích hoạt effect bên dưới để tự chạy lại link/nhóm, lấy thông tin mới nhất.
      setRestoredCampaign(campaign);
    })();
    return () => {
      alive = false;
    };
  }, [editId]);

  const autoRefreshedRef = useRef(false);
  useEffect(() => {
    if (!restoredCampaign || !accounts || autoRefreshedRef.current) return;
    autoRefreshedRef.current = true;
    const c = restoredCampaign;
    if (c.kind === "group_member" || c.kind === "group") {
      void loadGroups(c.accountIds);
    } else if (c.kind === "group_link") {
      if (c.config.action === "invite_group_member") void loadGroups(c.accountIds);
      const sourceLinks = c.config.sourceLinks ?? [];
      const accountId = c.accountIds[0];
      if (sourceLinks.length > 0 && accountId) {
        void resolveLinkMembers(accountId, sourceLinks);
      }
    } else if (c.config.action === "invite_group_member") {
      // phone / friend làm nguồn — vẫn cần tải lại nhóm đích.
      void loadGroups(c.accountIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoredCampaign, accounts]);

  /** Load the friend lists of every ticked account (deduped by user id). */
  async function loadFriends() {
    setError(null);
    if (picked.size === 0)
      return setError("Chọn ít nhất một tài khoản để tải bạn bè");
    setFriendsLoading(true);
    try {
      const seen = new Set<string>();
      const rows: FriendRow[] = [];
      for (const acc of accounts ?? []) {
        if (!picked.has(acc.zaloId)) continue;
        const list = await apiGet<ZaloUser[]>(
          `/api/zalo/friends?account=${acc.zaloId}`,
        );
        for (const u of list) {
          const id = String(u.userId ?? u.uid ?? "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          rows.push({
            id,
            name: u.displayName ?? u.zaloName ?? id,
            avatar: u.avatar ?? "",
            owner: acc.fullName || acc.zaloId,
          });
        }
      }
      setFriends(rows);
      setFriendsLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFriendsLoading(false);
    }
  }

  /** Load every group of the ticked accounts, plus their friend ids so the
   * member table can show who is already a friend. `accountIds` overrides
   * `picked` — dùng khi tự động tải lại lúc vào sửa yêu cầu. */
  async function loadGroups(accountIds?: string[]) {
    setError(null);
    const ids = accountIds ?? [...picked];
    if (ids.length === 0)
      return setError("Chọn ít nhất một tài khoản để tải nhóm");
    setGroupsLoading(true);
    setPickedGroups(new Set());
    setLoadedGroups(new Set());
    setMembers([]);
    try {
      const rows: GroupRow[] = [];
      const fids = new Set<string>();
      for (const acc of accounts ?? []) {
        if (!ids.includes(acc.zaloId)) continue;
        const list = await apiGet<ZaloGroup[]>(
          `/api/zalo/groups?account=${acc.zaloId}`,
        );
        for (const g of list) {
          const id = String(g.groupId ?? "");
          if (!id) continue;
          rows.push({
            key: `${acc.zaloId}:${id}`,
            id,
            name: g.name ?? "Nhóm",
            avatar: String(g.fullAvt ?? g.avt ?? ""),
            owner: acc.fullName || acc.zaloId,
            ownerId: acc.zaloId,
            total: Number(g.totalMember) || 0,
          });
        }
        try {
          const fr = await apiGet<ZaloUser[]>(
            `/api/zalo/friends?account=${acc.zaloId}`,
          );
          for (const u of fr) fids.add(String(u.userId ?? u.uid ?? ""));
        } catch {
          /* friend flag is best-effort (Zalo may rate-limit) */
        }
      }
      setGroups(rows);
      setFriendIds(fids);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGroupsLoading(false);
    }
  }

  function addLinks(raw: string) {
    const incoming = splitRaw(raw);
    if (incoming.length === 0) return;
    setLinks((cur) => [...new Set([...cur, ...incoming])]);
    setCheckedLinks((cur) => new Set([...cur, ...incoming]));
  }

  function clearLinks() {
    setLinks([]);
    setCheckedLinks(new Set());
    setMembers([]);
    setTargets([]);
    setLoadedGroups(new Set());
    setLinkView("links");
  }

  /** Resolve the members of every ticked group link not loaded yet. */
  async function loadLinkMembers() {
    const accountId = [...picked][0];
    if (!accountId) return setError("Chọn một tài khoản để đọc nhóm");
    const todo = links.filter(
      (l) => checkedLinks.has(l) && !loadedGroups.has(l),
    );
    if (todo.length === 0) {
      if (members.length > 0) return setLinkView("members");
      return setError(
        checkedLinks.size === 0
          ? "Tick chọn ít nhất một link nhóm"
          : "Các link đã chọn đã được tải thành viên",
      );
    }
    await resolveLinkMembers(accountId, todo);
  }

  /** Lõi tải thành viên từ danh sách link — dùng chung cho nút "Tải thành
   * viên" và cho việc tự chạy lại link khi vào sửa yêu cầu (accountId/links
   * truyền tường minh, không phụ thuộc state `picked`/`links` hiện tại). */
  async function resolveLinkMembers(accountId: string, todo: string[]) {
    setError(null);
    setMembersLoading(true);
    try {
      let fids = friendIds;
      if (fids.size === 0) {
        try {
          const fr = await apiGet<ZaloUser[]>(
            `/api/zalo/friends?account=${accountId}`,
          );
          fids = new Set(fr.map((u) => String(u.userId ?? u.uid ?? "")));
          setFriendIds(fids);
        } catch {
          /* friend flag is best-effort */
        }
      }
      let loaded = 0;
      for (const link of todo) {
        try {
          const res = await apiGet<GroupLinkMembersResult>(
            `/api/zalo/group-link-members?account=${accountId}&link=${encodeURIComponent(link)}${autoJoin ? "&join=1" : ""}`,
          );
          if (res.joinError) {
            setError(`${link}: không tham gia được nhóm — ${res.joinError}`);
          }
          if (res.locked) {
            setError(
              `${link}: nhóm "${res.name}" khóa xem danh sách thành viên nên không thể tải (${res.total} thành viên)`,
            );
            continue;
          }
          setMembers((cur) => [
            ...cur.filter((m) => m.groupKey !== link),
            ...res.members.map((m): MemberRow => ({
              ...m,
              groupKey: link,
              groupName: res.name,
              isFriend: fids.has(m.id),
            })),
          ]);
          // Everyone loaded from a link starts ticked, like the reference.
          setTargets((cur) => [
            ...new Set([...cur, ...res.members.map((m) => m.id)]),
          ]);
          setLoadedGroups((s) => new Set(s).add(link));
          loaded++;
        } catch (e) {
          setError(`${link}: ${(e as Error).message}`);
        }
      }
      if (loaded > 0) setLinkView("members");
    } finally {
      setMembersLoading(false);
    }
  }

  /** Ticking a group only selects it; members load via "Tải thành viên". */
  function toggleGroup(g: GroupRow) {
    const on = !pickedGroups.has(g.key);
    setPickedGroups((s) => {
      const n = new Set(s);
      if (on) n.add(g.key);
      else n.delete(g.key);
      return n;
    });
    if (!on) {
      setMembers((cur) => cur.filter((m) => m.groupKey !== g.key));
      setLoadedGroups((s) => {
        const n = new Set(s);
        n.delete(g.key);
        return n;
      });
    }
  }

  /** Load members for every ticked group that has not been loaded yet. */
  async function loadMembers() {
    setError(null);
    const todo = groups.filter(
      (g) => pickedGroups.has(g.key) && !loadedGroups.has(g.key),
    );
    if (todo.length === 0)
      return setError(
        pickedGroups.size === 0
          ? "Tick chọn ít nhất một nhóm để tải thành viên"
          : "Các nhóm đã chọn đã được tải thành viên",
      );
    setMembersLoading(true);
    try {
      for (const g of todo) {
        const res = await apiGet<GroupMembersResult>(
          `/api/zalo/group-members?account=${g.ownerId}&groupId=${g.id}`,
        );
        setMembers((cur) => [
          ...cur.filter((m) => m.groupKey !== g.key),
          ...res.members.map((m): MemberRow => ({
            ...m,
            groupKey: g.key,
            groupName: g.name,
            isFriend: friendIds.has(m.id),
          })),
        ]);
        setLoadedGroups((s) => new Set(s).add(g.key));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMembersLoading(false);
    }
  }

  /** "Chọn từ X đến Y": tick rows X..Y of the (filtered) member table. */
  function selectRange() {
    const from = Math.max(1, Number(rangeFrom) || 1);
    const to = Math.min(
      shownMembers.length,
      Number(rangeTo) || shownMembers.length,
    );
    const ids = shownMembers.slice(from - 1, to).map((m) => m.id);
    setTargets((cur) => [...new Set([...cur, ...ids])]);
  }

  function set<K extends keyof typeof cfg>(key: K, value: (typeof cfg)[K]) {
    setCfg((c) => ({ ...c, [key]: value }));
  }

  /** Load the pending friend requests sent by the (single) chosen account. */
  async function loadSent() {
    setError(null);
    const accId = [...picked][0];
    if (!accId)
      return setError("Chọn một tài khoản để tải yêu cầu kết bạn đã gửi");
    setSentLoading(true);
    try {
      const acc = (accounts ?? []).find((a) => a.zaloId === accId);
      const list = await apiGet<SentRequest[]>(
        `/api/zalo/sent-requests?account=${accId}`,
      );
      setSent(list.map((r) => ({ ...r, owner: acc?.fullName || accId })));
      setSentLoaded(true);
      setTargets([]);
      setSentPage(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSentLoading(false);
    }
  }

  function togglePick(id: string) {
    if (radioAccount) {
      setPicked(new Set([id])); // thu hồi: one sending account at a time
      return;
    }
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addTargets(raw: string) {
    const incoming = splitRaw(raw);
    if (incoming.length === 0) return;
    setTargets((cur) => {
      const seen = new Set(cur);
      const merged = [...cur];
      for (const t of incoming) {
        if (seen.has(t)) continue;
        seen.add(t);
        merged.push(t);
      }
      return merged;
    });
  }

  function removeChecked() {
    setTargets((cur) => cur.filter((t) => !checkedTargets.has(t)));
    setCheckedTargets(new Set());
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (kind === "group_link") addLinks(text);
    else addTargets(text);
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Tách 1 dòng CSV (hỗ trợ ô có dấu phẩy/ngoặc kép — khớp file do trang
   * "Backup bạn bè" xuất ra). */
  function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQuotes = false;
        } else cur += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out;
  }

  async function onBackupFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = (await file.text()).replace(/^﻿/, "");
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const rows = lines
      .slice(1) // bỏ dòng tiêu đề "ID,Tên,SĐT,Bạn của"
      .map((line) => {
        const [id, name, phone, owner] = parseCsvLine(line);
        return {
          id: (id ?? "").trim(),
          name: (name ?? "").trim() || (id ?? "").trim(),
          phone: (phone ?? "").trim(),
          owner: (owner ?? "").trim(),
        };
      })
      .filter((r) => r.id);
    setBackupRows(rows);
    setTargets([]);
    if (backupFileRef.current) backupFileRef.current.value = "";
  }

  const targetSet = new Set(targets);
  const shownGroups = groups.filter((g) =>
    textMatch(g.name, groupF.filters.name),
  );
  const shownMembers = [...members]
    .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role])
    .filter(
      (m) =>
        textMatch(m.name, memberF.filters.name) &&
        textMatch(ROLE_LABEL[m.role], memberF.filters.role) &&
        textMatch(m.groupName, memberF.filters.group) &&
        textMatch(m.isFriend ? "có" : "không", memberF.filters.friend),
    );
  const shownFriends = friends.filter(
    (f) =>
      textMatch(f.name, friendF.filters.name) &&
      textMatch(f.owner, friendF.filters.owner),
  );

  const memberPageStart =
    (Math.min(
      memberPage,
      Math.max(1, Math.ceil(shownMembers.length / memberPageSize)),
    ) -
      1) *
    memberPageSize;
  const pagedMembers = shownMembers.slice(
    memberPageStart,
    memberPageStart + memberPageSize,
  );

  const shownSent = sent.filter((r) => textMatch(r.name, sentF.filters.name));
  const sentStart =
    (Math.min(
      sentPage,
      Math.max(1, Math.ceil(shownSent.length / sentPageSize)),
    ) -
      1) *
    sentPageSize;
  const pagedSent = shownSent.slice(sentStart, sentStart + sentPageSize);

  const validVariants = variants.filter((v) =>
    v.dynamicEnabled ? v.template.trim() : v.text.trim(),
  );

  async function save() {
    setError(null);
    const sendTargets = isJoin
      ? links.filter((l) => checkedLinks.has(l))
      : isMsgGroup
        ? [
            ...new Set(
              groups.filter((g) => pickedGroups.has(g.key)).map((g) => g.id),
            ),
          ]
        : targets;
    if (!name.trim()) return setError("Nhập tên yêu cầu");
    if (picked.size === 0) return setError("Chọn ít nhất một tài khoản gửi");
    if (sendTargets.length === 0)
      return setError(
        isMsgGroup
          ? "Chọn ít nhất một nhóm"
          : isJoin
            ? "Chọn ít nhất một link nhóm"
            : kind === "sent_request"
              ? "Chọn ít nhất một yêu cầu để thu hồi"
              : kind === "friend"
                ? "Chọn ít nhất một người bạn"
                : kind === "group_member" || kind === "group_link"
                  ? "Chọn ít nhất một thành viên"
                  : kind === "backup_file"
                    ? "Chọn ít nhất một người trong file backup"
                    : `Nhập ít nhất một ${meta.col.toLowerCase()}`,
      );
    if (isInvite && !targetGroupId) return setError("Chọn nhóm đích để mời vào");
    if (
      action !== "delete_friend" &&
      !isRevoke &&
      !isInvite &&
      validVariants.length === 0
    )
      return setError(
        action === "add_friend"
          ? "Nhập nội dung nhắn tin kết bạn"
          : "Nhập ít nhất một nội dung tin nhắn",
      );

    const first = validVariants[0];
    const config = {
      ...cfg,
      action,
      messageVariants: validVariants,
      inviteGroupId: targetGroupId,
      sourceLinks: kind === "group_link" ? links : [],
      content: first
        ? first.dynamicEnabled
          ? first.template
          : first.text
        : "",
    };

    setSaving(true);
    try {
      if (editId) {
        await apiSend<Campaign>(`/api/zalo/campaigns/${editId}`, "PATCH", {
          name: name.trim(),
          config,
          accountIds: [...picked],
          targets: sendTargets,
        });
        router.push(`/campaigns?kind=${kind}&action=${action}`);
      } else {
        const created = await apiSend<Campaign>("/api/zalo/campaigns", "POST", {
          name: name.trim(),
          kind,
          config,
          accountIds: [...picked],
          targets: sendTargets,
        });
        router.push(`/campaigns/${created.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  const friendCard = (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">
        Danh sách bạn bè{" "}
        <span className="font-normal text-muted">
          (Đã chọn: {targets.length})
        </span>
      </h2>
      <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-left text-xs text-muted">
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={
                    shownFriends.length > 0 &&
                    shownFriends.every((f) => targetSet.has(f.id))
                  }
                  onChange={(e) => {
                    const ids = new Set(shownFriends.map((f) => f.id));
                    setTargets((cur) => {
                      const rest = cur.filter((t) => !ids.has(t));
                      return e.target.checked ? [...rest, ...ids] : rest;
                    });
                  }}
                />
              </th>
              <th className="w-10 px-2 py-2 font-medium">#</th>
              <th className="w-16 px-2 py-2 font-medium">Hình ảnh</th>
              <FilterTh
                className="px-2 py-2"
                value={friendF.filters.name ?? ""}
                onChange={(v) => friendF.setFilter("name", v)}
              >
                Tên
              </FilterTh>
              <FilterTh
                className="px-2 py-2"
                value={friendF.filters.owner ?? ""}
                onChange={(v) => friendF.setFilter("owner", v)}
              >
                Bạn của
              </FilterTh>
            </tr>
          </thead>
          <tbody>
            {shownFriends.map((f, i) => (
              <tr key={f.id} className="border-t border-border">
                <td className="px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={targetSet.has(f.id)}
                    onChange={() =>
                      setTargets((cur) =>
                        cur.includes(f.id)
                          ? cur.filter((x) => x !== f.id)
                          : [...cur, f.id],
                      )
                    }
                  />
                </td>
                <td className="px-2 py-1.5 text-muted">{i + 1}</td>
                <td className="px-2 py-1.5">
                  {f.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.avatar}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="block h-7 w-7 rounded-full border border-border bg-surface" />
                  )}
                </td>
                <td className="max-w-[160px] truncate px-2 py-1.5">{f.name}</td>
                <td className="max-w-[140px] truncate px-2 py-1.5">
                  {f.owner}
                </td>
              </tr>
            ))}
            {shownFriends.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-8 text-center text-muted">
                  {friendsLoaded
                    ? "Không có bạn bè khớp bộ lọc"
                    : "Chọn tài khoản và bấm Tải bạn bè"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title={
          isInvite
            ? `${editId ? "Sửa" : "Tạo"} yêu cầu - ${
                kind === "group_member"
                  ? "Mời thành viên nhóm đã tham gia vào nhóm"
                  : kind === "group_link"
                    ? "Mời thành viên nhóm khác vào nhóm"
                    : kind === "friend"
                      ? "Mời bạn bè vào nhóm"
                      : "Mời SDT vào nhóm"
              }`
            : `${editId ? "Sửa" : "Tạo"} yêu cầu · ${ACTION_LABEL[action]}${radioAccount || isJoin ? "" : ` · ${KIND_LABEL[kind]}`}${kind === "group_member" ? " (kể cả nhóm ẩn)" : ""}`
        }
        action={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() =>
                router.push(`/campaigns?kind=${kind}&action=${action}`)
              }
            >
              ← Quay lại
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu"}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-col">
              <Row label="Tên yêu cầu" required>
                <input
                  className={inputCls}
                  list="campaign-names"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Sale 22/6"
                />
                <datalist id="campaign-names">
                  {(allCampaigns ?? []).map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </Row>

              <Row label="Đổi tài khoản nếu lỗi">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <NumInput
                    value={cfg.switchAccountOnError}
                    min={1}
                    onChange={(n) => set("switchAccountOnError", n)}
                  />
                  lần
                </div>
              </Row>

              <Row label="Thời gian tạm dừng từ">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <NumInput
                    value={cfg.pauseFrom}
                    onChange={(n) => set("pauseFrom", n)}
                  />
                  đến
                  <NumInput
                    value={cfg.pauseTo}
                    onChange={(n) => set("pauseTo", n)}
                  />
                  giây
                </div>
              </Row>

              <Row label="Dừng lại nếu gửi thành công">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <NumInput
                    value={cfg.stopAfterSuccess}
                    onChange={(n) => set("stopAfterSuccess", n)}
                  />
                  lần, thời gian tạm dừng
                  <NumInput
                    value={cfg.stopAfterSuccessPause}
                    onChange={(n) => set("stopAfterSuccessPause", n)}
                  />
                  giây
                </div>
              </Row>

              <Row label="Giới hạn số lượng thực thi" required>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <NumInput
                    value={cfg.dailyLimit}
                    min={1}
                    onChange={(n) => set("dailyLimit", n)}
                  />
                  lần / 1
                  <select
                    className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-zalo"
                    value={cfg.dailyLimitUnit}
                    onChange={(e) =>
                      set("dailyLimitUnit", e.target.value as "hour" | "day")
                    }
                  >
                    <option value="hour">Giờ</option>
                    <option value="day">Ngày</option>
                  </select>
                </div>
              </Row>

              {isJoin && (
                <Row label="">
                  <Checkbox
                    label="Chia đều vào các nhóm"
                    checked={cfg.distributeEvenly}
                    onChange={(v) => set("distributeEvenly", v)}
                  />
                </Row>
              )}

              {!singleAccount && !isJoin && (
                <>
                  {!isMsgGroup && (
                    <Row label="">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {kind !== "friend" && isMessage && (
                          <Checkbox
                            label="Tự động kết bạn nếu chưa là bạn"
                            checked={cfg.autoAddFriend}
                            onChange={(v) => set("autoAddFriend", v)}
                          />
                        )}
                        <Checkbox
                          label={`Chia đều ${meta.col.toLowerCase()}`}
                          checked={cfg.distributeEvenly}
                          onChange={(v) => set("distributeEvenly", v)}
                        />
                        <Checkbox
                          label={`Lọc trùng ${meta.col.toLowerCase()}`}
                          checked={cfg.dedupeTargets}
                          onChange={(v) => set("dedupeTargets", v)}
                        />
                      </div>
                    </Row>
                  )}

                  {(isMessage || isMsgGroup) && (
                    <Row label="Nhắn tin kèm ảnh / video">
                      <AttachmentPicker
                        paths={cfg.attachments}
                        onChange={(paths) => set("attachments", paths)}
                      />
                    </Row>
                  )}

                  {!isInvite && (
                    <>
                      <Row label="Tự động chèn emoji">
                        <Toggle
                          checked={cfg.autoEmoji}
                          onChange={(v) => set("autoEmoji", v)}
                        />
                      </Row>

                      <Row label="Nội dung nhắn tin" required>
                        <ContentEditor
                          variants={variants}
                          onChange={setVariants}
                        />
                      </Row>
                    </>
                  )}

                  {isMessage && (
                    <Row label="Soạn tin động">
                      <div className="flex items-center gap-3">
                        <Toggle
                          checked={variants[0]?.dynamicEnabled ?? false}
                          onChange={(dyn) =>
                            setVariants(
                              variants.map((v, i) =>
                                i === 0 ? { ...v, dynamicEnabled: dyn } : v,
                              ),
                            )
                          }
                        />
                        <span className="text-xs text-muted">
                          Bật để cấu hình tin nhắn động (thay {"{{zaloName}}"},{" "}
                          {"{{prefix}}"})
                        </span>
                      </div>
                    </Row>
                  )}
                </>
              )}
            </div>
          </Card>
          {isInvite && kind === "group_member" && (
            <p className="text-xs font-semibold text-muted">Nhóm nguồn</p>
          )}
          {(kind === "group_member" || kind === "group") && (
            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  Danh sách nhóm của tôi{" "}
                  <span className="font-normal text-muted">
                    (đã chọn {pickedGroups.size})
                  </span>
                </h2>
                {kind === "group_member" && (
                  <Button
                    size="sm"
                    onClick={() => void loadMembers()}
                    disabled={membersLoading}
                  >
                    {membersLoading ? "Đang tải…" : "Tải thành viên"}
                  </Button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-xs text-muted">
                      <th className="w-8 px-2 py-2" />
                      <th className="w-10 px-2 py-2 font-medium">#</th>
                      <th className="w-16 px-2 py-2 font-medium">Hình ảnh</th>
                      <FilterTh
                        className="px-2 py-2"
                        value={groupF.filters.name ?? ""}
                        onChange={(v) => groupF.setFilter("name", v)}
                      >
                        Tên nhóm
                      </FilterTh>
                      <th className="px-2 py-2 font-medium">Nhóm của</th>
                      <th className="px-2 py-2 text-right font-medium">
                        Số thành viên
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownGroups.map((g, i) => (
                      <tr key={g.key} className="border-t border-border">
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={pickedGroups.has(g.key)}
                            onChange={() => toggleGroup(g)}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-muted">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          {g.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={g.avatar}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className="block h-8 w-8 rounded-full border border-border bg-surface" />
                          )}
                        </td>
                        <td className="max-w-[200px] truncate px-2 py-1.5">
                          {g.name}
                        </td>
                        <td className="max-w-[140px] truncate px-2 py-1.5">
                          {g.owner}
                        </td>
                        <td className="px-2 py-1.5 text-right">{g.total}</td>
                      </tr>
                    ))}
                    {shownGroups.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-2 py-8 text-center text-muted"
                        >
                          {groups.length === 0
                            ? "Chọn tài khoản và bấm Tải nhóm"
                            : "Không có nhóm khớp bộ lọc"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {isInvite && (
            <>
              {kind === "group_member" && (
                <p className="text-xs font-semibold text-muted">Nhóm đích</p>
              )}
              <Card>
                <h2 className="mb-3 text-sm font-semibold">
                  Danh sách nhóm của tôi{" "}
                  <span className="font-normal text-muted">
                    (đã chọn {targetGroupId ? 1 : 0})
                  </span>
                </h2>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-surface">
                      <tr className="text-left text-xs text-muted">
                        <th className="w-8 px-2 py-2" />
                        <th className="w-10 px-2 py-2 font-medium">#</th>
                        <th className="w-16 px-2 py-2 font-medium">
                          Hình ảnh
                        </th>
                        <th className="px-2 py-2 font-medium">Tên nhóm</th>
                        <th className="px-2 py-2 font-medium">Nhóm của</th>
                        <th className="px-2 py-2 text-right font-medium">
                          Số thành viên
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g, i) => (
                        <tr key={g.key} className="border-t border-border">
                          <td className="px-2 py-1.5">
                            <input
                              type="radio"
                              checked={targetGroupId === g.id}
                              onChange={() => setTargetGroupId(g.id)}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-muted">{i + 1}</td>
                          <td className="px-2 py-1.5">
                            {g.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={g.avatar}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="block h-8 w-8 rounded-full border border-border bg-surface" />
                            )}
                          </td>
                          <td className="max-w-[200px] truncate px-2 py-1.5">
                            {g.name}
                          </td>
                          <td className="max-w-[140px] truncate px-2 py-1.5">
                            {g.owner}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {g.total}
                          </td>
                        </tr>
                      ))}
                      {groups.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-2 py-8 text-center text-muted"
                          >
                            Chọn tài khoản và bấm Tải nhóm
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
          {kind === "sent_request" && (
            <Card>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface">
                    <tr className="text-left text-xs text-muted">
                      <th className="w-8 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={
                            shownSent.length > 0 &&
                            shownSent.every((r) => targetSet.has(r.id))
                          }
                          onChange={(e) => {
                            const ids = new Set(shownSent.map((r) => r.id));
                            setTargets((cur) => {
                              const rest = cur.filter((t) => !ids.has(t));
                              return e.target.checked
                                ? [...rest, ...ids]
                                : rest;
                            });
                          }}
                        />
                      </th>
                      <th className="w-10 px-2 py-2 font-medium">#</th>
                      <th className="w-16 px-2 py-2 font-medium">Hình ảnh</th>
                      <FilterTh
                        className="px-2 py-2"
                        value={sentF.filters.name ?? ""}
                        onChange={(v) => sentF.setFilter("name", v)}
                      >
                        Tên
                      </FilterTh>
                      <th className="px-2 py-2 font-medium">Người gửi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedSent.map((r, i) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={targetSet.has(r.id)}
                            onChange={() =>
                              setTargets((cur) =>
                                cur.includes(r.id)
                                  ? cur.filter((x) => x !== r.id)
                                  : [...cur, r.id],
                              )
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5 text-muted">
                          {sentStart + i + 1}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.avatar}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className="block h-8 w-8 rounded-full border border-border bg-surface" />
                          )}
                        </td>
                        <td className="max-w-[180px] truncate px-2 py-1.5">
                          {r.name}
                        </td>
                        <td className="px-2 py-1.5">{r.owner}</td>
                      </tr>
                    ))}
                    {shownSent.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-2 py-8 text-center text-muted"
                        >
                          {sentLoaded
                            ? "Không có yêu cầu kết bạn nào đã gửi"
                            : "Chọn tài khoản và bấm Tải yêu cầu kết bạn đã gửi"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                total={shownSent.length}
                page={sentPage}
                pageSize={sentPageSize}
                onPage={setSentPage}
                onPageSize={(n) => {
                  setSentPageSize(n);
                  setSentPage(1);
                }}
              />
            </Card>
          )}
          {kind === "friend" && isDelete && friendCard}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">
                Danh sách tài khoản{" "}
                <span className="text-muted">(đã chọn {picked.size})</span>
              </h2>
              {isRevoke && (
                <Button size="sm" onClick={loadSent} disabled={sentLoading}>
                  {sentLoading ? "Đang tải…" : "Tải yêu cầu kết bạn đã gửi"}
                </Button>
              )}
              {kind === "friend" && (
                <Button size="sm" onClick={loadFriends} disabled={friendsLoading}>
                  {friendsLoading ? "Đang tải…" : "Tải bạn bè"}
                </Button>
              )}
              {(kind === "group_member" ||
                kind === "group" ||
                (isInvite && kind === "group_link")) && (
                <Button size="sm" onClick={() => loadGroups()} disabled={groupsLoading}>
                  {groupsLoading ? "Đang tải…" : "Tải nhóm"}
                </Button>
              )}
              {isInvite && (kind === "phone" || kind === "friend") && (
                <Button size="sm" onClick={() => loadGroups()} disabled={groupsLoading}>
                  {groupsLoading ? "Đang tải…" : "Tải nhóm đích"}
                </Button>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="py-2">
                      {!radioAccount && (
                        <input
                          type="checkbox"
                          checked={
                            filteredAccounts.length > 0 &&
                            filteredAccounts.every((a) => picked.has(a.zaloId))
                          }
                          onChange={(e) =>
                            setPicked((s) => {
                              const n = new Set(s);
                              for (const a of filteredAccounts) {
                                if (e.target.checked) n.add(a.zaloId);
                                else n.delete(a.zaloId);
                              }
                              return n;
                            })
                          }
                        />
                      )}
                    </th>
                    <FilterTh
                      className="py-2"
                      value={acctF.filters.phone ?? ""}
                      onChange={(v) => acctF.setFilter("phone", v)}
                    >
                      Số điện thoại
                    </FilterTh>
                    <FilterTh
                      className="py-2"
                      value={acctF.filters.name ?? ""}
                      onChange={(v) => acctF.setFilter("name", v)}
                    >
                      Tên
                    </FilterTh>
                    <FilterTh
                      className="py-2"
                      value={acctF.filters.status ?? ""}
                      onChange={(v) => acctF.setFilter("status", v)}
                    >
                      Trạng thái
                    </FilterTh>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((a) => (
                    <tr key={a.zaloId} className="border-t border-border">
                      <td className="py-2">
                        <input
                          type={radioAccount ? "radio" : "checkbox"}
                          checked={picked.has(a.zaloId)}
                          onChange={() => togglePick(a.zaloId)}
                        />
                      </td>
                      <td className="py-2">{a.phone || "—"}</td>
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          {a.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={a.avatarUrl}
                              alt=""
                              className="h-6 w-6 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="h-6 w-6 shrink-0 rounded-full bg-background" />
                          )}
                          <span className="truncate">
                            {a.fullName || a.zaloId}
                          </span>
                        </span>
                      </td>
                      <td className="py-2">
                        {a.connected ? (
                          <Badge tone="success">Hoạt động</Badge>
                        ) : (
                          <Badge tone="warning">Offline</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted">
                        {(accounts ?? []).length === 0
                          ? "Chưa có tài khoản"
                          : "Không có tài khoản khớp bộ lọc"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {kind === "sent_request" ||
          kind === "group" ||
          (kind === "friend" && isDelete) ? null : kind === "group_link" ? (
            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  Danh sách nhóm khác{" "}
                  <span className="font-normal text-muted">
                    (Đã chọn:{" "}
                    {linkView === "members"
                      ? targets.length
                      : checkedLinks.size}
                    )
                  </span>
                </h2>
                <div className="flex gap-2">
                  {linkView === "members" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLinkView("links")}
                    >
                      Trở lại
                    </Button>
                  )}
                  {!isJoin && (
                    <label
                      className="flex items-center gap-1.5 text-xs text-muted"
                      title="Zalo chỉ cho thấy đủ thành viên khi tài khoản đã ở trong nhóm. Bật để tự tham gia các nhóm chưa vào."
                    >
                      <input
                        type="checkbox"
                        checked={autoJoin}
                        onChange={(e) => setAutoJoin(e.target.checked)}
                      />
                      Tự tham gia nhóm
                    </label>
                  )}
                  {!isJoin && (
                    <Button
                      size="sm"
                      onClick={() => void loadLinkMembers()}
                      disabled={membersLoading}
                    >
                      {membersLoading ? "Đang tải…" : "Tải thành viên"}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="h-8 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-zalo"
                  value={targetInput}
                  placeholder="Nhập link nhóm"
                  onChange={(e) => setTargetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLinks(targetInput);
                      setTargetInput("");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    addLinks(targetInput);
                    setTargetInput("");
                  }}
                  className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg bg-zalo px-3 text-sm font-medium text-white hover:bg-zalo-dark"
                >
                  + Thêm
                </button>
                <span className="shrink-0 text-xs text-muted">hoặc</span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-border px-3 text-xs hover:bg-background"
                >
                  <Icon name="upload" size={13} /> Tải tệp lên
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt"
                  hidden
                  onChange={onFile}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-danger">
                  Định dạng file .txt, mỗi link 1 dòng.
                </p>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={clearLinks}
                  disabled={links.length === 0}
                >
                  Xóa tất cả
                </Button>
              </div>

              {linkView === "links" ? (
                <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-surface">
                      <tr className="text-left text-xs text-muted">
                        <th className="w-8 px-2 py-2">
                          <input
                            type="checkbox"
                            checked={
                              links.length > 0 &&
                              links.every((l) => checkedLinks.has(l))
                            }
                            onChange={(e) =>
                              setCheckedLinks(
                                e.target.checked ? new Set(links) : new Set(),
                              )
                            }
                          />
                        </th>
                        <th className="w-10 px-2 py-2 font-medium">#</th>
                        <FilterTh
                          className="px-2 py-2"
                          value={groupF.filters.name ?? ""}
                          onChange={(v) => groupF.setFilter("name", v)}
                        >
                          Link nhóm
                        </FilterTh>
                      </tr>
                    </thead>
                    <tbody>
                      {links
                        .filter((l) => textMatch(l, groupF.filters.name))
                        .map((l, i) => (
                          <tr key={l} className="border-t border-border">
                            <td className="px-2 py-1.5">
                              <input
                                type="checkbox"
                                checked={checkedLinks.has(l)}
                                onChange={() =>
                                  setCheckedLinks((cur) => {
                                    const n = new Set(cur);
                                    if (n.has(l)) n.delete(l);
                                    else n.add(l);
                                    return n;
                                  })
                                }
                              />
                            </td>
                            <td className="px-2 py-1.5 text-muted">{i + 1}</td>
                            <td className="max-w-[260px] truncate px-2 py-1.5">
                              {l}
                            </td>
                          </tr>
                        ))}
                      {links.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-2 py-6 text-center text-muted"
                          >
                            Trống
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                    Chọn từ
                    <input
                      className="h-8 w-20 rounded-lg border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-zalo"
                      inputMode="numeric"
                      placeholder="1"
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                    />
                    đến
                    <input
                      className="h-8 w-20 rounded-lg border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-zalo"
                      inputMode="numeric"
                      placeholder={String(shownMembers.length || 100)}
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                    />
                    <Button size="sm" onClick={selectRange}>
                      Chọn
                    </Button>
                  </div>
                  <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-surface">
                        <tr className="text-left text-xs text-muted">
                          <th className="w-8 px-2 py-2">
                            <input
                              type="checkbox"
                              checked={
                                shownMembers.length > 0 &&
                                shownMembers.every((m) => targetSet.has(m.id))
                              }
                              onChange={(e) => {
                                const ids = new Set(
                                  shownMembers.map((m) => m.id),
                                );
                                setTargets((cur) => {
                                  const rest = cur.filter((t) => !ids.has(t));
                                  return e.target.checked
                                    ? [...rest, ...ids]
                                    : rest;
                                });
                              }}
                            />
                          </th>
                          <th className="w-10 px-2 py-2 font-medium">#</th>
                          <FilterTh
                            className="px-2 py-2"
                            value={memberF.filters.name ?? ""}
                            onChange={(v) => memberF.setFilter("name", v)}
                          >
                            Người dùng
                          </FilterTh>
                          <FilterTh
                            className="px-2 py-2"
                            value={memberF.filters.role ?? ""}
                            onChange={(v) => memberF.setFilter("role", v)}
                          >
                            Vai trò
                          </FilterTh>
                          <FilterTh
                            className="px-2 py-2"
                            value={memberF.filters.friend ?? ""}
                            onChange={(v) => memberF.setFilter("friend", v)}
                          >
                            Là bạn bè
                          </FilterTh>
                          <th className="px-2 py-2 font-medium">Link nhóm</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedMembers.map((m, i) => (
                          <tr
                            key={`${m.groupKey}:${m.id}`}
                            className="border-t border-border"
                          >
                            <td className="px-2 py-1.5">
                              <input
                                type="checkbox"
                                checked={targetSet.has(m.id)}
                                onChange={() =>
                                  setTargets((cur) =>
                                    cur.includes(m.id)
                                      ? cur.filter((x) => x !== m.id)
                                      : [...cur, m.id],
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 py-1.5 text-muted">
                              {memberPageStart + i + 1}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className="flex items-center gap-2">
                                {m.avatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={m.avatar}
                                    alt=""
                                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="h-8 w-8 shrink-0 rounded-full border border-border bg-surface" />
                                )}
                                <span className="max-w-[140px] truncate">
                                  {m.name}
                                </span>
                              </span>
                            </td>
                            <td className="px-2 py-1.5">
                              {ROLE_LABEL[m.role]}
                            </td>
                            <td className="px-2 py-1.5">
                              {m.isFriend ? "Có" : "Không"}
                            </td>
                            <td className="max-w-[160px] truncate px-2 py-1.5">
                              {m.groupKey}
                            </td>
                          </tr>
                        ))}
                        {shownMembers.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-2 py-8 text-center text-muted"
                            >
                              {membersLoading
                                ? "Đang tải thành viên…"
                                : "Không có thành viên"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    total={shownMembers.length}
                    page={memberPage}
                    pageSize={memberPageSize}
                    onPage={setMemberPage}
                    onPageSize={(n) => {
                      setMemberPageSize(n);
                      setMemberPage(1);
                    }}
                  />
                </>
              )}
            </Card>
          ) : kind === "group_member" ? (
            <Card>
              <h2 className="mb-3 text-sm font-semibold">
                Danh sách thành viên{" "}
                <span className="font-normal text-muted">
                  (Đã chọn: {targets.length})
                  {membersLoading ? " · đang tải…" : ""}
                </span>
              </h2>
              <div className="mb-3 flex items-center gap-2 text-sm text-muted">
                Chọn từ
                <input
                  className="h-8 w-20 rounded-lg border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-zalo"
                  inputMode="numeric"
                  placeholder="1"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                />
                đến
                <input
                  className="h-8 w-20 rounded-lg border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-zalo"
                  inputMode="numeric"
                  placeholder={String(shownMembers.length || 100)}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                />
                <Button size="sm" onClick={selectRange}>
                  Chọn
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-xs text-muted">
                      <th className="w-8 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={
                            shownMembers.length > 0 &&
                            shownMembers.every((m) => targetSet.has(m.id))
                          }
                          onChange={(e) => {
                            const ids = new Set(shownMembers.map((m) => m.id));
                            setTargets((cur) => {
                              const rest = cur.filter((t) => !ids.has(t));
                              return e.target.checked
                                ? [...rest, ...ids]
                                : rest;
                            });
                          }}
                        />
                      </th>
                      <th className="w-10 px-2 py-2 font-medium">#</th>
                      <th className="w-16 px-2 py-2 font-medium">Hình ảnh</th>
                      <FilterTh
                        className="px-2 py-2"
                        value={memberF.filters.name ?? ""}
                        onChange={(v) => memberF.setFilter("name", v)}
                      >
                        Tên
                      </FilterTh>
                      <FilterTh
                        className="px-2 py-2"
                        value={memberF.filters.role ?? ""}
                        onChange={(v) => memberF.setFilter("role", v)}
                      >
                        Vai trò
                      </FilterTh>
                      <FilterTh
                        className="px-2 py-2"
                        value={memberF.filters.group ?? ""}
                        onChange={(v) => memberF.setFilter("group", v)}
                      >
                        Tên nhóm
                      </FilterTh>
                      <FilterTh
                        className="px-2 py-2"
                        value={memberF.filters.friend ?? ""}
                        onChange={(v) => memberF.setFilter("friend", v)}
                      >
                        Là bạn bè
                      </FilterTh>
                    </tr>
                  </thead>
                  <tbody>
                    {shownMembers.map((m, i) => (
                      <tr
                        key={`${m.groupKey}:${m.id}`}
                        className="border-t border-border"
                      >
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={targetSet.has(m.id)}
                            onChange={() =>
                              setTargets((cur) =>
                                cur.includes(m.id)
                                  ? cur.filter((x) => x !== m.id)
                                  : [...cur, m.id],
                              )
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5 text-muted">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          {m.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.avatar}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <span className="block h-7 w-7 rounded-full border border-border bg-surface" />
                          )}
                        </td>
                        <td className="max-w-[140px] truncate px-2 py-1.5">
                          {m.name}
                        </td>
                        <td className="px-2 py-1.5">{ROLE_LABEL[m.role]}</td>
                        <td className="max-w-[140px] truncate px-2 py-1.5">
                          {m.groupName}
                        </td>
                        <td className="px-2 py-1.5">
                          {m.isFriend ? "Có" : "Không"}
                        </td>
                      </tr>
                    ))}
                    {shownMembers.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-2 py-8 text-center text-muted"
                        >
                          {membersLoading
                            ? "Đang tải thành viên…"
                            : pickedGroups.size === 0
                              ? "Tick nhóm rồi bấm Tải thành viên"
                              : "Không có thành viên"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : kind === "friend" ? (
            friendCard
          ) : kind === "backup_file" ? (
            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  File backup{" "}
                  <span className="font-normal text-muted">
                    (Đã chọn: {targets.length})
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => backupFileRef.current?.click()}
                  className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-border px-3 text-xs hover:bg-background"
                >
                  <Icon name="upload" size={13} /> Chọn file
                </button>
                <input
                  ref={backupFileRef}
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={onBackupFile}
                />
              </div>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-xs text-muted">
                      <th className="w-8 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={
                            backupRows.length > 0 &&
                            backupRows.every((r) => targets.includes(r.id))
                          }
                          onChange={(e) =>
                            setTargets(
                              e.target.checked
                                ? backupRows.map((r) => r.id)
                                : [],
                            )
                          }
                        />
                      </th>
                      <th className="px-2 py-2 font-medium">Tên</th>
                      <th className="px-2 py-2 font-medium">SĐT</th>
                      <th className="px-2 py-2 font-medium">Bạn của</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupRows.map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={targets.includes(r.id)}
                            onChange={() =>
                              setTargets((cur) =>
                                cur.includes(r.id)
                                  ? cur.filter((x) => x !== r.id)
                                  : [...cur, r.id],
                              )
                            }
                          />
                        </td>
                        <td className="max-w-[180px] truncate px-2 py-1.5">
                          {r.name}
                        </td>
                        <td className="px-2 py-1.5">{r.phone || "—"}</td>
                        <td className="max-w-[140px] truncate px-2 py-1.5">
                          {r.owner}
                        </td>
                      </tr>
                    ))}
                    {backupRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-2 py-8 text-center text-muted"
                        >
                          Chưa có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card>
              <h2 className="mb-3 text-sm font-semibold">
                Danh sách {meta.col.toLowerCase()}{" "}
                <span className="text-muted">(đã chọn {targets.length})</span>
              </h2>

              <div className="flex items-center gap-2">
                <input
                  className="h-8 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-zalo"
                  value={targetInput}
                  placeholder={meta.placeholder}
                  onChange={(e) => setTargetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTargets(targetInput);
                      setTargetInput("");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    addTargets(targetInput);
                    setTargetInput("");
                  }}
                  className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg bg-zalo px-3 text-sm font-medium text-white hover:bg-zalo-dark"
                >
                  + Thêm
                </button>
                <span className="shrink-0 text-xs text-muted">hoặc</span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-border px-3 text-xs hover:bg-background"
                >
                  <Icon name="upload" size={13} /> Tải tệp lên
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt"
                  hidden
                  onChange={onFile}
                />
              </div>
              <p className="mt-1 text-xs text-danger">{meta.hint}</p>

              <div className="mt-3 max-h-60 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-xs text-muted">
                      <th className="w-8 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={
                            targets.length > 0 &&
                            checkedTargets.size === targets.length
                          }
                          onChange={(e) =>
                            setCheckedTargets(
                              e.target.checked ? new Set(targets) : new Set(),
                            )
                          }
                        />
                      </th>
                      <th className="w-10 px-2 py-2 font-medium">#</th>
                      <th className="px-2 py-2 font-medium">{meta.col}</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((t, i) => (
                      <tr key={t} className="border-t border-border">
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={checkedTargets.has(t)}
                            onChange={() =>
                              setCheckedTargets((s) => {
                                const n = new Set(s);
                                if (n.has(t)) n.delete(t);
                                else n.add(t);
                                return n;
                              })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5 text-muted">{i + 1}</td>
                        <td className="px-2 py-1.5">{t}</td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            className="text-xs text-danger hover:underline"
                            onClick={() =>
                              setTargets((cur) => cur.filter((x) => x !== t))
                            }
                          >
                            Xoá
                          </button>
                        </td>
                      </tr>
                    ))}
                    {targets.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-2 py-8 text-center text-muted"
                        >
                          Trống
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {checkedTargets.size > 0 && (
                <div className="mt-2">
                  <Button size="sm" variant="danger" onClick={removeChecked}>
                    Xoá {checkedTargets.size} dòng đã chọn
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact label-left form row, matching the Auto Zalo reference density. */
function Row({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[200px_1fr] items-start gap-4 py-2">
      <label className="whitespace-nowrap pt-1.5 text-[13px] text-muted">
        {required && <span className="text-danger">* </span>}
        {label}
      </label>
      <div>{children}</div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-center text-sm outline-none focus:border-zalo"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

/** Message content — variant 0 is the primary field; extra variants stack below. */
function ContentEditor({
  variants,
  onChange,
}: {
  variants: MessageVariant[];
  onChange: (v: MessageVariant[]) => void;
}) {
  const v0 = variants[0] ?? EMPTY_VARIANT;
  const update0 = (patch: Partial<MessageVariant>) =>
    onChange(variants.map((v, i) => (i === 0 ? { ...v, ...patch } : v)));

  return (
    <div className="flex flex-col gap-2">
      {!v0.dynamicEnabled ? (
        <textarea
          className={inputCls}
          rows={4}
          value={v0.text}
          onChange={(e) => update0({ text: e.target.value })}
          placeholder="Nhập nội dung tin nhắn"
        />
      ) : (
        <>
          <textarea
            className={inputCls}
            rows={4}
            value={v0.template}
            onChange={(e) => update0({ template: e.target.value })}
            placeholder="VD: {{prefix}} {{zaloName}} ơi, shop đang có ưu đãi…"
          />
          <div className="flex flex-wrap gap-1 text-[11px]">
            {["{{zaloName}}", "{{prefix}}"].map((tok) => (
              <button
                key={tok}
                type="button"
                onClick={() => update0({ template: `${v0.template}${tok}` })}
                className="rounded border border-border px-1.5 py-0.5 hover:bg-background"
              >
                + {tok}
              </button>
            ))}
          </div>
          <textarea
            className={inputCls}
            rows={2}
            value={v0.prefixes.join("\n")}
            onChange={(e) =>
              update0({
                prefixes: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Tiền tố cho {{prefix}} — mỗi dòng 1 (VD: Chào / Hế lô)"
          />
        </>
      )}

      {variants.slice(1).map((v, idx) => {
        const i = idx + 1;
        return (
          <div key={i} className="rounded-lg border border-border p-2">
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>Biến thể {i + 1}</span>
              <button
                type="button"
                className="text-danger hover:underline"
                onClick={() => onChange(variants.filter((_, x) => x !== i))}
              >
                Xoá
              </button>
            </div>
            <textarea
              className={inputCls}
              rows={2}
              value={v.text}
              onChange={(e) =>
                onChange(
                  variants.map((x, xi) =>
                    xi === i ? { ...x, text: e.target.value } : x,
                  ),
                )
              }
              placeholder="Nội dung biến thể (gửi random)"
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...variants, { ...EMPTY_VARIANT }])}
        className="self-start text-xs text-zalo hover:underline"
      >
        + Thêm biến thể
      </button>
    </div>
  );
}

const isImagePath = (p: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(p);

function AttachmentPicker({
  paths,
  onChange,
}: {
  paths: string[];
  onChange: (paths: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of files) {
        const res = await apiUpload<{ path: string }>("/api/zalo/upload", file);
        added.push(res.path);
      }
      onChange([...paths, ...added]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/quicktime,video/webm"
        hidden
        onChange={onFiles}
      />
      <div className="flex flex-wrap gap-2">
        {paths.map((p) => (
          <div key={p} className="group relative">
            {isImagePath(p) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/zalo/${p}`}
                alt=""
                className="h-24 w-24 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-lg border border-border text-xs text-muted">
                Video
              </div>
            )}
            <button
              type="button"
              onClick={() => onChange(paths.filter((x) => x !== p))}
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-danger text-xs text-white"
              aria-label="Xoá"
            >
              ×
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="grid h-24 w-24 place-items-center rounded-lg border border-dashed border-border text-xs text-muted hover:border-zalo hover:text-zalo disabled:opacity-50"
        >
          {uploading ? (
            "Đang tải…"
          ) : (
            <span className="flex flex-col items-center gap-1">
              <span className="text-lg">+</span>
              Tải ảnh / video
            </span>
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
