import { splitList, type Row, type Table } from "../../tracker-tables/src/csv.ts";
import { dueOn, isOverdue } from "../../tracker-tables/src/working_days.ts";

export const UNASSIGNED = "unassigned";
const UNKNOWN = "unknown";
const NO_CANDIDATE = "no workflow candidate";
/** Source statuses that block a use case, in the order they are listed. */
const SOURCE_BLOCKERS = ["not-located", "empty", "confirmed-unavailable", "uncertain-mapping"];
const FOLLOW_UP = ["partially-answered", "cannot-answer"];
const OPEN_QUESTION = ["captured", "released", "clarification-requested"];
const OPEN_RELEASED = ["released", "clarification-requested"];
const PENDING_MAPPING = ["candidate", "pending-clarification", "re-review-suggested"];

export type Tables = Record<string, Table>;
export type Overdue = { ref: string; useCase: string; vendor: string; due: string; days: number; status: string; answer: string; followUp: boolean; resolver?: string; owner: string };
export type Summary = {
  date: string;
  stages: string[];
  tracks: { vendor: string; counts: number[]; noStage: number; total: number }[];
  overdue: { owner: string; rows: Overdue[] }[];
  overdueCount: number;
  awaiting: { ref: string; useCase: string; vendor: string; owner: string; answeredOn: string; age: number | undefined }[];
  pending: { useCase: string; vendor: string; version: string; requested: string; owner: string }[];
  sourceBlockers: { ref: string; useCase: string; vendor: string; status: string; owner: string; documents: number }[];
  otherBlockers: { head: string; vendor: string; what: string; owner: string; extra: string }[];
  access: { ref: string; vendor: string; useCase: string; endpoint: string; coordinator: string; vendorOwner: string; status: string; availability: string; verification: string; acknowledgement: string }[];
  mappings: { ref: string; useCase: string; workflow: string; status: string; impact: string }[];
  batches: { vendor: string; workflow: string; useCases: string[] }[];
  limits: { ref: string; vendor: string; limit: string; notes: string }[];
  unassigned: { kind: string; ref: string; useCase: string; detail: string }[];
};

const blank = (value: string | undefined): boolean => (value ?? "").trim() === "";
const text = (value: string | undefined, fallback: string): string => (blank(value) ? fallback : value!.trim());
const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const days = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
const unassignedLast = (a: string, b: string): number => Number(a === UNASSIGNED) - Number(b === UNASSIGNED) || byText(a, b);

