import { chmod, mkdir, mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { formatCsv, joinList, splitList, type Row } from "../../tracker-tables/src/csv.ts";
import { getTab, isReference, tabFileName, type Schema } from "../../tracker-tables/src/schema.ts";
import { useCaseId } from "../../tracker-tables/src/use_case_id.ts";
import { vendorView } from "../../tracker-tables/src/vendor_view.ts";
import { InputError, PROPOSABLE, slug, type Change, type ExportData } from "./inputs.ts";
import { CONFIDENT_THRESHOLD, SUGGEST_THRESHOLD } from "./matching.ts";
import type { Addition, Result } from "./reconcile.ts";

export const REPORT_FILE = "reconciliation-report.md";
/** The file paths a run writes; a folder holding any other file is never replaced. */
const OWN_OUTPUT = /^(reconciliation-report\.md|field-updates\.csv|conflicts\.csv|suggestions\.csv|additions\/[a-z0-9-]+\.csv|vendor\/[a-z0-9-]+\/[a-z0-9-]+\.csv)$/;

const FIELD_UPDATE_HEADER = ["tab", "record", "record_key", "field", "current_value", "proposed_value", "operation", "source", "update_id"];
const CONFLICT_HEADER = ["kind", "tab", "record", "record_key", "field", "current_value", "proposed_value", "base_value", "detail", "update_id", "source"];
const SUGGESTION_HEADER = ["kind", "tab", "record", "field", "current_value", "suggested_value", "related_record", "score", "review", "reason", "source", "update_id"];
const VENDOR_UPDATE_HEADER = ["tab", "record", "field", "current_value", "proposed_value"];

function additionRows(schema: Schema, data: ExportData, all: Change[], tab: string, additions: Addition[]): { header: string[]; rows: Row[] } {
  const columns = getTab(schema, tab).columns;
  const used = new Set(additions.flatMap((a) => a.changes.map((c) => c.field)));
  const spec = columns.filter((c) => c.owner === "spec" && used.has(c.column)).map((c) => c.column);
  const human = columns.filter((c) => c.owner === "human" && used.has(c.column)).map((c) => c.column);
  const header = ["suggested_ref", "ref_status", "local_key", ...spec, ...human.map((h) => `suggested_${h}`), "suggested_proposal_refs", "trace_source", "trace_spec_version", "trace_mr_link"];
  const rows = additions.map((a) => {
    const value = (name: string): string => a.changes.find((c) => c.field === name && c.value !== "")?.value ?? "";
    const sources = [...new Set(a.changes.map((c) => c.source))];
    const version = /@([^#:;\s]+)/.exec(sources.join(" "))?.[1] ?? value("current_version");
    const useCase = a.changes[0]!.useCase;
    const mr = value("mr_link") || all.find((c) => c.tab === "Use Cases" && c.record_key === useCase && c.field === "mr_link" && c.value !== "")?.value || (data.tables["Use Cases"]?.rows.find((r) => useCaseId(r.vendor!, r.use_case_name!) === useCase)?.mr_link ?? "");
    const row: Row = { suggested_ref: a.ref, ref_status: "suggested", local_key: a.localKey, suggested_proposal_refs: joinList(a.changes.map((c) => c.update_id)), trace_source: joinList(sources), trace_spec_version: version, trace_mr_link: mr };
    for (const name of spec) row[name] = value(name);
    for (const name of human) row[`suggested_${name}`] = value(name);
    return row;
  });
  return { header, rows };
}

const keyOf = (schema: Schema, tab: string): string => getTab(schema, tab).columns.find((c) => c.key && c.type === "ref")!.column;

/** The vendor-visible copy of one vendor's tables and field updates; nothing else about any other row. */
function vendorFiles(schema: Schema, data: ExportData, result: Result, vendor: string, folder: string): Record<string, string> {
  const view = vendorView(schema, data.tables, vendor);
  const visible = new Set<string>();
  const files: Record<string, string> = {};
  for (const [tab, table] of Object.entries(view)) {
    table.rows.forEach((row) => visible.add(row[keyOf(schema, tab)]!));
    files[`${folder}/${tabFileName(tab)}`] = formatCsv(table.header, table.rows);
  }
  const scrub = (type: string, value: string): string => (type === "list" ? joinList(splitList(value).filter((v) => !isReference(v) || visible.has(v))) : value);
  const updates = result.fieldUpdates
    .filter((u) => u.field !== "vendor" && view[u.tab]?.header.includes(u.field) && view[u.tab]!.rows.some((r) => r[keyOf(schema, u.tab)] === u.record))
    .map((u) => {
      const type = getTab(schema, u.tab).columns.find((c) => c.column === u.field)!.type;
      return { tab: u.tab, record: u.record, field: u.field, current_value: scrub(type, u.current), proposed_value: scrub(type, u.proposed) };
    });
  files[`${folder}/field-updates.csv`] = formatCsv(VENDOR_UPDATE_HEADER, updates);
  return files;
}

export type ReportInput = { schema: Schema; data: ExportData; result: Result; changes: Change[]; proposalsDir: string; proposalFiles: string[] };

function reportText({ data, result, changes, proposalsDir, proposalFiles }: ReportInput): string {
  const manifest = data.manifest.rows.find((r) => r.scope === result.scope)!;
  const line = (text: string): string => `- ${text}`;
  const section = (title: string, lines: string[]): string[] => ["", `## ${title}`, "", ...(lines.length > 0 ? lines : ["None."])];
  const dates = (file: string): string => {
    const created = changes.filter((c) => c.file === file).map((c) => c.created_on).sort();
    return `${created.length} rows, created ${created[0]} to ${created.at(-1)}`;
  };
  return [
    "# Reconciliation Report (internal)",
    "",
    "Internal: this report and every file outside `vendor/` can hold internal columns, groups, links and cross-vendor suggestions. Send a vendor only its `vendor/<slug>/` folder. Nothing here has been applied or released; a lead reviews each item and applies it by hand.",
    ...section("Inputs", [
      line(`Export scope: ${result.scope}; exported ${manifest.exported_at} from ${manifest.workbook} by ${manifest.exported_by}`),
      ...proposalFiles.map((file) => line(`Proposal: ${relative(proposalsDir, file)} (${dates(file)})`)),
      line(`Link similarity: suggested from ${SUGGEST_THRESHOLD}; likely from ${CONFIDENT_THRESHOLD}; between the two it is marked uncertain-review`),
    ]),
    ...section("Counts", [
      line(`Additions: ${result.additions.length}`),
      line(`Field updates: ${result.fieldUpdates.length}`),
      line(`Conflicts: ${result.conflicts.length}`),
      line(`Held by a conflict: ${result.held.length}`),
      line(`Suggestions: ${result.suggestions.length}`),
      line(`Rejected: ${result.rejected.length}`),
      line(`Reflected in the export: ${result.reflected}`),
    ]),
    ...section("Additions", result.additions.map((a) => line(`${a.tab}: ${a.localKey} as ${a.ref} (suggested reference, a lead assigns the real one)`))),
    ...section("Field updates", result.fieldUpdates.map((u) => line(`${u.tab} ${u.record} ${u.field}: "${u.current}" to "${u.proposed}" (${u.change.update_id})`))),
    ...section("Conflicts", result.conflicts.map((c) => line(`${c.kind}: ${c.tab} ${c.record} ${c.change.field}: export "${c.current}", proposal "${c.proposed}"; ${c.detail} (${c.change.update_id})`))),
    ...section("Held", result.held.map((h) => line(`${h.change.update_id}: ${h.reason}`))),
    ...section("Suggestions", result.suggestions.map((s) => line(`${s.kind}: ${s.tab} ${s.record} ${s.field}; ${s.review}; ${s.reason}`))),
    ...section("Rejected", result.rejected.map((r) => line(`\`${r.change.update_id}\` rejected: ${r.reason}`))),
    "",
  ].join("\n");
}

export function buildFiles(input: ReportInput): Record<string, string> {
  const { schema, data, result, changes } = input;
  const files: Record<string, string> = {};
  files[REPORT_FILE] = reportText(input);
  for (const tab of Object.keys(PROPOSABLE)) {
    const additions = result.additions.filter((a) => a.tab === tab);
    if (additions.length === 0) continue;
    const { header, rows } = additionRows(schema, data, changes, tab, additions);
    files[`additions/${tabFileName(tab)}`] = formatCsv(header, rows);
  }
  files["field-updates.csv"] = formatCsv(FIELD_UPDATE_HEADER, result.fieldUpdates.map((u) => ({ tab: u.tab, record: u.record, record_key: u.change.record_key, field: u.field, current_value: u.current, proposed_value: u.proposed, operation: u.change.operation, source: u.change.source, update_id: u.change.update_id })));
  files["conflicts.csv"] = formatCsv(CONFLICT_HEADER, [
    ...result.conflicts.map((c) => ({ kind: c.kind, tab: c.tab, record: c.record, record_key: c.change.record_key, field: c.change.field, current_value: c.current, proposed_value: c.proposed, base_value: c.change.base_value, detail: c.detail, update_id: c.change.update_id, source: c.change.source })),
    ...result.held.map((h) => ({ kind: "held", tab: h.change.tab, record: h.record, record_key: h.change.record_key, field: h.change.field, current_value: "", proposed_value: h.change.value, base_value: h.change.base_value, detail: h.reason, update_id: h.change.update_id, source: h.change.source })),
  ]);
  files["suggestions.csv"] = formatCsv(SUGGESTION_HEADER, result.suggestions.map((s) => ({ kind: s.kind, tab: s.tab, record: s.record, field: s.field, current_value: s.current, suggested_value: s.suggested, related_record: s.related, score: s.score, review: s.review, reason: s.reason, source: s.source, update_id: s.update_id })));

  const vendors = new Map<string, string>();
  for (const { tab } of schema.tabs) {
    for (const row of data.tables[tab]!.rows) {
      const name = (row.vendor ?? "").trim();
      const folder = slug(name);
      if (name === "" || folder === "") continue;
      const other = vendors.get(folder);
      if (other !== undefined && other !== name) throw new InputError([`vendor names "${other}" and "${name}" both map to the folder vendor/${folder}; make the names consistent in the export`]);
      vendors.set(folder, name);
    }
  }
  for (const [folder, name] of [...vendors].sort()) {
    if (result.scope === "internal" || result.scope === folder) Object.assign(files, vendorFiles(schema, data, result, name, `vendor/${folder}`));
  }
  return files;
}

/** Refuses an output folder that overlaps an input or holds something that is not a previous reconciler output. */
export async function checkOutput(out: string, inputs: string[]): Promise<void> {
  const target = resolve(out);
  for (const input of inputs.map((i) => resolve(i))) {
    if (target === input || target.startsWith(input + sep) || input.startsWith(target + sep)) throw new InputError([`output folder ${out} overlaps the input ${input}`]);
  }
  const found = await readdir(target, { recursive: true, withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw new InputError([`output folder ${out} cannot be used (${error.code})`]);
  });
  const files = found.filter((e) => e.isFile()).map((e) => relative(target, join(e.parentPath, e.name)));
  if (files.some((file) => !OWN_OUTPUT.test(file)) || (files.length > 0 && !files.includes(REPORT_FILE))) throw new InputError([`output folder ${out} is not empty and holds something other than a previous reconciler output; choose another folder`]);
}

/** Writes every file into a temporary sibling folder first, then swaps it in, so a failure leaves no partial output. */
export async function writeOutputs(out: string, files: Record<string, string>): Promise<void> {
  const target = resolve(out);
  await mkdir(dirname(target), { recursive: true });
  const temp = await mkdtemp(join(dirname(target), ".reconcile-"));
  try {
    for (const [path, content] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
      await mkdir(dirname(join(temp, path)), { recursive: true });
      await writeFile(join(temp, path), content, "utf8");
    }
    await chmod(temp, 0o755);
    await rm(target, { recursive: true, force: true });
    await rename(temp, target);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

