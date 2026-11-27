/** CC0 /data exports (pure; unit-tested). Only our computed numbers + repo identifiers. */
export const EXPORT_LICENSE = "CC0-1.0";
export const CSV_HEADER = ["date", "list", "period", "language", "rank", "repo", "stars", "gained"] as const;

export interface ExportRow {
  date: string;
  list: string;
  period: string;
  language: string;
  rank: number;
  repo: string; // owner/name
  stars: number | null;
  gained: number;
}

function csvCell(v: string | number | null): string {
  if (v === null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: readonly ExportRow[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const r of rows) lines.push(CSV_HEADER.map((k) => csvCell(r[k])).join(","));
  return `${lines.join("\n")}\n`;
}

export function toJsonExport(meta: { date: string; generatedAt: string; source: string }, rows: readonly ExportRow[]) {
  return {
    license: EXPORT_LICENSE,
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    note: "Rankings and counts computed by GitRepos are public domain (CC0). Repository names belong to their owners; see each repo on GitHub.",
    ...meta,
    rows,
  };
}
