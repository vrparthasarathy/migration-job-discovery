import { joinList, splitList, type Row } from "../../tracker-tables/src/csv.ts";
import { useCaseId } from "../../tracker-tables/src/use_case_id.ts";
import { getTab, validateTable, type Column, type Schema } from "../../tracker-tables/src/schema.ts";
import { PROPOSABLE, slug, type Change, type ExportData } from "./inputs.ts";
import { findSimilar, type Candidate } from "./matching.ts";

export type Rejected = { change: Change; reason: string };
export type FieldUpdate = { tab: string; record: string; change: Change; field: string; current: string; proposed: string };
export type Conflict = { id: string; kind: string; tab: string; record: string; change: Change; current: string; proposed: string; detail: string; ids: string[] };
export type Held = { change: Change; record: string; reason: string };
export type Addition = { tab: string; ref: string; localKey: string; changes: Change[] };
export type Suggestion = { kind: string; tab: string; record: string; field: string; current: string; suggested: string; related: string; score: string; review: string; reason: string; source: string; update_id: string };

export type Result = {
  scope: string;
  exportedAt: string;
  additions: Addition[];
  fieldUpdates: FieldUpdate[];
  conflicts: Conflict[];
  held: Held[];
  suggestions: Suggestion[];
  rejected: Rejected[];
  reflected: number;
};

type Pending = { change: Change; rec: Row; column: Column; current: string; proposed: string };

const compareVersions = (a: string, b: string): number => a.trim().replace(/^v/i, "").localeCompare(b.trim().replace(/^v/i, ""), "en", { numeric: true });

function field(row: Row | undefined, name: string): string {
  return row?.[name] ?? "";
}

function highestNumbers(data: ExportData): Map<string, number> {
  const highest = new Map<string, number>();
  for (const table of Object.values(data.tables)) {
    for (const row of table.rows) {
      for (const value of Object.values(row)) {
        for (const item of splitList(value)) {
          const match = /^([A-Z]{2})-(\d+)$/.exec(item);
          if (match) highest.set(match[1]!, Math.max(highest.get(match[1]!) ?? 0, Number(match[2])));
        }
      }
    }
  }
  return highest;
}

