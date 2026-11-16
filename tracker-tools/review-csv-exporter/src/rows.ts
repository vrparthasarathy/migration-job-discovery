import { createHash } from "node:crypto";
import type { Row } from "../../tracker-tables/src/csv.ts";
import { getTab, type Schema } from "../../tracker-tables/src/schema.ts";
import { PROPOSABLE, type Change, type ExportData } from "../../tracker-reconciler/src/inputs.ts";
import type { Result } from "../../tracker-reconciler/src/reconcile.ts";
import { contentHeader, fieldHeaders, label, type Headings } from "./headings.ts";

/** The proposable tabs in the order they are listed and sorted. */
export const TABS = ["Use Cases", "Questions", "Identity & Access", "Mappings"].filter((tab) => tab in PROPOSABLE);
const STATE_RANK: Record<string, number> = { add: 1, update: 2, suggest: 3, held: 4, conflict: 5 };

type Field = { current: string; proposed: string[]; state: string };
type Rec = {
  tab: string;
  identity: string;
  record: string;
  suggestedRef: string;
  recordKey: string;
  useCase: string;
  fields: Map<string, Field>;
  conflicts: string[];
  suggestions: string[];
  sources: Set<string>;
  proposals: Set<string>;
  reasons: Set<string>;
};

/** One review row before its review cells are merged in. `cells` is keyed by heading. */
export type Built = { tab: string; identity: string; tier: number; useCase: string; cells: Row };

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const push = (list: string[], value: string): void => {
  if (!list.includes(value)) list.push(value);
};

/** The sha256 of the content cells, so a refresh can tell that a reviewed row changed. */
export const digestOf = (header: string[], cells: Row): string => createHash("sha256").update(JSON.stringify(header.map((name) => cells[name]!))).digest("hex");

