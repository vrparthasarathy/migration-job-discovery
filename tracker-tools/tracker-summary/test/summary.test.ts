import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { baseExport } from "./fixtures.ts";
import { fixture, section, summarize } from "./support.ts";

async function build(mutate: (data: ReturnType<typeof baseExport>) => void = () => {}): Promise<string> {
  const data = baseExport();
  mutate(data);
  const f = await fixture(data);
  const outcome = await summarize(f.exportDir, f.out);
  assert.equal(outcome.status, 0, outcome.stderr);
  return outcome.summary;
}

/** The single line of `text` that starts with `- <ref>`. */
function entry(text: string, ref: string): string {
  const lines = text.split("\n").filter((l) => l.startsWith(`- ${ref} `));
  assert.equal(lines.length, 1, `expected one line for ${ref} in:\n${text}`);
  return lines[0]!;
}

/** Splits `text` at `marker`, asserting that the marker is there once. */
function halves(text: string, marker: string): [string, string] {
  const parts = text.split(marker);
  assert.equal(parts.length, 2, `expected "${marker}" once in:\n${text}`);
  return [parts[0]!, parts[1]!];
}

const OVERDUE = "2. Overdue questions";

test("[B01] it counts use cases per vendor track and stage, with a column for each stage", async () => {
  const status = section(await build(), "1. Status");
  assert.match(status, /\| vendor \| draft \| review \| sent \| awaiting-acknowledgement \| acknowledged \| no stage \| total \|/);
  assert.match(status, /\| alpha \| 1 \| 1 \| 0 \| 0 \| 0 \| 0 \| 2 \|/);
  assert.match(status, /\| beta \| 2 \| 0 \| 1 \| 1 \| 0 \| 0 \| 4 \|/);
  assert.match(status, /\| gamma \| 2 \| 1 \| 0 \| 0 \| 1 \| 1 \| 5 \|/);
});

test("[B01] the tracks are the vendors found in the data, including a new one and a use case without a vendor", async () => {
  const status = section(
    await build((data) => {
      data["Use Cases"]!.push({ use_case_ref: "UC-012", use_case_name: "Archive", vendor: "delta", stage: "sent" }, { use_case_ref: "UC-013", use_case_name: "Loose", vendor: "", stage: "draft" });
    }),
    "1. Status",
  );
  assert.match(status, /\| delta \| 0 \| 0 \| 1 \| 0 \| 0 \| 0 \| 1 \|/);
  assert.match(status, /\| unassigned \| 1 \| 0 \| 0 \| 0 \| 0 \| 0 \| 1 \|/);
});

