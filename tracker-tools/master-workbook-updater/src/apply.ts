import { joinList, splitList, type Row } from "../../tracker-tables/src/csv.ts";
import { getTab, isReference, type Column, type Schema } from "../../tracker-tables/src/schema.ts";
import { label, type Headings } from "../../review-csv-exporter/src/headings.ts";
import { useCaseId } from "../../tracker-tables/src/use_case_id.ts";
import { valueProblem } from "../../vendor-workbook-updater/src/apply.ts";
import { keyOf } from "./master_columns.ts";
import type { Master, MasterTable } from "./master_read.ts";
import { parseOtherChanges } from "./other_changes.ts";
import type { ReviewFile, ReviewRow } from "./reviews.ts";
import { norm } from "./values.ts";

export type Change = { field: string; old: string; new: string };
export type Applied = { review: ReviewRow; reference: string; kind: "update" | "add"; changes: Change[] };
export type Listed = { review: ReviewRow; reason: string };
export type Decision = {
  applied: Applied[];
  /** Rows that were not accepted, already applied or not in the master, and accepted rows that change nothing. */
  skipped: Listed[];
  conflicts: Listed[];
  /** Skipped rows whose `applied_on` is set but whose values are not in the master. */
  drift: Listed[];
  /** Accepted fields that are never applied, with the reason. */
  notApplied: { review: ReviewRow; field: string; reason: string }[];
};

export const emptyDecision = (): Decision => ({ applied: [], skipped: [], conflicts: [], drift: [], notApplied: [] });

const SETTING = ["add", "update", "suggest"];
type Wanted = { column: string; current: string; proposed: string; state: string };