/** Turns the reconciler result into one review row per (tab, identity), ranked by what each needs from the lead. */
export function buildRows(schema: Schema, h: Headings, data: ExportData, result: Result, changes: Change[]): Built[] {
  const refColumn = (tab: string): string => getTab(schema, tab).columns.find((c) => c.key && c.type === "ref")!.column;
  const exported = (tab: string, record: string): Row | undefined => data.tables[tab]!.rows.find((r) => r[refColumn(tab)] === record);
  const byUpdate = new Map(changes.map((c) => [c.update_id, c]));
  const newRefs = new Map(result.additions.map((a) => [`${a.tab}|${a.ref}`, a.localKey]));
  const recs = new Map<string, Rec>();

  const recOf = (tab: string, record: string): Rec => {
    const local = newRefs.get(`${tab}|${record}`);
    const existing = local === undefined && exported(tab, record) !== undefined;
    const identity = existing ? record : `new:${local ?? record}`;
    const id = `${tab}|${identity}`;
    if (!recs.has(id)) recs.set(id, { tab, identity, record: existing ? record : "", suggestedRef: "", recordKey: existing ? "" : (local ?? record), useCase: "", fields: new Map(), conflicts: [], suggestions: [], sources: new Set(), proposals: new Set(), reasons: new Set() });
    return recs.get(id)!;
  };
  const touch = (r: Rec, c: Change): void => {
    r.useCase ||= c.useCase;
    if (c.tab === r.tab) r.recordKey ||= c.record_key;
    r.sources.add(c.source);
    r.proposals.add(c.proposal_id);
    r.reasons.add(c.reason);
  };
  const setField = (r: Rec, field: string, current: string, proposed: string, state: string): void => {
    const f = r.fields.get(field);
    if (!f) r.fields.set(field, { current, proposed: [proposed], state });
    else {
      if (STATE_RANK[state]! > STATE_RANK[f.state]!) Object.assign(f, { state, current });
      push(f.proposed, proposed);
    }
  };
  const currentOf = (r: Rec, field: string): string => (r.record ? (exported(r.tab, r.record)![field] ?? "") : "");

  for (const a of result.additions) {
    const r = recOf(a.tab, a.localKey);
    r.suggestedRef = a.ref;
    for (const c of a.changes) {
      touch(r, c);
      setField(r, c.field, "", c.value, "add");
    }
  }
  for (const u of result.fieldUpdates) {
    const r = recOf(u.tab, u.record);
    touch(r, u.change);
    setField(r, u.field, u.current, u.proposed, "update");
  }
  for (const s of result.suggestions) {
    const r = recOf(s.tab, s.record);
    const c = byUpdate.get(s.update_id)!;
    touch(r, c);
    if (s.kind === "human-field" || s.kind === "re-review") setField(r, s.field, s.current, s.suggested, "suggest");
    if (s.kind === "link") push(r.suggestions, `link: similar to ${s.related} (score ${s.score}, ${s.review})`);
    else if (s.kind === "text-review") push(r.suggestions, `text-review: ${s.reason}`);
    else if (s.kind === "re-review") push(r.suggestions, `re-review: ${s.reason} (${s.review})`);
  }
  for (const k of result.conflicts) {
    const r = recOf(k.tab, k.record);
    touch(r, k.change);
    setField(r, k.change.field, currentOf(r, k.change.field), k.change.value, "conflict");
    push(r.conflicts, `${k.kind}: ${k.detail}`);
  }
  for (const x of result.held) {
    const r = recOf(x.change.tab, x.record);
    touch(r, x.change);
    setField(r, x.change.field, currentOf(r, x.change.field), x.change.value, "held");
    push(r.conflicts, `held: ${x.change.field} (${x.reason})`);
  }

  const header = (tab: string): string[] => contentHeader(h, tab);
  const built = [...recs.values()].map((r): Built => {
    const states = [...r.fields.values()].map((f) => f.state);
    const tier = r.conflicts.length > 0 ? 1 : r.suggestions.length > 0 || states.includes("suggest") ? 2 : 3;
    const kind = tier === 1 ? "conflict" : !states.some((s) => s === "add" || s === "update") ? "suggestion" : r.record === "" ? "add" : "update";
    const shown = h.shown[r.tab]!.map((s) => s.column);
    const cells: Row = {
      [label(h, "use_case")]: r.useCase,
      [label(h, "record")]: r.record,
      [label(h, "suggested_ref")]: r.suggestedRef,
      [label(h, "record_key")]: r.recordKey,
      [label(h, "kind")]: kind,
      [label(h, "conflict")]: r.conflicts.join(" | "),
      [label(h, "suggestions")]: r.suggestions.join(" | "),
      [label(h, "other_changes")]: [...r.fields].filter(([name]) => !shown.includes(name)).sort(([a], [b]) => compare(a, b)).map(([name, f]) => `${name}: ${f.current} -> ${f.proposed.join(" | ")} [${f.state}]`).join(" | "),
      [label(h, "reason")]: [...r.reasons].join(" | "),
      [label(h, "evidence")]: [...r.sources].sort(compare).join(" | "),
      [label(h, "proposals")]: [...r.proposals].sort(compare).join(" | "),
    };
    for (const { column, heading } of h.shown[r.tab]!) {
      const f = r.fields.get(column);
      fieldHeaders(h, heading).forEach((name, i) => (cells[name] = f ? [f.current, f.proposed.join(" | "), f.state][i]! : ""));
    }
    cells[label(h, "content_digest")] = digestOf(header(r.tab), cells);
    return { tab: r.tab, identity: r.identity, tier, useCase: r.useCase, cells };
  });
  built.sort((a, b) => a.tier - b.tier || compare(a.useCase, b.useCase) || TABS.indexOf(a.tab) - TABS.indexOf(b.tab) || compare(a.identity, b.identity));
  built.forEach((row, i) => (row.cells[label(h, "order")] = String(i + 1)));
  return built;
}
