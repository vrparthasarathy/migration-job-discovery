import { basename } from "node:path";
import type { Decision, Listed, Release } from "./apply.ts";
import type { ReviewRow } from "./reviews.ts";

export type RunFacts = { workbook: string; vendor: string; runDate: string; release: Release | undefined };

const flat = (value: string): string => value.replace(/\s+/g, " ").trim();
const where = (r: ReviewRow): string => `${r.tab}, ${r.record !== "" ? r.record : r.recordKey} (${basename(r.file)} line ${r.line})`;
const section = (title: string, lines: string[]): string => `## ${title}\n\n${lines.length > 0 ? lines.join("\n") : "None."}\n`;
const listed = (items: Listed[]): string[] => items.map((i) => `- ${where(i.review)}: ${flat(i.reason)}`);

/** The Markdown report: marked internal, with base file names only and no secret values. */
export function renderReport(facts: RunFacts, d: Decision): string {
  const reasons = new Map<string, number>();
  for (const s of d.skipped) {
    const kind = s.reason.replace(/ on \d{4}-\d{2}-\d{2}$/, "").replace(/ \(.*\)$/, "");
    reasons.set(kind, (reasons.get(kind) ?? 0) + 1);
  }
  const applied = d.applied.flatMap((a) => [
    `- ${a.review.tab}, ${a.reference}: ${a.kind === "add" ? "added" : "updated"} (${basename(a.review.file)} line ${a.review.line})`,
    ...a.changes.map((c) => `  - ${c.field}: "${flat(c.old)}" -> "${flat(c.new)}"`),
  ]);
  const parts = [
    "# Vendor workbook update\n\nInternal report. Do not send it to the vendor.\n",
    section("Run", [
      `- Starting workbook: ${basename(facts.workbook)}`,
      `- Vendor: ${facts.vendor}`,
      `- Run date: ${facts.runDate}`,
      `- Release: ${facts.release ? `${facts.release.batch} on ${facts.release.date}` : "none"}`,
      `- Applied rows: ${d.applied.length}; skipped rows: ${d.skipped.length}; conflicts: ${d.conflicts.length}; pending questions: ${d.pending.length}; rows of other vendors, not applied: ${d.otherVendor}`,
      "- `review-mappings.csv` was ignored.",
      "- A rerun on an older download skips rows already marked applied; start from the latest download.",
    ]),
    section("Applied", applied),
    section("Skipped", [...[...reasons].map(([reason, n]) => `- ${n} x ${reason}`), ...listed(d.skipped)]),
    section("Conflicts", listed(d.conflicts)),
    section("Pending question releases", listed(d.pending)),
    section("Left for the internal tracker", d.internal.flatMap((i) => [`- ${where(i.review)}`, ...i.values.map((v) => `  - ${flat(v)}`)])),
    section("Fields not applied", d.notApplied.map((n) => `- ${where(n.review)}: ${n.field} (${n.reason})`)),
  ];
  return parts.join("\n");
}