/** Decides every review row of every tab against the master, which is changed in place; a value that breaks the schema or a reference collision is added to `problems`. */
export function decide(schema: Schema, master: Master, reviews: ReviewFile[], h: Headings, runDate: string, problems: string[]): Decision {
  const decision = emptyDecision();
  const columnOf = (tab: string, column: string): Column => getTab(schema, tab).columns.find((c) => c.column === column)!;

  /** Why a column is never applied, or undefined when its schema owner allows it. */
  const refusal = (tab: string, column: string): string | undefined => {
    const c = columnOf(tab, column);
    if (c.key && c.type === "ref") return "reference of the record";
    return c.owner === "spec" || c.owner === "human" ? undefined : `${c.owner} column`;
  };

  /** The fields a row sets: its shown fields, then its readable `other_changes` entries, or the reason the entries cannot be read. */
  const wanted = (r: ReviewRow): { fields: Wanted[]; held: string[]; error?: string } => {
    const columns = getTab(schema, r.tab).columns.map((c) => c.column);
    const parsed = parseOtherChanges(r.otherChanges, columns);
    const all: Wanted[] = [...r.fields.filter((f) => f.state !== ""), ...("entries" in parsed ? parsed.entries : [])];
    return {
      fields: all.filter((f) => SETTING.includes(f.state)),
      held: all.filter((f) => !SETTING.includes(f.state)).map((f) => `${f.column} is ${f.state}`),
      ...("error" in parsed ? { error: parsed.error } : {}),
    };
  };

  const fresh = (tab: string): Row => ({ ...Object.fromEntries(getTab(schema, tab).columns.map((c) => [c.column, ""])), ...Object.fromEntries(master.tables[tab]!.extras.map((e) => [e, ""])), last_updated: runDate });
  const rowOf = (table: MasterTable, reference: string): Row | undefined => table.rows.find((row) => row[keyOf(table.tab)] === reference);

  const proposalIds = (r: ReviewRow): string[] => r.cells[label(h, "proposals")]!.split(" | ").map((p) => p.trim()).filter((p) => p !== "");
  const addProposals = (row: Row, r: ReviewRow, changes: Change[]): void => {
    const before = row.proposal_refs!;
    const ids = splitList(before);
    for (const id of proposalIds(r)) if (!ids.includes(id)) ids.push(id);
    if (joinList(ids) !== before) changes.push({ field: "proposal_refs", old: before, new: (row.proposal_refs = joinList(ids)) });
  };

  /** IDs of the new use case rows of the review files, whatever their review status, whatever its review status. */
  const knownIds = new Set(reviews.flatMap((f) => (f.tab === "Use Cases" ? f.rows.filter((x) => x.record === "").map((x) => x.useCase).filter((id) => id !== "") : [])));

  const process = (r: ReviewRow): void => {
    const tab = r.tab;
    const table = master.tables[tab]!;
    const skip = (reason: string): void => void decision.skipped.push({ review: r, reason });
    const conflict = (reason: string): void => void decision.conflicts.push({ review: r, reason });
    if (r.status !== "accepted") return skip(`not accepted (${r.status === "" ? "blank" : r.status})`);

    const { fields, held, error } = wanted(r);
    const applicable = fields.filter((f) => refusal(tab, f.column) === undefined);
    const existing = r.record !== "" ? rowOf(table, r.record) : undefined;

    if (r.appliedOn !== "") {
      skip(`already applied on ${r.appliedOn}`);
      const row = r.record !== "" ? existing : rowOf(table, r.suggestedRef);
      const missing = row === undefined ? [`the master has no row ${r.record !== "" ? r.record : r.suggestedRef}`] : applicable.filter((f) => norm(row[f.column]!) !== norm(f.proposed)).map((f) => `${f.column} is "${norm(row[f.column]!)}", not "${norm(f.proposed)}"`);
      if (missing.length > 0) decision.drift.push({ review: r, reason: `marked applied on ${r.appliedOn}, not in the master: ${missing.join("; ")}` });
      return;
    }
    if (r.record !== "" && existing === undefined) return skip(`${r.record} is not in the master`);

    let useCases: Row[] = [];
    const causes: string[] = [];
    if (r.record === "" && tab !== "Use Cases") {
      useCases = master.tables["Use Cases"]!.rows.filter((u) => useCaseId(u.vendor!, u.use_case_name!) === r.useCase);
      if (useCases.length === 0) {
        if (!knownIds.has(r.useCase)) {
          if (r.useCase === "") problems.push(`${r.file}: line ${r.line}: the use_case cell is blank; a new row needs a use case ID such as uc-example-vendor-daily-report`);
          else problems.push(`${r.file}: line ${r.line}: use case "${r.useCase}" is not a use case in the master or the review files; the use_case cell must hold a use case ID such as uc-example-vendor-daily-report`);
          return;
        }
        return skip(`use case ${r.useCase} is not in the master`);
      }
    }
    if (r.record === "" && tab === "Use Cases") {
      const value = (column: string): string => norm(applicable.find((f) => f.column === column && SETTING.includes(f.state))?.proposed ?? "");
      const id = useCaseId(value("vendor"), value("use_case_name"));
      if (id === undefined) return conflict("the new use case has no name or no vendor, so it has no use case ID");
      if (id !== r.useCase) causes.push(`the use case ID ${id} from the proposed vendor and name differs from the use_case cell ${r.useCase}`);
      if (master.tables["Use Cases"]!.rows.some((u) => useCaseId(u.vendor!, u.use_case_name!) === id)) causes.push(`the use case ID ${id} already exists in the master`);
    }

    if (r.changedSinceReview) causes.push("changed since review");
    causes.push(...held);
    if (r.conflict !== "") causes.push(`conflict: ${r.conflict}`);
    if (!r.digestMatches) causes.push("the content digest does not match the row; the file was edited after export");
    if (error !== undefined) causes.push(error);
    if (useCases.length > 1) causes.push(`the use case ID ${r.useCase} matches ${useCases.length} master rows`);
    if (existing !== undefined) {
      for (const f of applicable.filter((x) => norm(existing[x.column]!) !== norm(x.current))) causes.push(`${f.column}: the master holds "${norm(existing[f.column]!)}", the review row expects "${norm(f.current)}"`);
    }
    if (causes.length > 0) return conflict(causes.join("; "));

    for (const f of fields) {
      const reason = refusal(tab, f.column);
      if (reason !== undefined) decision.notApplied.push({ review: r, field: f.column, reason });
    }
    const checked = (f: Wanted): string | undefined => {
      const value = norm(f.proposed);
      const message = valueProblem(columnOf(tab, f.column), value);
      if (message !== undefined) problems.push(`${r.file}: line ${r.line}: ${f.column} ${message}`);
      return message === undefined ? value : undefined;
    };
    const values = applicable.map((f) => [f.column, checked(f)] as const);
    if (values.some(([, v]) => v === undefined)) return;

    if (existing !== undefined) {
      const changes: Change[] = [];
      for (const [column, value] of values) {
        if (value !== norm(existing[column]!)) {
          changes.push({ field: column, old: existing[column]!, new: value! });
          existing[column] = value!;
        }
      }
      if (changes.length === 0) return skip("the master already holds the proposed values");
      addProposals(existing, r, changes);
      existing.last_updated = runDate;
      decision.applied.push({ review: r, reference: r.record, kind: "update", changes });
      return;
    }

    const reference = r.suggestedRef;
    if (!isReference(reference)) {
      problems.push(`${r.file}: line ${r.line}: suggested_ref "${reference}" is not a reference such as UC-001`);
      return;
    }
    if (rowOf(table, reference) !== undefined) {
      problems.push(`${r.file}: line ${r.line}: reference ${reference} already exists in the master or earlier in this run`);
      return;
    }
    const row = fresh(tab);
    for (const [column, value] of values) row[column] = value!;
    row[keyOf(tab)] = reference;
    if (tab !== "Use Cases") {
      const useCase = useCases[0]!;
      row.use_case_ref = useCase.use_case_ref!;
      if (tab !== "Mappings") row.vendor = useCase.vendor!;
      if (tab === "Questions") Object.assign(row, { use_case_name: useCase.use_case_name!, captured_on: runDate, status: "captured" });
    }
    const changes: Change[] = [];
    addProposals(row, r, changes);
    table.rows.push(row);
    table.lines.push(0);
    const added = Object.entries(row).filter(([column, value]) => value !== "" && column !== "last_updated" && column !== "proposal_refs");
    decision.applied.push({ review: r, reference, kind: "add", changes: [...added.map(([field, value]) => ({ field, old: "", new: value })), ...changes] });
  };

  for (const file of reviews) for (const r of [...file.rows].sort((a, b) => a.order - b.order)) process(r);
  return decision;
}
