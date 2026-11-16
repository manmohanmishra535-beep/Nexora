export function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

export function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (!Number.isFinite(seconds)) {
    return "";
  }

  if (seconds < 45) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year:
      date.getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
  });
}

export function formatJoined(dateString?: string) {
  if (!dateString) {
    return "Date unavailable";
  }

  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function initialsOf(name?: string) {
  if (!name) {
    return "N";
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function absoluteTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
