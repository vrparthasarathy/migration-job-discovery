import type { Row } from "../../tracker-tables/src/csv.ts";
import { getTab, isReference, type Column, type Schema } from "../../tracker-tables/src/schema.ts";
import { dueOn, isIsoDate } from "../../tracker-tables/src/working_days.ts";
import { useCaseId } from "../../tracker-tables/src/use_case_id.ts";
import type { ExportData } from "../../tracker-reconciler/src/inputs.ts";
import { keyOf, VENDOR_TABS, type Columns } from "./columns.ts";
import type { ReviewFile, ReviewRow } from "./reviews.ts";
import type { WorkbookData } from "./workbook_read.ts";

export type Release = { batch: string; date: string };
export type Inputs = {
  schema: Schema;
  columns: Columns;
  vendor: string;
  release: Release | undefined;
  holidays: string[];
  /** The downloaded workbook's path, named in a duplicate use case ID finding. */
  workbookFile: string;
  workbook: WorkbookData;
  data: ExportData;
  reviews: ReviewFile[];
};

export type Change = { field: string; old: string; new: string };
export type Applied = { review: ReviewRow; reference: string; kind: "update" | "add"; changes: Change[] };
export type Listed = { review: ReviewRow; reason: string };
export type Decision = {
  /** The rows of each vendor tab: the downloaded rows with applied changes, then the added rows. */
  rows: Record<string, Row[]>;
  applied: Applied[];
  skipped: Listed[];
  conflicts: Listed[];
  /** Accepted new questions waiting for a release. */
  pending: Listed[];
  /** Accepted values of internal columns and the `other_changes` text, left for the internal tracker. */
  internal: { review: ReviewRow; values: string[] }[];
  /** Accepted vendor-visible fields that cannot be applied, with the reason. */
  notApplied: { review: ReviewRow; field: string; reason: string }[];
  otherVendor: number;
};

/** Columns whose values only a release sets. */
export const PROTECTED = ["released_on", "due_on"];
const SETTING = ["add", "update", "suggest"];

const norm = (value: string): string => value.replace(/\r\n?/g, "\n").trim();

/** The message for a value outside the column's list, date or reference format, or undefined. */
export function valueProblem(column: Column, value: string): string | undefined {
  if (value === "" || column.allowed.includes(value)) return undefined;
  if (column.type === "enum") return `"${value}" is not one of ${column.allowed.join(", ")}`;
  if (column.type === "date" && !isIsoDate(value)) return `"${value}" is not a date in YYYY-MM-DD format`;
  if (column.type === "ref" && !isReference(value)) return `"${value}" is not a reference such as UC-001`;
  return undefined;
}

type Scope = { kind: "this" } | { kind: "other" } | { kind: "skip"; reason: string };