export function buildSummary(tables: Tables, stages: string[], date: string, holidays: string[]): Summary {
  const useCases = tables["Use Cases"]!.rows;
  const questions = tables.Questions!.rows;
  const requests = tables["Identity & Access"]!.rows;
  const batches = tables.Batches!.rows;
  const byUseCase = new Map(useCases.map((u) => [u.use_case_ref!, u]));
  const label = (ref: string): string => (byUseCase.has(ref) ? `${ref} ${byUseCase.get(ref)!.use_case_name}` : text(ref, UNKNOWN));
  const vendorOf = (u: Row): string => text(u.vendor, UNASSIGNED);

  // Status: the tracks are the vendors found in the use cases.
  const tracks = [...new Set(useCases.map(vendorOf))].sort(byText).map((vendor) => {
    const rows = useCases.filter((u) => vendorOf(u) === vendor);
    return { vendor, counts: stages.map((s) => rows.filter((u) => u.stage === s).length), noStage: rows.filter((u) => u.stage === "").length, total: rows.length };
  });

  // Overdue questions, from the day after due_on, and complete answers awaiting lead review.
  const released = questions.filter((q) => q.released_on !== "");
  const overdueAll: Overdue[] = released
    .map((q) => ({ q, due: q.due_on || dueOn(q.released_on!, holidays) }))
    .filter(({ q, due }) => isOverdue(date, due, q.answer_status!, q.status!))
    .map(({ q, due }) => ({
      ref: q.question_ref!,
      useCase: label(q.use_case_ref!),
      vendor: text(q.vendor, UNKNOWN),
      due,
      days: days(due, date),
      status: q.status!,
      answer: q.answer_status!,
      followUp: FOLLOW_UP.includes(q.answer_status!),
      ...(q.answer_status === "cannot-answer" ? { resolver: text(q.resolver, UNASSIGNED) } : {}),
      owner: text(q.our_owner, UNASSIGNED),
    }));
  const overdue = [...new Set(overdueAll.map((o) => o.owner))].sort(unassignedLast).map((owner) => ({
    owner,
    rows: overdueAll.filter((o) => o.owner === owner).sort((a, b) => byText(a.due, b.due) || byText(a.ref, b.ref)),
  }));
  const awaiting = released
    .filter((q) => q.status === "released" && q.answer_status === "answered")
    .map((q) => ({ ref: q.question_ref!, useCase: label(q.use_case_ref!), vendor: text(q.vendor, UNKNOWN), owner: text(q.our_owner, UNASSIGNED), answeredOn: q.answered_on!, age: q.answered_on === "" ? undefined : days(q.answered_on!, date) }))
    .sort((a, b) => byText(a.ref, b.ref));

  const pending = useCases
    .filter((u) => u.stage === "awaiting-acknowledgement")
    .sort((a, b) => byText(a.use_case_ref!, b.use_case_ref!))
    .map((u) => ({ useCase: label(u.use_case_ref!), vendor: vendorOf(u), version: text(u.current_version, UNKNOWN), requested: text(u.acknowledgement_requested_on, UNKNOWN), owner: text(u.our_owner, UNASSIGNED) }));

  // Blockers: source first, with its own status and owner; documents never clear it.
  const sourceBlockers = useCases
    .filter((u) => SOURCE_BLOCKERS.includes(u.source_status!))
    .sort((a, b) => SOURCE_BLOCKERS.indexOf(a.source_status!) - SOURCE_BLOCKERS.indexOf(b.source_status!) || byText(a.use_case_ref!, b.use_case_ref!))
    .map((u) => ({ ref: u.use_case_ref!, useCase: label(u.use_case_ref!), vendor: vendorOf(u), status: u.source_status!, owner: text(u.source_owner, UNASSIGNED), documents: splitList(u.supporting_documents!).length }));
  const otherBlockers = [
    ...useCases.filter((u) => !blank(u.blocked_reason)).map((u) => ({ head: label(u.use_case_ref!), vendor: vendorOf(u), what: `blocked: ${u.blocked_reason}`, owner: text(u.our_owner, UNASSIGNED), extra: "" })),
    ...questions
      .filter((q) => q.blocks_mapping === "yes" && OPEN_QUESTION.includes(q.status!))
      .map((q) => ({ head: `${q.question_ref} | ${label(q.use_case_ref!)}`, vendor: text(byUseCase.get(q.use_case_ref!)?.vendor ?? q.vendor, UNKNOWN), what: `open mapping-blocking question (${q.status})`, owner: text(q.our_owner, UNASSIGNED), extra: "" })),
    ...requests
      .filter((a) => a.request_status === "blocked")
      .map((a) => ({ head: `${a.access_ref} | ${label(a.use_case_ref!)}`, vendor: text(a.vendor, UNKNOWN), what: "blocked access request", owner: text(a.our_coordinator, UNASSIGNED), extra: ` | vendor action owner ${text(a.vendor_action_owner, UNASSIGNED)}${blank(a.affected_workflow) ? "" : ` | affected workflow ${a.affected_workflow}`}` })),
  ];

  // Identity and access: blocked requests first; approval, verification and acknowledgement stay separate.
  const access = [...requests]
    .sort((a, b) => Number(b.request_status === "blocked") - Number(a.request_status === "blocked") || byText(a.access_ref!, b.access_ref!))
    .map((a) => {
      const u = byUseCase.get(a.use_case_ref!);
      return {
        ref: a.access_ref!,
        vendor: text(a.vendor, UNKNOWN),
        useCase: label(a.use_case_ref!),
        endpoint: [a.service, a.endpoint].filter((p) => !blank(p)).join(" ") || "unknown endpoint",
        coordinator: text(a.our_coordinator, UNASSIGNED),
        vendorOwner: text(a.vendor_action_owner, UNASSIGNED),
        status: text(a.request_status, UNKNOWN),
        availability: text(a.expected_availability, UNKNOWN),
        verification: text(a.verification, UNKNOWN),
        acknowledgement: !u ? UNKNOWN : u.acknowledged_on !== "" ? `acknowledged ${text(u.acknowledged_version, UNKNOWN)} on ${u.acknowledged_on}` : "not acknowledged",
      };
    });

  // Mappings waiting on a person.
  const mappings = tables.Mappings!.rows
    .filter((m) => PENDING_MAPPING.includes(m.mapping_status!))
    .sort((a, b) => byText(a.mapping_ref!, b.mapping_ref!))
    .map((m) => {
      const u = byUseCase.get(m.use_case_ref!);
      return { ref: m.mapping_ref!, useCase: label(m.use_case_ref!), workflow: text(m.workflow_candidate, UNKNOWN), status: m.mapping_status!, impact: text(u?.grouping_impact, UNKNOWN) + (blank(u?.grouping_impact_lead) ? "" : ` (lead: ${u!.grouping_impact_lead})`) };
    });

  // Next batches: unreleased use cases grouped by vendor and workflow candidate, ranked by how many each group unblocks.
  const releasedRefs = new Set([...released.map((q) => q.use_case_ref!), ...batches.filter((b) => b.released_on !== "").flatMap((b) => splitList(b.use_case_refs!))]);
  const groups = new Map<string, { vendor: string; workflow: string; useCases: string[] }>();
  for (const u of useCases.filter((c) => !releasedRefs.has(c.use_case_ref!))) {
    const workflow = text(u.workflow_candidate, NO_CANDIDATE);
    const key = `${vendorOf(u)}\u0000${workflow}`;
    const group = groups.get(key) ?? { vendor: vendorOf(u), workflow, useCases: [] };
    group.useCases.push(u.use_case_ref!);
    groups.set(key, group);
  }
  const ranked = [...groups.values()].map((g) => ({ ...g, useCases: g.useCases.sort(byText) })).sort((a, b) => b.useCases.length - a.useCases.length || byText(a.vendor, b.vendor) || byText(a.workflow, b.workflow));
  const limits = batches
    .filter((b) => b.released_on === "" && b.status !== "closed" && (!blank(b.provisional_limits) || !blank(b.capacity_notes)))
    .sort((a, b) => byText(text(a.vendor, UNASSIGNED), text(b.vendor, UNASSIGNED)) || byText(a.batch_ref!, b.batch_ref!))
    .map((b) => ({ ref: b.batch_ref!, vendor: text(b.vendor, UNASSIGNED), limit: b.provisional_limits!.trim(), notes: b.capacity_notes!.trim() }));

  // Unassigned: nothing here is guessed; a blank owner is flagged.
  const unassignedQuestions = [...overdueAll.filter((o) => o.owner === UNASSIGNED), ...awaiting.filter((a) => a.owner === UNASSIGNED)].sort((a, b) => byText(a.ref, b.ref));
  const unassigned = [
    ...useCases.filter((u) => !blank(u.next_action) && blank(u.next_action_owner)).map((u) => ({ kind: "pending action", ref: u.use_case_ref!, useCase: label(u.use_case_ref!), detail: u.next_action! })),
    ...requests.filter((a) => !blank(a.next_action) && blank(a.next_action_owner)).map((a) => ({ kind: "pending action", ref: a.access_ref!, useCase: label(a.use_case_ref!), detail: a.next_action! })),
    ...sourceBlockers.filter((s) => s.owner === UNASSIGNED).map((s) => ({ kind: "source blocker", ref: s.ref, useCase: s.useCase, detail: `source ${s.status}` })),
    ...unassignedQuestions.map((q) => ({ kind: "question", ref: q.ref, useCase: q.useCase, detail: "no owner" })),
    ...released.filter((q) => q.answer_status === "cannot-answer" && OPEN_RELEASED.includes(q.status!) && blank(q.resolver)).map((q) => ({ kind: "cannot-answer row", ref: q.question_ref!, useCase: label(q.use_case_ref!), detail: "no resolver" })),
  ];

  return { date, stages, tracks, overdue, overdueCount: overdueAll.length, awaiting, pending, sourceBlockers, otherBlockers, access, mappings, batches: ranked, limits, unassigned };
}