test("[B02] an open released row after its due date is overdue with the original due date and days overdue, under its owner", async () => {
  const text = section(await build(), OVERDUE);
  assert.match(text, /### Owner: lead-a \(2\)/);
  assert.match(entry(text, "QN-0001"), /UC-001 Daily Report \| alpha \| due 2026-11-11 \| 5 days overdue \| status released \| answer not-answered$/);
  assert.match(text, /### Owner: lead-b \(3\)/);
  assert.match(text, /Overdue as of 2026-11-16: 6/);
});

test("[B02] a partially answered row stays overdue and is marked follow-up", async () => {
  const line = entry(section(await build(), OVERDUE), "QN-0002");
  assert.match(line, /due 2026-11-11 \| 5 days overdue/);
  assert.match(line, /answer partially-answered \| follow-up$/);
});

test("[B02] a cannot-answer row stays overdue, is marked follow-up and shows its resolver", async () => {
  const line = entry(section(await build(), OVERDUE), "QN-0003");
  assert.match(line, /answer cannot-answer \| follow-up \| resolver res-1$/);
});

test("[B02] a cannot-answer row without a resolver shows unassigned", async () => {
  const line = entry(section(await build(), OVERDUE), "QN-0004");
  assert.match(line, /follow-up \| resolver unassigned$/);
});

test("[B02] a clarification-requested row is overdue on its original due date even when the vendor answer is complete", async () => {
  const line = entry(section(await build(), OVERDUE), "QN-0005");
  assert.match(line, /due 2026-11-11 \| 5 days overdue \| status clarification-requested \| answer answered$/);
  assert.doesNotMatch(line, /follow-up/);
});

test("[B02] a complete answer awaiting lead review is listed apart with its owner and age and is not vendor-overdue", async () => {
  const text = section(await build(), OVERDUE);
  const [overdue, awaiting] = halves(text, "### Awaiting lead review");
  assert.match(overdue, /QN-0001/);
  assert.doesNotMatch(overdue, /QN-0006/);
  assert.match(entry(awaiting, "QN-0006"), /UC-005 Audit \| gamma \| owner lead-c \| answered 2026-11-13 \| age 3 days$/);
});

test("[B02] an answer awaiting review with no answered date shows its age as unknown", async () => {
  const text = section(
    await build((data) => {
      data.Questions!.find((q) => q.question_ref === "QN-0006")!.answered_on = "";
    }),
    OVERDUE,
  );
  assert.match(entry(text, "QN-0006"), /age unknown$/);
});

test("[B02] a resolved row, a captured row and an unreleased row are never counted", async () => {
  const text = section(
    await build((data) => {
      data.Questions!.push({ question_ref: "QN-0011", use_case_ref: "UC-001", vendor: "alpha", status: "released", answer_status: "not-answered", our_owner: "lead-a", released_on: "", due_on: "2026-11-01" });
    }),
    OVERDUE,
  );
  assert.match(text, /Overdue as of 2026-11-16: 6/);
  for (const ref of ["QN-0007", "QN-0008", "QN-0009", "QN-0011"]) assert.doesNotMatch(text, new RegExp(ref));
});

test("[B02] a row is not overdue on its due date, and the due date counts the lead's holidays", async () => {
  const data = baseExport();
  data.Questions = [{ question_ref: "QN-0001", use_case_ref: "UC-001", vendor: "alpha", status: "released", answer_status: "not-answered", our_owner: "lead-a", released_on: "2026-11-09", due_on: "" }];
  const f = await fixture(data);
  const holidays = `${f.dir}/holidays.txt`;
  await writeFile(holidays, "2026-11-10\n\n");
  const same = await summarize(f.exportDir, f.out, ["--date", "2026-11-12", "--holidays", holidays]);
  assert.doesNotMatch(section(same.summary, OVERDUE), /QN-0001/);
  const next = await summarize(f.exportDir, f.out, ["--date", "2026-11-13", "--holidays", holidays]);
  assert.match(entry(section(next.summary, OVERDUE), "QN-0001"), /due 2026-11-12 \| 1 day overdue/);
});

test("[B02] a section with nothing to list says so", async () => {
  const data = baseExport();
  data.Questions = [];
  const f = await fixture(data);
  const text = section((await summarize(f.exportDir, f.out)).summary, OVERDUE);
  assert.match(text, /Overdue as of 2026-11-16: 0\nNone\./);
  assert.match(text, /### Awaiting lead review[^\n]*\nNone\./);
});

test("[B02] a pending acknowledgement shows its version and the date requested", async () => {
  const summary = await build((data) => {
    data["Use Cases"]!.push({ use_case_ref: "UC-012", use_case_name: "Bare", vendor: "beta", stage: "awaiting-acknowledgement" });
  });
  const text = section(summary, "3. Pending acknowledgements");
  assert.match(entry(text, "UC-004"), /Refund \| beta \| version 3 \| requested 2026-11-10 \| owner lead-b$/);
  assert.match(entry(text, "UC-012"), /version unknown \| requested unknown \| owner unassigned$/);
  assert.doesNotMatch(text, /UC-003|UC-005/);
});

test("[B03] source blockers come first with each status kept distinct, their owner, and documents never clearing them", async () => {
  const text = section(await build(), "4. Missing source and other blockers");
  const [source, other] = halves(text, "### Other blockers");
  assert.match(entry(source, "UC-002"), /Export Data \| alpha \| source not-located \| owner ana \| supporting documents 2 \(they do not clear the blocker\)$/);
  assert.match(entry(source!, "UC-003"), /source empty \| owner unassigned \| supporting documents 0/);
  assert.match(entry(source!, "UC-004"), /source confirmed-unavailable \| owner bo/);
  assert.match(entry(source!, "UC-005"), /source uncertain-mapping \| owner cy/);
  assert.doesNotMatch(source!, /UC-001|UC-006/);
  const order = ["not-located", "empty", "confirmed-unavailable", "uncertain-mapping"].map((s) => source!.indexOf(`source ${s}`));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.ok(text.indexOf("### Missing source") < text.indexOf("### Other blockers"));
  assert.match(other, /UC-004/);
});

test("[B03] a use case with a blocked reason, an open mapping-blocking question and a blocked access request is listed with its owner", async () => {
  const [, other] = halves(section(await build(), "4. Missing source and other blockers"), "### Other blockers");
  assert.match(entry(other, "UC-004"), /beta \| blocked: waiting on legal \| owner lead-b$/);
  assert.match(entry(other, "QN-0009"), /UC-006 Search \| gamma \| open mapping-blocking question \(captured\) \| owner unassigned$/);
  assert.match(entry(other, "AX-002"), /UC-003 Import \| beta \| blocked access request \| owner unassigned \| vendor action owner vb-1 \| affected workflow wf-import$/);
  assert.doesNotMatch(other, /AX-001|AX-003|QN-0001/);
});

test("[B03] a closed question that once blocked a mapping is not a blocker, and an empty list says so", async () => {
  const data = baseExport();
  data["Use Cases"] = [{ use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "alpha", stage: "draft", source_status: "located" }];
  data["Identity & Access"] = [];
  data.Questions = [{ question_ref: "QN-0001", use_case_ref: "UC-001", vendor: "alpha", status: "closed", blocks_mapping: "yes" }];
  const f = await fixture(data);
  const text = section((await summarize(f.exportDir, f.out)).summary, "4. Missing source and other blockers");
  assert.match(text, /### Missing source[^\n]*\nNone\./);
  assert.match(text, /### Other blockers\nNone\./);
});

test("[B04] each access request shows coordinator, vendor action owner, status, expected availability, verification and acknowledgement separately", async () => {
  const text = section(await build(), "5. Identity and access");
  assert.match(entry(text, "AX-001"), /alpha \| UC-001 Daily Report \| portal \/api\/a \| coordinator lead-a \| vendor action owner va-1 \| request approved \| expected availability 2026-12-01 \| verification verified \| acknowledgement not acknowledged$/);
  assert.match(entry(text, "AX-003"), /coordinator lead-c \| vendor action owner vc-1 \| request provisioned \| expected availability unknown \| verification failed \| acknowledgement acknowledged 4 on 2026-11-14$/);
});

test("[B04] a blocked request comes first and blank or unknown values are shown as unknown or unassigned", async () => {
  const text = section(await build(), "5. Identity and access");
  const first = text.split("\n").find((l) => l.startsWith("- "));
  assert.ok(first, `no request listed in:\n${text}`);
  assert.match(first, /^- AX-002 \| beta \| UC-003 Import \| portal \/api\/b \| coordinator unassigned \| vendor action owner vb-1 \| request blocked \| expected availability unknown \| verification not-verified \| acknowledgement not acknowledged$/);
});

test("[B04] a request for a use case that is not in the export shows its acknowledgement as unknown", async () => {
  const text = section(
    await build((data) => {
      data["Identity & Access"]!.push({ access_ref: "AX-004", vendor: "delta", use_case_ref: "UC-099", request_status: "proposed" });
    }),
    "5. Identity and access",
  );
  assert.match(entry(text, "AX-004"), /delta \| UC-099 \| unknown endpoint \| coordinator unassigned \| vendor action owner unassigned \| request proposed \| expected availability unknown \| verification unknown \| acknowledgement unknown$/);
});

test("[B05] mappings pending a decision, pending clarification or suggested for re-review are listed with grouping impact, unknown shown as unknown", async () => {
  const text = section(await build(), "6. Mappings");
  assert.match(entry(text, "MP-001"), /UC-001 Daily Report \| workflow wf-report \| candidate \| grouping impact unknown$/);
  assert.match(entry(text, "MP-002"), /UC-005 Audit \| workflow wf-audit \| pending-clarification \| grouping impact unknown$/);
  assert.match(entry(text, "MP-003"), /UC-006 Search \| workflow wf-search \| re-review-suggested \| grouping impact could-affect$/);
  assert.doesNotMatch(text, /MP-004/);
});

test("[B05] a lead's grouping impact decision is shown beside the specification's", async () => {
  const text = section(
    await build((data) => {
      Object.assign(data["Use Cases"]!.find((u) => u.use_case_ref === "UC-006")!, { grouping_impact_lead: "no-impact" });
    }),
    "6. Mappings",
  );
  assert.match(entry(text, "MP-003"), /grouping impact could-affect \(lead: no-impact\)$/);
});

test("[B06] next batches group unreleased use cases by workflow candidate per vendor and rank by use cases unblocked", async () => {
  const text = section(await build(), "7. Next batches and capacity");
  const ranked = text.split("\n").filter((l) => /^\d+\. /.test(l));
  assert.deepEqual(ranked, [
    "1. beta | wf-import | unblocks 3 use cases: UC-004, UC-008, UC-009",
    "2. gamma | wf-search | unblocks 2 use cases: UC-006, UC-010",
    "3. alpha | wf-report | unblocks 1 use case: UC-002",
    "4. gamma | no workflow candidate | unblocks 1 use case: UC-011",
  ]);
  assert.doesNotMatch(text, /UC-001|UC-003|UC-005|UC-007/);
});

test("[B06] provisional limits are shown as provisional, the suggestions are advisory and nothing is distributed", async () => {
  const text = section(await build(), "7. Next batches and capacity");
  assert.match(text, /Advisory only: .*no distribution of use cases across vendors is suggested, no question is released and no commitment is set\./);
  assert.match(entry(text, "BT-001"), /alpha \| provisional limit: up to 5 per week \(provisional\)$/);
  assert.match(entry(text, "BT-002"), /beta \| provisional limit: 3 per week \(provisional\) \| capacity notes: review on Fridays$/);
  assert.doesNotMatch(text, /BT-003/);
});

test("[B06] a section with no unreleased use cases or limits says so", async () => {
  const data = baseExport();
  data.Batches = [];
  data["Use Cases"] = [];
  const f = await fixture(data);
  const text = section((await summarize(f.exportDir, f.out)).summary, "7. Next batches and capacity");
  assert.match(text, /### Suggested batches\nNone\./);
  assert.match(text, /### Provisional limits\nNone\./);
});

test("[B07] pending actions, source blockers, questions and cannot-answer rows with no owner or resolver are flagged unassigned", async () => {
  const text = section(await build(), "8. Unassigned");
  assert.match(entry(text, "UC-006"), /pending action \| UC-006 Search \| ask vendor$/);
  assert.match(entry(text, "AX-002"), /pending action \| UC-003 Import \| chase$/);
  assert.match(entry(text, "UC-003"), /source blocker \| UC-003 Import \| source empty$/);
  assert.match(entry(text, "QN-0010"), /question \| UC-007 Login \| no owner$/);
  assert.match(entry(text, "QN-0004"), /cannot-answer row \| UC-003 Import \| no resolver$/);
  assert.doesNotMatch(text, /UC-002|QN-0003|QN-0001/);
});

test("[B07] an unassigned awaiting-review answer is flagged and a section with none says so", async () => {
  const flagged = section(
    await build((data) => {
      data.Questions!.find((q) => q.question_ref === "QN-0006")!.our_owner = "";
    }),
    "8. Unassigned",
  );
  assert.match(entry(flagged, "QN-0006"), /question \| UC-005 Audit \| no owner$/);
  const data = baseExport();
  data["Use Cases"] = [];
  data.Questions = [];
  data["Identity & Access"] = [];
  const f = await fixture(data);
  assert.match(section((await summarize(f.exportDir, f.out)).summary, "8. Unassigned"), /^## 8. Unassigned\nNone\./);
});

test("[B03] source blockers with the same status are ordered by reference, and a blocker's vendor falls back to its own row", async () => {
  const summary = await build((data) => {
    data["Use Cases"]!.push({ use_case_ref: "UC-012", use_case_name: "Early", vendor: "alpha", stage: "draft", source_status: "not-located", source_owner: "ana" });
    data.Questions!.push(
      { question_ref: "QN-0011", use_case_ref: "UC-099", vendor: "delta", status: "released", blocks_mapping: "yes", our_owner: "lead-a", released_on: "", answer_status: "not-answered" },
      { question_ref: "QN-0012", use_case_ref: "UC-099", vendor: "", status: "clarification-requested", blocks_mapping: "yes", our_owner: "lead-a", released_on: "", answer_status: "not-answered" },
    );
    data["Identity & Access"]!.push({ access_ref: "AX-004", vendor: "delta", use_case_ref: "UC-099", request_status: "blocked" });
  });
  const text = section(summary, "4. Missing source and other blockers");
  const refs = text.split("\n").filter((l) => /^- UC-0(02|12) /.test(l));
  assert.equal(refs.length, 2, text);
  assert.match(refs[0]!, /^- UC-002 /);
  assert.match(refs[1]!, /^- UC-012 /);
  assert.match(entry(text, "QN-0011"), /^- QN-0011 \| UC-099 \| delta \| open mapping-blocking question \(released\)/);
  assert.match(entry(text, "QN-0012"), /^- QN-0012 \| UC-099 \| unknown \| open mapping-blocking question \(clarification-requested\)/);
  assert.match(entry(text, "AX-004"), /blocked access request \| owner unassigned \| vendor action owner unassigned$/);
});

test("[B05] a mapping for a use case that is not in the export shows its grouping impact as unknown", async () => {
  const text = section(
    await build((data) => {
      data.Mappings!.push({ mapping_ref: "MP-005", use_case_ref: "UC-099", workflow_candidate: "", mapping_status: "candidate" });
    }),
    "6. Mappings",
  );
  assert.match(entry(text, "MP-005"), /UC-099 \| workflow unknown \| candidate \| grouping impact unknown$/);
});

test("[B06] groups of equal size are ordered by vendor then workflow, and limits show a limit or notes alone", async () => {
  const data = baseExport();
  data["Use Cases"] = [
    { use_case_ref: "UC-001", use_case_name: "One", vendor: "beta", workflow_candidate: "wf-b" },
    { use_case_ref: "UC-002", use_case_name: "Two", vendor: "beta", workflow_candidate: "wf-a" },
    { use_case_ref: "UC-003", use_case_name: "Three", vendor: "alpha", workflow_candidate: "wf-z" },
  ];
  data.Questions = [];
  data.Batches = [
    { batch_ref: "BT-002", vendor: "beta", status: "planned", capacity_notes: "notes only" },
    { batch_ref: "BT-001", vendor: "beta", status: "planned", provisional_limits: "limit only" },
    { batch_ref: "BT-003", vendor: "beta", status: "closed", provisional_limits: "old" },
    { batch_ref: "BT-004", vendor: "beta", status: "planned" },
  ];
  const f = await fixture(data);
  const text = section((await summarize(f.exportDir, f.out)).summary, "7. Next batches and capacity");
  assert.deepEqual(
    text.split("\n").filter((l) => /^\d+\. /.test(l)),
    ["1. alpha | wf-z | unblocks 1 use case: UC-003", "2. beta | wf-a | unblocks 1 use case: UC-002", "3. beta | wf-b | unblocks 1 use case: UC-001"],
  );
  assert.deepEqual(
    text.split("\n").filter((l) => l.startsWith("- BT-")),
    ["- BT-001 | beta | provisional limit: limit only (provisional)", "- BT-002 | beta | capacity notes: notes only"],
  );
});

test("[B02] several answers awaiting lead review are listed in reference order", async () => {
  const text = section(
    await build((data) => {
      data.Questions!.push({ question_ref: "QN-0000", use_case_ref: "UC-005", vendor: "gamma", status: "released", answer_status: "answered", our_owner: "lead-c", released_on: "2026-11-12", due_on: "2026-11-16", answered_on: "2026-11-12" });
    }),
    OVERDUE,
  );
  const lines = text.split("\n").filter((l) => /^- QN-000[06] /.test(l));
  assert.equal(lines.length, 2, text);
  assert.match(lines[0]!, /^- QN-0000 .* age 4 days$/);
  assert.match(lines[1]!, /^- QN-0006 /);
});
