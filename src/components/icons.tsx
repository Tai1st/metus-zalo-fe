import type { SVGProps } from "react";

export type IconName =
  | "globe"
  | "chat"
  | "user"
  | "list"
  | "key"
  | "tag"
  | "calendar"
  | "send"
  | "userPlus"
  | "users"
  | "mail"
  | "monitor"
  | "cloud"
  | "grid"
  | "facebook"
  | "download"
  | "home"
  | "bell"
  | "phone"
  | "dashboard"
  | "refresh"
  | "edit"
  | "trash"
  | "copy"
  | "eye"
  | "play"
  | "pause"
  | "plus"
  | "link"
  | "swap"
  | "upload"
  | "arrowLeft"
  | "chevronDown"
  | "filter"
  | "logout"
  | "menu"
  | "settings";

const PATHS: Record<IconName, string | string[]> = {
  globe:
    "M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9m0-18c-2.5 2.5-3.5 6-3.5 9s1 6.5 3.5 9M3.5 12h17",
  chat: "M21 12a8 8 0 01-11.5 7.2L4 20l1-4.5A8 8 0 1121 12z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  key: "M15 7a4 4 0 11-4 4l-6 6v3h3l1-1h2v-2h2l2-2a4 4 0 013-8z",
  tag: [
    "M12 2H5a3 3 0 00-3 3v7a2 2 0 00.59 1.41l8 8a2 2 0 002.82 0l7-7a2 2 0 000-2.82l-8-8A2 2 0 0012 2z",
    "M7 7h.01",
  ],
  calendar:
    "M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  userPlus:
    "M12 12a4 4 0 100-8 4 4 0 000 8zm-8 8a7 7 0 0112-4.9M17 14v6m3-3h-6",
  users:
    "M9 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0m2-8a4 4 0 000-8m5 8a7 7 0 00-3-2",
  mail: "M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm0 2l8 6 8-6",
  monitor: "M3 4h18v12H3zM8 20h8m-4-4v4",
  cloud: "M7 18a4 4 0 010-8 6 6 0 0111.5 2A3.5 3.5 0 0118 18H7z",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34H9a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V9a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z",
  facebook: "M15 3h-3a4 4 0 00-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 011-1h3z",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",
  home: "M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10",
  bell: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
  phone:
    "M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0122 17z",
  dashboard: ["M3 3h8v8H3zM13 3h8v5h-8zM13 12h8v9h-8zM3 15h8v6H3z"],
  refresh: "M21 12a9 9 0 11-3-6.7M21 4v5h-5",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  trash: "M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6M10 11v6M14 11v6",
  copy: "M9 9h11a1 1 0 011 1v11a1 1 0 01-1 1H9a1 1 0 01-1-1V10a1 1 0 011-1zM5 15H4a1 1 0 01-1-1V3a1 1 0 011-1h11a1 1 0 011 1v1",
  eye: ["M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z", "M12 15a3 3 0 100-6 3 3 0 000 6z"],
  play: "M6 4l14 8-14 8z",
  pause: "M8 4h3v16H8zM13 4h3v16h-3z",
  plus: "M12 5v14M5 12h14",
  link: "M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1.5 1.5M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1.5-1.5",
  swap: "M7 4l-4 4 4 4M3 8h13M17 20l4-4-4-4M21 16H8",
  upload: "M12 15V3m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7",
  chevronDown: "M6 9l6 6 6-6",
  filter: "M22 3H2l8 9.46V20l4 1v-8.54z",
  logout: ["M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  menu: "M3 6h18M3 12h18M3 18h18",
};

export function Icon({
  name,
  size = 16,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {(Array.isArray(PATHS[name]) ? PATHS[name] : [PATHS[name]]).map((d, i) => (
        <path key={i} d={d as string} />
      ))}
    </svg>
  );
}
