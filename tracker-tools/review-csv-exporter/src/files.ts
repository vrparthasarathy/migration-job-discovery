import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { formatCsv, type Row } from "../../tracker-tables/src/csv.ts";
import { fullHeader, type Headings } from "./headings.ts";
import { reviewFile } from "./review.ts";
import { TABS } from "./rows.ts";

/** Adds a problem when `out` is, contains or sits inside an input, or is not a folder. */
export async function checkOut(out: string, inputs: string[], problems: string[]): Promise<void> {
  const target = resolve(out);
  for (const input of inputs.map((i) => resolve(i))) {
    if (target === input || target.startsWith(input + sep) || input.startsWith(target + sep)) problems.push(`output folder ${out} overlaps the input ${input}`);
  }
  const info = await stat(target).catch(() => undefined);
  if (info && !info.isDirectory()) problems.push(`output folder ${out} is not a folder`);
}

/** One CSV text per tab, header-only for a tab without rows; rows keep the order they arrive in. */
export function renderFiles(h: Headings, rows: { tab: string; cells: Row }[]): Record<string, string> {
  return Object.fromEntries(TABS.map((tab) => [reviewFile(tab), formatCsv(fullHeader(h, tab), rows.filter((r) => r.tab === tab).map((r) => r.cells))]));
}

/** Writes every file to a temporary name and renames them only once all are written, so a failure leaves the old files. */
export async function writeFiles(out: string, files: Record<string, string>): Promise<void> {
  await mkdir(out, { recursive: true });
  const temps = Object.keys(files).map((name) => ({ name, temp: join(out, `.${name}.${process.pid}.tmp`) }));
  try {
    for (const { name, temp } of temps) await writeFile(temp, files[name]!, "utf8");
    for (const { name, temp } of temps) await rename(temp, join(out, name));
  } finally {
    for (const { temp } of temps) await rm(temp, { force: true });
  }
}
