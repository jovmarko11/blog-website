/**
 * format.ts — small pure helpers for turning content data into display strings.
 */
import type { Status } from "../content/schema";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-12" → "Dec 2025" */
export function formatYearMonth(ym: string): string {
  const [year, month] = ym.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** { start: "2025-12", end: "2026-02" } → "Dec 2025 — Feb 2026";  no end → "Dec 2025 — now" */
export function formatPeriod(period: { start: string; end?: string }, status?: Status): string {
  const start = formatYearMonth(period.start);
  if (!period.end) return status === "lost" ? start : `${start} — now`;
  if (period.end === period.start) return start;
  return `${start} — ${formatYearMonth(period.end)}`;
}

/** "jovmarko11/cli-interpreter-cpp" → "https://github.com/jovmarko11/cli-interpreter-cpp" */
export const repoUrl = (repo: string) => `https://github.com/${repo}`;