export function reconcile(schema: Schema, data: ExportData, changes: Change[], scope: string): Result {
  const rowsOf = (tab: string): Row[] => data.tables[tab]!.rows;
  const columnOf = (tab: string, name: string): Column => getTab(schema, tab).columns.find((c) => c.column === name)!;
  const keyColumn = (tab: string): string => getTab(schema, tab).columns.find((c) => c.key && c.type === "ref")!.column;
  const useCaseIds = new Map(rowsOf("Use Cases").map((r) => [field(r, "use_case_ref"), useCaseId(field(r, "vendor"), field(r, "use_case_name")) ?? ""]));
  const exportedAt = data.manifest.rows.find((r) => r.scope === scope)!.exported_at!.slice(0, 10);

  const matchesNaturalKey = (tab: string, key: string, row: Row): boolean => {
    const id = useCaseIds.get(field(row, "use_case_ref")) ?? "";
    if (tab === "Use Cases") return id !== "" && id === key;
    if (tab === "Questions") return splitList(field(row, "spec_refs")).some((ref) => ref.replace(/@.*$/, "") === key);
    if (id === "") return false;
    if (tab === "Mappings") return `${id}->>${slug(field(row, "workflow_candidate"))}` === key;
    return `${id}/${field(row, "endpoint")}/${field(row, "environment")}` === key;
  };
  const locate = (c: Change): Row | undefined => {
    const prefix = `${c.proposal_id}:${c.tab}:${c.record_key}:`;
    const rows = rowsOf(c.tab);
    return rows.find((r) => splitList(field(r, "proposal_refs")).some((id) => id.startsWith(prefix))) ?? rows.find((r) => matchesNaturalKey(c.tab, c.record_key, r));
  };
  const recordOf = (c: Change, rec: Row | undefined): string => (rec ? field(rec, keyColumn(c.tab)) : c.record_key);

  const rejection = (c: Change, rec: Row | undefined): string | undefined => {
    if (!PROPOSABLE[c.tab]) return `tab "${c.tab}" is not proposed; its rows are created by leads`;
    const column = columnOf(c.tab, c.field);
    if (column.owner === "forbidden") return `forbidden-class field "${c.field}" is set only by a lead or the tracker`;
    if (column.owner === "computed") return `computed field "${c.field}" is never accepted`;
    if (c.field === "proposal_refs") return "proposal_refs is kept by leads from the reconciler output";
    if (column.key && column.type === "ref") return `central reference "${c.field}" is assigned by leads only`;
    if (c.field === "request_status" && c.value !== "" && !["proposed", "ready-to-raise"].includes(c.value)) {
      return `request_status may only be suggested as proposed or ready-to-raise, not "${c.value}"`;
    }
    if (c.field === "question_text" && field(rec, "released_on") !== "") return "released question text is never changed; a new wording goes to current_spec_text";
    if (c.operation === "suggest" && column.owner === "spec") return `suggest is for human-owned fields; "${c.field}" is spec-owned`;
    if (c.operation === "link" && column.type !== "list") return `link needs a list field; "${c.field}" is ${column.type}`;
    if (c.operation !== "add" && !rec) return `record "${c.record_key}" is not in the export; only add creates a record`;
    const bad = validateTable(schema, c.tab, { file: "", header: [c.field], rows: [{ [c.field]: c.value }] }).find((f) => f.severity === "error" && f.field === c.field && f.row === 2);
    return bad ? `invalid value: ${bad.message}` : undefined;
  };

  const rejected: Rejected[] = [];
  const accepted: { change: Change; rec: Row | undefined }[] = [];
  for (const change of changes) {
    const rec = locate(change);
    const reason = rejection(change, rec);
    if (reason) rejected.push({ change, reason });
    else accepted.push({ change, rec });
  }

  const conflicts: Conflict[] = [];
  const recIds = (c: Change, rec: Row | undefined): string[] => [`${c.tab}|${c.record_key}`, ...(rec ? [`${c.tab}|${recordOf(c, rec)}`] : [])];
  const conflict = (kind: string, c: Change, rec: Row | undefined, current: string, proposed: string, detail: string): void => {
    conflicts.push({ id: `${kind}:${c.update_id}`, kind, tab: c.tab, record: recordOf(c, rec), change: c, current, proposed, detail, ids: recIds(c, rec) });
  };

  // Two proposals that give different values for one spec field are never resolved by picking one.
  const disputed = new Set<string>();
  const byField = new Map<string, { change: Change; rec: Row | undefined }[]>();
  for (const item of accepted) {
    const { change } = item;
    if ((change.operation === "add" || change.operation === "set") && columnOf(change.tab, change.field).owner === "spec") {
      const key = `${change.tab}|${change.record_key}|${change.field}`;
      byField.set(key, [...(byField.get(key) ?? []), item]);
    }
  }
  for (const group of byField.values()) {
    const values = [...new Set(group.map((g) => g.change.value).filter((v) => v !== ""))];
    if (values.length < 2) continue;
    for (const { change, rec } of group) {
      disputed.add(change.update_id);
      conflict("proposal-disagreement", change, rec, values.filter((v) => v !== change.value).join(" | "), change.value, "proposals disagree about this field; none is applied");
    }
  }

  let reflected = 0;
  const stale = (created: string): boolean => exportedAt < created;
  const absent: Change[] = [];
  const updates: Pending[] = [];
  const suggests: Pending[] = [];
  for (const { change: c, rec } of accepted) {
    if (disputed.has(c.update_id)) continue;
    if (!rec) {
      absent.push(c);
      continue;
    }
    const column = columnOf(c.tab, c.field);
    const current = field(rec, c.field);
    if (splitList(field(rec, "proposal_refs")).includes(c.update_id)) {
      reflected++;
      continue;
    }
    if (column.owner === "human" && c.value === "") continue;
    let proposed = c.value;
    if (c.operation === "link") {
      const missing = splitList(c.value).filter((item) => !splitList(current).includes(item));
      if (missing.length === 0) {
        reflected++;
        continue;
      }
      proposed = column.owner === "human" ? joinList(missing) : joinList([...splitList(current), ...missing]);
    } else if (c.value === current) {
      reflected++;
      continue;
    }
    if (column.owner === "human") {
      suggests.push({ change: c, rec, column, current, proposed });
      continue;
    }
    const before = conflicts.length;
    if (c.operation === "set" && c.base_value !== current) conflict("base-mismatch", c, rec, current, proposed, `the export value differs from base_value "${c.base_value}"`);
    if (field(rec, "last_updated") > c.created_on) conflict("later-edit", c, rec, current, proposed, `last_updated ${field(rec, "last_updated")} is later than created_on ${c.created_on}`);
    if (stale(c.created_on)) conflict("stale-export", c, rec, exportedAt, c.created_on, `the export was taken on ${exportedAt}, before the proposal was created on ${c.created_on}`);
    if (conflicts.length === before) updates.push({ change: c, rec, column, current, proposed });
  }

  // A conflict holds its record and every change that refers to it.
  const holder = (c: Change, rec: Row | undefined): string | undefined => {
    const refs = new Set([...recIds(c, rec), `Use Cases|${c.useCase}`]);
    if (c.tab === "Mappings") {
      const blocking = [...splitList(field(rec, "blocking_question_refs")), ...(c.field === "blocking_question_refs" ? splitList(c.value) : [])];
      blocking.forEach((ref) => refs.add(`Questions|${ref}`));
    }
    return conflicts.filter((x) => x.ids.some((id) => refs.has(id))).map((x) => x.id).sort()[0];
  };
  const held: Held[] = [];
  const keep = <T>(items: T[], change: (item: T) => Change, rec: (item: T) => Row | undefined): T[] =>
    items.filter((item) => {
      const by = holder(change(item), rec(item));
      if (by) held.push({ change: change(item), record: recordOf(change(item), rec(item)), reason: `held by ${by}` });
      return !by;
    });
  const freeUpdates = keep(updates, (u) => u.change, (u) => u.rec);
  const freeSuggests = keep(suggests, (s) => s.change, (s) => s.rec);
  // A new record is held whole: one held reference must not leave a partial addition.
  const groupKey = (c: Change): string => `${c.tab}|${c.record_key}`;
  const groupHolder = new Map<string, string>();
  for (const c of absent) {
    const by = holder(c, undefined);
    if (by && !groupHolder.has(groupKey(c))) groupHolder.set(groupKey(c), by);
  }
  const freeAbsent = absent.filter((c) => {
    const by = groupHolder.get(groupKey(c));
    if (by) held.push({ change: c, record: c.record_key, reason: `held by ${by}` });
    return !by;
  });

  const groups = new Map<string, Change[]>();
  for (const c of freeAbsent) groups.set(`${c.tab}|${c.record_key}`, [...(groups.get(`${c.tab}|${c.record_key}`) ?? []), c]);
  const highest = highestNumbers(data);
  const additions: Addition[] = [...groups.values()].map((list) => {
    const first = list[0]!;
    const rule = PROPOSABLE[first.tab]!;
    const next = (highest.get(rule.prefix) ?? 0) + 1;
    highest.set(rule.prefix, next);
    return { tab: first.tab, ref: `${rule.prefix}-${String(next).padStart(rule.width, "0")}`, localKey: first.record_key, changes: list };
  });

  const suggestions: Suggestion[] = [];
  const suggestion = (s: Partial<Suggestion> & Pick<Suggestion, "kind" | "tab" | "record" | "field" | "review" | "reason">, c: Change): void => {
    suggestions.push({ current: "", suggested: "", related: "", score: "", source: c.source, update_id: c.update_id, ...s });
  };

  const candidates: Candidate[] = rowsOf("Questions").filter((r) => field(r, "question_text") !== "").map((r) => ({ ref: field(r, "question_ref"), text: field(r, "question_text") }));
  for (const addition of additions.filter((a) => a.tab === "Questions")) {
    const text = addition.changes.find((c) => c.field === "question_text" && c.value !== "");
    if (!text) continue;
    for (const match of findSimilar(text.value, candidates)) {
      const related = candidates.find((c) => c.ref === match.ref)!;
      suggestion({ kind: "link", tab: "Questions", record: addition.ref, field: "question_text", suggested: `similar_to ${match.ref}`, related: match.ref, score: String(match.score), review: match.review, reason: `question text is similar to ${match.ref}: "${related.text}"; nothing is linked, merged or answered from it` }, text);
    }
    candidates.push({ ref: addition.ref, text: text.value });
  }

  for (const u of freeUpdates.filter((x) => x.change.tab === "Questions" && x.change.field === "current_spec_text")) {
    const released = field(u.rec, "question_text");
    if (released === "" || released === u.proposed) continue;
    const said = accepted.find((a) => a.change.tab === "Questions" && a.change.record_key === u.change.record_key && a.change.field === "text_review" && a.change.value !== "");
    suggestion({ kind: "text-review", tab: "Questions", record: recordOf(u.change, u.rec), field: "current_spec_text", current: released, suggested: u.proposed, review: "lead-review", reason: `the specification wording differs from the released question text, which stays as sent${said ? `; proposer suggests text_review ${said.change.value}` : ""}` }, u.change);
  }

  for (const u of freeUpdates.filter((x) => x.change.tab === "Use Cases" && x.change.field === "current_version")) {
    const lead = field(u.rec, "grouping_impact_lead");
    const stated = [...accepted].reverse().find((a) => a.change.tab === "Use Cases" && a.change.record_key === u.change.record_key && a.change.field === "grouping_impact" && a.change.value !== "")?.change.value ?? field(u.rec, "grouping_impact");
    const impact = lead !== "" ? (lead === "could-affect" ? "could-affect" : "none") : stated === "could-affect" ? "could-affect" : stated === "not-expected" ? "none" : "unknown";
    if (impact === "none") continue;
    const label = lead !== "" ? `${impact} (lead override)` : impact === "unknown" ? "unknown (listed for a lead)" : `${impact} (proposer)`;
    for (const m of rowsOf("Mappings").filter((r) => field(u.rec, "use_case_ref") !== "" && field(r, "use_case_ref") === field(u.rec, "use_case_ref"))) {
      const decided = field(m, "decision_ref") !== "" || ["accepted", "rejected"].includes(field(m, "mapping_status"));
      const considered = splitList(field(m, "spec_versions_considered"));
      const latest = [...considered].sort(compareVersions).at(-1);
      if (!decided || (latest !== undefined && compareVersions(latest, u.proposed) >= 0)) continue;
      suggestion({ kind: "re-review", tab: "Mappings", record: field(m, "mapping_ref"), field: "mapping_status", current: field(m, "mapping_status"), suggested: "re-review-suggested", review: `impact: ${impact}`, reason: `use case "${u.change.record_key}" moves to version ${u.proposed}; the decision considered ${considered.join(", ") || "no version"}; grouping impact ${label}` }, u.change);
    }
  }

  for (const s of freeSuggests) {
    suggestion({ kind: "human-field", tab: s.change.tab, record: recordOf(s.change, s.rec), field: s.change.field, current: s.current, suggested: s.proposed, review: s.current === "" ? "copy-if-agreed" : "current-value-kept", reason: s.change.reason }, s.change);
  }

  return { scope, exportedAt, additions, fieldUpdates: freeUpdates.map((u) => ({ tab: u.change.tab, record: recordOf(u.change, u.rec), change: u.change, field: u.change.field, current: u.current, proposed: u.proposed })), conflicts, held, suggestions, rejected, reflected };
}
