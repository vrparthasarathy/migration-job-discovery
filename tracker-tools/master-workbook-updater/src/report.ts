import { basename } from "node:path";
import type { Decision, Listed } from "./apply.ts";
import type { ReviewRow } from "./reviews.ts";
import type { DueMismatch } from "./master_write.ts";
import type { SyncResult } from "./sync.ts";
import type { VendorOutcome } from "./vendor_build.ts";

export type RunFacts = {
  base: string;
  runDate: string;
  reviewRows: number;
  /** Each named vendor and whether its workbook was synced from a download or built new. */
  vendors: { name: string; mode: "sync" | "new" }[];
  syncs: SyncResult[];
  outcomes: VendorOutcome[];
  mismatches: DueMismatch[];
  dropped: string[];
  extras: Record<string, string[]>;
  files: string[];
};

const flat = (value: string): string => value.replace(/\s+/g, " ").trim();
const where = (r: ReviewRow): string => `${r.tab}, ${r.record !== "" ? r.record : r.recordKey} (${basename(r.file)} line ${r.line})`;
const section = (title: string, lines: string[]): string => `## ${title}\n\n${lines.length > 0 ? lines.join("\n") : "None."}\n`;
const listed = (items: Listed[]): string[] => items.map((i) => `- ${where(i.review)}: ${flat(i.reason)}`);

/** The Markdown report: marked internal, with base file names only and no secret values. */
export function renderReport(facts: RunFacts, d: Decision): string {
  const reasons = new Map<string, number>();
  for (const s of d.skipped) {
    const kind = s.reason.replace(/ on \d{4}-\d{2}-\d{2}$/, "");
    reasons.set(kind, (reasons.get(kind) ?? 0) + 1);
  }
  const applied = d.applied.flatMap((a) => [
    `- ${a.review.tab}, ${a.reference}: ${a.kind === "add" ? "added" : "updated"} (${basename(a.review.file)} line ${a.review.line})`,
    ...a.changes.map((c) => `  - ${c.field}: "${flat(c.old)}" -> "${flat(c.new)}"`),
  ]);
  const synced = facts.syncs.flatMap((s) => s.synced.map((v) => `- ${s.vendor}: ${v.tab}, ${v.reference}, ${v.column}: "${flat(v.old)}" -> "${flat(v.new)}" (${v.kind === "copy" ? "copied into a blank cell" : "differs from the master, copied"})`));
  const syncConflicts = facts.syncs.flatMap((s) => s.conflicts.map((c) => `- ${s.vendor}: ${c.tab}, ${c.reference} (line ${c.line} of the download): ${flat(c.reason)}`));
  const held = facts.outcomes.flatMap((o) => (o.bytes === undefined ? [`- ${o.vendor}: workbook held, not rebuilt`, ...o.held.map((h) => `  - ${h.tab}, ${h.reference} (line ${h.line} of the download) has no row in the rebuilt view${h.values.length > 0 ? `; vendor values: ${flat(h.values.join("; "))}` : ""}`)] : []));
  const added = facts.outcomes.flatMap((o) => o.added.map((a) => `- ${o.vendor}: ${a.tab}, ${a.reference}`));
  const extras = [
    ...Object.entries(facts.extras).filter(([, names]) => names.length > 0).map(([tab, names]) => `- carried, ${tab}: ${names.join(", ")}`),
    ...facts.dropped.map((name) => `- dropped, formulas: ${name}`),
  ];
  const parts = [
    "# Master workbook update\n\nInternal report. Do not send it to a vendor.\n",
    section("Run", [
      `- Starting point: ${facts.base}`,
      `- Run date: ${facts.runDate}`,
      `- Review rows: ${facts.reviewRows} = ${d.applied.length} applied + ${d.skipped.length} skipped + ${d.conflicts.length} conflicts`,
      `- Vendors: ${facts.vendors.length > 0 ? facts.vendors.map((v) => `${v.name} (${v.mode === "sync" ? "synced and rebuilt" : "built new"})`).join(", ") : "none"}`,
      `- Vendor values synced: ${facts.syncs.reduce((n, s) => n + s.synced.length, 0)}; sync conflicts: ${facts.syncs.reduce((n, s) => n + s.conflicts.length, 0)}; held workbooks: ${facts.outcomes.filter((o) => o.bytes === undefined).length}`,
      "- Run again from the new master, not from the download, so a row is not applied twice.",
    ]),
    section("Applied", applied),
    section("Skipped", [...[...reasons].map(([reason, n]) => `- ${n} x ${reason}`), ...listed(d.skipped)]),
    section("Conflicts", listed(d.conflicts)),
    section("Marked applied, not in the master", listed(d.drift)),
    section("Vendor values synced", synced),
    section("Sync conflicts", syncConflicts),
    section("Vendor workbooks held", held),
    section("Master rows added to a vendor workbook", added),
    section("Fields not applied", d.notApplied.map((n) => `- ${where(n.review)}: ${n.field} (${n.reason})`)),
    section("Due dates left as stored", facts.mismatches.map((m) => `- ${m.tab}, ${m.reference}: stored ${m.stored}, release plus two working days is ${m.expected}`)),
    section("Extra columns", extras),
    section("Files written", facts.files.map((f) => `- ${f}`)),
  ];
  return parts.join("\n");
}
