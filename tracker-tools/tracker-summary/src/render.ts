import type { Summary } from "./summary.ts";

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;
const list = (items: string[]): string[] => (items.length === 0 ? ["None."] : items.map((i) => `- ${i}`));

/** Renders the summary as Markdown, one numbered section per item of the call agenda. */
export function renderSummary(s: Summary): string {
  const out: string[] = [`# Tracker summary ${s.date}`, "INTERNAL: for the lead's call only; never share it with a vendor.", ""];

  out.push("## 1. Status", `| vendor | ${s.stages.join(" | ")} | no stage | total |`, `| --- |${" --- |".repeat(s.stages.length + 2)}`);
  for (const t of s.tracks) out.push(`| ${t.vendor} | ${t.counts.join(" | ")} | ${t.noStage} | ${t.total} |`);
  out.push("");

  out.push("## 2. Overdue questions", `Overdue as of ${s.date}: ${s.overdueCount}`);
  if (s.overdue.length === 0) out.push("None.");
  for (const group of s.overdue) {
    out.push(`### Owner: ${group.owner} (${group.rows.length})`);
    for (const o of group.rows) {
      const parts = [o.ref, o.useCase, o.vendor, `due ${o.due}`, `${plural(o.days, "day")} overdue`, `status ${o.status}`, `answer ${o.answer}`];
      if (o.followUp) parts.push("follow-up");
      if (o.resolver !== undefined) parts.push(`resolver ${o.resolver}`);
      out.push(`- ${parts.join(" | ")}`);
    }
  }
  out.push("### Awaiting lead review (complete answers; not vendor-overdue)");
  out.push(...list(s.awaiting.map((a) => [a.ref, a.useCase, a.vendor, `owner ${a.owner}`, `answered ${a.answeredOn || "unknown"}`, `age ${a.age === undefined ? "unknown" : plural(a.age, "day")}`].join(" | "))));
  out.push("");

  out.push("## 3. Pending acknowledgements", ...list(s.pending.map((p) => [p.useCase, p.vendor, `version ${p.version}`, `requested ${p.requested}`, `owner ${p.owner}`].join(" | "))), "");

  out.push("## 4. Missing source and other blockers", "### Missing source (documents never clear a source blocker)");
  out.push(...list(s.sourceBlockers.map((b) => [b.useCase, b.vendor, `source ${b.status}`, `owner ${b.owner}`, `supporting documents ${b.documents} (they do not clear the blocker)`].join(" | "))));
  out.push("### Other blockers", ...list(s.otherBlockers.map((b) => `${b.head} | ${b.vendor} | ${b.what} | owner ${b.owner}${b.extra}`)), "");

  out.push("## 5. Identity and access", "Blocked requests come first; approval or provisioning, verification and acknowledgement are shown separately.");
  out.push(...list(s.access.map((a) => [a.ref, a.vendor, a.useCase, a.endpoint, `coordinator ${a.coordinator}`, `vendor action owner ${a.vendorOwner}`, `request ${a.status}`, `expected availability ${a.availability}`, `verification ${a.verification}`, `acknowledgement ${a.acknowledgement}`].join(" | "))), "");

  out.push("## 6. Mappings", ...list(s.mappings.map((m) => [m.ref, m.useCase, `workflow ${m.workflow}`, m.status, `grouping impact ${m.impact}`].join(" | "))), "");

  out.push("## 7. Next batches and capacity", "Advisory only: ranked by the use cases each group unblocks; no distribution of use cases across vendors is suggested, no question is released and no commitment is set.", "### Suggested batches");
  if (s.batches.length === 0) out.push("None.");
  s.batches.forEach((b, i) => out.push(`${i + 1}. ${b.vendor} | ${b.workflow} | unblocks ${plural(b.useCases.length, "use case")}: ${b.useCases.join(", ")}`));
  out.push("### Provisional limits");
  out.push(...list(s.limits.map((l) => [l.ref, l.vendor, ...(l.limit ? [`provisional limit: ${l.limit} (provisional)`] : []), ...(l.notes ? [`capacity notes: ${l.notes}`] : [])].join(" | "))), "");

  out.push("## 8. Unassigned", ...list(s.unassigned.map((u) => `${u.ref} | ${u.kind} | ${u.useCase} | ${u.detail}`)));
  return out.join("\n") + "\n";
}
