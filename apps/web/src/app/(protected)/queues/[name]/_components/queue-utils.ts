// Pure utility functions — no React imports needed

export function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "failed":
      return "destructive";
    case "active":
      return "secondary";
    default:
      return "outline";
  }
}

export function formatTimestamp(ts: number | undefined): string {
  if (!ts) return "--";
  return new Date(ts).toLocaleString();
}

export function formatDuration(start: number | undefined, end: number | undefined): string {
  if (!start || !end) return "--";
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
