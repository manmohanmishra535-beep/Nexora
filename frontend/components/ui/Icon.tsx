type IconName =
  | "home"
  | "search"
  | "bell"
  | "mail"
  | "bookmark"
  | "user"
  | "settings"
  | "heart"
  | "reply"
  | "repost"
  | "share"
  | "trash"
  | "edit"
  | "image"
  | "close"
  | "plus"
  | "back"
  | "check"
  | "logout"
  | "send"
  | "spark"
  | "lock"
  | "calendar";

const paths: Record<IconName, React.ReactNode> = {
  home: <path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7z" />
      <path d="M10 20h4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1.1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1.1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6h.08A1.7 1.7 0 0010 3.05V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9v.08a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z" />
    </>
  ),
  heart: (
    <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.8-8 11-8 11z" />
  ),
  reply: (
    <path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.8A8 8 0 1121 12z" />
  ),
  repost: (
    <path d="M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3" />
  ),
  share: (
    <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3z" />
      <path d="M13.5 6.5l3 3" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M15 5l-7 7 7 7" />,
  check: <path d="M4 12l5 5L20 6" />,
  logout: <path d="M15 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />,
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  spark: (
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </>
  ),
};

const filled: IconName[] = ["heart", "bookmark", "spark"];

export default function Icon({
  name,
  size = 24,
  filled: isFilled = false,
  className = "",
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
  className?: string;
}) {
  const fill =
    isFilled && filled.includes(name) ? "currentColor" : "none";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

export type { IconName };