/** Decides every review row of the vendor tabs; a value that breaks the schema or a reference collision is added to `problems`. */
export function decide(input: Inputs, problems: string[]): Decision {
  const { schema, columns, vendor, release, workbook, data } = input;
  const rows: Record<string, Row[]> = {};
  const index: Record<string, Map<string, Row>> = {};
  const refs: Record<string, Set<string>> = {};
  for (const tab of VENDOR_TABS) {
    rows[tab] = workbook[tab]!.map((w) => ({ ...w.row }));
    index[tab] = new Map(rows[tab]!.map((row) => [row[keyOf(tab)]!, row]));
    refs[tab] = new Set([...index[tab]!.keys(), ...data.tables[tab]!.rows.map((row) => row[keyOf(tab)]!)]);
  }
  const decision: Decision = { rows, applied: [], skipped: [], conflicts: [], pending: [], internal: [], notApplied: [], otherVendor: 0 };

  const schemaColumn = (tab: string, column: string): Column => getTab(schema, tab).columns.find((c) => c.column === column)!;
  const proposedOf = (r: ReviewRow, column: string): string => norm(r.fields.find((f) => f.column === column)?.proposed ?? "");

  /** "applicable" for a field the tool may set, "internal" for an internal column, else the reason it is not applied. */
  const classify = (tab: string, column: string): string => {
    if (schemaColumn(tab, column).visibility === "internal") return "internal";
    const vendorColumn = columns[tab]!.find((c) => c.column === column);
    if (vendorColumn === undefined) return "not a column of the vendor workbook";
    if (PROTECTED.includes(column)) return "set by a release only";
    if (vendorColumn.edited) return "vendor-owned";
    if (vendorColumn.owner !== "spec" && vendorColumn.owner !== "human") return `${vendorColumn.owner} column`;
    return "applicable";
  };

  /** The use cases of the workbook by use case ID, and those added earlier in this run. */
  const workbookIds = new Map<string, Row>();
  workbook["Use Cases"]!.forEach((w) => {
    const id = useCaseId(w.row.vendor!, w.row.use_case_name!);
    if (id === undefined) return;
    if (workbookIds.has(id)) problems.push(`${input.workbookFile}: line ${w.line}: sheet "Use Cases": use case ID ${id} is already on an earlier row`);
    else workbookIds.set(id, rows["Use Cases"]![workbook["Use Cases"]!.indexOf(w)]!);
  });
  /** The use cases of the export, of every vendor, by use case ID. */
  const exportVendors = new Map<string, string>();
  for (const u of data.tables["Use Cases"]!.rows) {
    const id = useCaseId(u.vendor!, u.use_case_name!);
    if (id !== undefined) exportVendors.set(id, u.vendor!);
  }
  /** The new use case rows of the review files, whatever their status, by use case ID. */
  const reviewVendors = new Map<string, string>();
  for (const r of input.reviews.filter((f) => f.tab === "Use Cases").flatMap((f) => f.rows).filter((r) => r.record === "")) {
    const id = useCaseId(proposedOf(r, "vendor"), proposedOf(r, "use_case_name"));
    if (id !== undefined) reviewVendors.set(id, proposedOf(r, "vendor"));
  }

  const scopeOf = (r: ReviewRow): Scope => {
    const tab = r.tab;
    if (r.record !== "") {
      if (index[tab]!.has(r.record)) return { kind: "this" };
      const exported = data.tables[tab]!.rows.find((row) => row[keyOf(tab)] === r.record);
      if (exported === undefined) return { kind: "skip", reason: `${r.record} is in neither the workbook nor the export` };
      return exported.vendor === vendor ? { kind: "skip", reason: `${r.record} is not in the workbook` } : { kind: "other" };
    }
    if (tab === "Use Cases") {
      const proposed = proposedOf(r, "vendor");
      if (proposed === "") return { kind: "skip", reason: "the new use case names no vendor" };
      if (proposed !== vendor) return { kind: "other" };
      return proposedOf(r, "use_case_name") === "" ? { kind: "skip", reason: "the new use case names no use case name" } : { kind: "this" };
    }
    if (workbookIds.has(r.useCase)) return { kind: "this" };
    const owner = exportVendors.get(r.useCase) ?? reviewVendors.get(r.useCase);
    if (owner !== undefined) return owner === vendor ? { kind: "skip", reason: `use case ${r.useCase} is not in the workbook` } : { kind: "other" };
    problems.push(`${r.file}: line ${r.line}: use case ID "${r.useCase}" is not in the workbook, the export or the review files`);
    return { kind: "skip", reason: `use case ${r.useCase} is unknown` };
  };


  const process = (r: ReviewRow): void => {
    const tab = r.tab;
    const scope = scopeOf(r);
    if (scope.kind === "other") {
      decision.otherVendor++;
      return;
    }
    if (r.status !== "accepted") {
      decision.skipped.push({ review: r, reason: `not accepted (${r.status === "" ? "blank" : r.status})` });
      return;
    }
    if (scope.kind === "skip") {
      decision.skipped.push({ review: r, reason: scope.reason });
      return;
    }
    if (r.appliedOn !== "") {
      if (r.changedSinceReview) decision.conflicts.push({ review: r, reason: `changed since it was applied on ${r.appliedOn}; review it again` });
      else decision.skipped.push({ review: r, reason: `already applied on ${r.appliedOn}` });
      return;
    }
    const causes: string[] = [];
    if (r.changedSinceReview) causes.push("changed since review");
    for (const f of r.fields.filter((x) => x.state === "conflict" || x.state === "held")) causes.push(`${f.column} is ${f.state}`);
    if (r.conflict !== "") causes.push(`conflict: ${r.conflict}`);
    if (!r.digestMatches) causes.push("the content digest does not match the row; the file was edited after export");
    if (causes.length > 0) {
      decision.conflicts.push({ review: r, reason: causes.join("; ") });
      return;
    }

    const setting = r.fields.filter((f) => SETTING.includes(f.state));
    const applicable = setting.filter((f) => classify(tab, f.column) === "applicable");
    const internal = setting.filter((f) => classify(tab, f.column) === "internal").map((f) => `${f.column}: ${f.current} -> ${f.proposed} [${f.state}]`);
    if (r.otherChanges !== "") internal.push(`other_changes: ${r.otherChanges}`);
    if (internal.length > 0) decision.internal.push({ review: r, values: internal });
    for (const f of setting) {
      const kind = classify(tab, f.column);
      if (kind !== "applicable" && kind !== "internal") decision.notApplied.push({ review: r, field: f.column, reason: kind });
    }
    const checked = (f: { column: string; proposed: string }): string => {
      const value = norm(f.proposed);
      const message = valueProblem(schemaColumn(tab, f.column), value);
      if (message !== undefined) problems.push(`${r.file}: line ${r.line}: ${f.column} ${message}`);
      return value;
    };

    if (r.record !== "") {
      const row = index[tab]!.get(r.record)!;
      const differs = applicable.filter((f) => norm(row[f.column]!) !== norm(f.current));
      if (differs.length > 0) {
        const reason = differs.map((f) => `${f.column}: the workbook holds "${norm(row[f.column]!)}", the review row expects "${norm(f.current)}"`).join("; ");
        decision.conflicts.push({ review: r, reason });
        return;
      }
      const changes: Change[] = [];
      for (const f of applicable) {
        const value = checked(f);
        if (value !== norm(row[f.column]!)) changes.push({ field: f.column, old: row[f.column]!, new: value });
      }
      if (changes.length === 0) {
        decision.skipped.push({ review: r, reason: applicable.length === 0 ? "nothing for the vendor workbook" : "the workbook already holds the proposed values" });
        return;
      }
      for (const c of changes) row[c.field] = c.new;
      decision.applied.push({ review: r, reference: r.record, kind: "update", changes });
      return;
    }

    if (tab === "Questions" && release === undefined) {
      decision.pending.push({ review: r, reason: "no release named; the question is not added" });
      return;
    }
    const reference = r.suggestedRef;
    if (!isReference(reference)) {
      problems.push(`${r.file}: line ${r.line}: suggested_ref "${reference}" is not a reference such as UC-001`);
      return;
    }
    if (refs[tab]!.has(reference)) {
      problems.push(`${r.file}: line ${r.line}: reference ${reference} already exists in the workbook, the export or this run`);
      return;
    }
    const newId = tab === "Use Cases" ? useCaseId(vendor, proposedOf(r, "use_case_name")) : undefined;
    if (tab === "Use Cases") {
      if (newId !== r.useCase) {
        problems.push(`${r.file}: line ${r.line}: use_case "${r.useCase}" is not the use case ID of its vendor and use case name, ${newId ?? "which has none"}`);
        return;
      }
      if (workbookIds.has(newId)) {
        problems.push(`${r.file}: line ${r.line}: use case ID ${newId} already exists in the workbook or earlier in this run`);
        return;
      }
    }
    refs[tab]!.add(reference);
    const row: Row = Object.fromEntries(columns[tab]!.map((c) => [c.column, ""]));
    for (const f of applicable) row[f.column] = checked(f);
    row[keyOf(tab)] = reference;
    if (tab === "Use Cases") {
      row.use_case_name = proposedOf(r, "use_case_name");
      workbookIds.set(newId!, row);
    } else {
      const useCase = workbookIds.get(r.useCase)!;
      Object.assign(row, { use_case_ref: useCase.use_case_ref, use_case_name: useCase.use_case_name, vendor: useCase.vendor });
    }
    if (tab === "Questions") {
      Object.assign(row, { batch_ref: release!.batch, released_on: release!.date, due_on: dueOn(release!.date, input.holidays), answer_status: "not-answered" });
    }
    index[tab]!.set(reference, row);
    rows[tab]!.push(row);
    decision.applied.push({ review: r, reference, kind: "add", changes: columns[tab]!.filter((c) => row[c.column] !== "").map((c) => ({ field: c.column, old: "", new: row[c.column]! })) });
  };

  for (const tab of VENDOR_TABS) {
    const file = input.reviews.find((f) => f.tab === tab)!;
    for (const r of [...file.rows].sort((a, b) => a.order - b.order)) process(r);
  }
  return decision;
}
