import assert from "node:assert/strict";
import { test } from "node:test";
import type { Row } from "../../tracker-tables/src/csv.ts";
import { baseExport, download, listFiles, ok, reviews, setup, textOf, vendorRows, type RVP, DAILY, NIGHTLY, INVOICE } from "./support.ts";

const RVS: RVP[] = [
  { tab: "Use Cases", record: "UC-001", useCase: DAILY, proposals: "TP-1", fields: { stage: ["sent", "review", "update"] } },
  { tab: "Use Cases", record: "UC-002", useCase: NIGHTLY, status: "rejected", fields: { stage: ["sent", "review", "update"] } },
  { tab: "Use Cases", record: "UC-003", useCase: INVOICE, changed: "yes", fields: { stage: ["review", "sent", "update"] } },
  { tab: "Questions", ref: "QN-0005", key: `${DAILY}/Q9`, useCase: DAILY, fields: { question_text: ["", "Which currency?", "add"] }, other: "answer:  -> forced [add]" },
  { tab: "Questions", record: "QN-0003", useCase: NIGHTLY, appliedOn: "2026-11-18", fields: { our_owner: ["Bob", "Rae", "update"] } },
  { tab: "Identity & Access", record: "AX-001", useCase: DAILY, status: "", fields: { next_action: ["", "Chase", "update"] } },
  { tab: "Mappings", record: "MP-001", useCase: DAILY, fields: { mapping_status: ["accepted", "re-review-suggested", "update"] } },
];

test("[B10] the report accounts for every review row, vendor value, held workbook, added row and file written, with no path or secret", async () => {
  const data = baseExport();
  const env = await setup(data);
  const rows = vendorRows("Acme");
  rows.Questions![0] = { ...rows.Questions![0]!, answer: "Vendor changed it", answered_by: "Acme Eve" } as Row;
  rows["Identity & Access"] = [];
  rows["Use Cases"]!.push({ use_case_ref: "UC-777", use_case_name: "Typed by the vendor", vendor: "Acme" });
  const acme = await download(env, "acme.xlsx", "Acme", rows);
  const beta = await download(env, "beta.xlsx", "Beta", vendorRows("Beta"));
  await reviews(env, RVS);
  await ok(env, "--reviews", env.reviews, "--vendor", `Acme=${acme}`, "--vendor", `Beta=${beta}`, "--vendor-out", env.vendorOut);

  const report = await textOf(env.report);
  assert.match(report, /Review rows: 7 = 3 applied \+ 3 skipped \+ 1 conflicts/);
  for (const row of ["UC-001", "UC-002", "UC-003", "QN-0005", "QN-0003", "AX-001", "MP-001"]) assert.match(report, new RegExp(`${row === "QN-0005" ? `${DAILY}/Q9` : row}`), row);
  assert.match(report, /## Vendor values synced\n\n- Acme: Questions, QN-0001, answer: "UTC plus two per the SLA" -> "Vendor changed it" \(differs from the master, copied\)/);
  assert.match(report, /answered_by: "Acme Bob" -> "Acme Eve"/);
  assert.match(report, /- Acme: workbook held, not rebuilt\n  - Use Cases, UC-777/);
  assert.match(report, /## Master rows added to a vendor workbook\n\nNone\./);
  assert.doesNotMatch(report, new RegExp(env.root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(report, /\/var\/|\/tmp\/|\/Users\//);

  const written = (await listFiles(env.root)).filter((f) => f.startsWith("out") && f.includes("."));
  const listed = report.split("## Files written\n\n")[1]!.trim().split("\n").map((l) => l.replace("- ", ""));
  assert.equal(written.length, 3);
  for (const file of written) assert.ok(listed.includes(file.split("/").pop()!), `${file} is listed`);
  assert.ok(listed.includes("review-use-cases.csv") && listed.includes("review-questions.csv"));
  assert.equal(listed.includes("Acme.xlsx"), false);
  assert.ok(listed.includes("Beta.xlsx"));
});
