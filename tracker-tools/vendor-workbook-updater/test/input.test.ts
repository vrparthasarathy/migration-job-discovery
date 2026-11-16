import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { baseExport, listFiles, setup, textOf, update, type Run, type RV, DAILY, NIGHTLY, WEEKLY } from "./support.ts";

const version: RV = { tab: "Use Cases", record: "UC-001", useCase: DAILY, fields: { current_version: ["1", "2", "update"] } };

/** Runs with the given breakage and requires exit 1, the message on standard error and nothing written. */
async function stops(f: Run, message: RegExp, ...more: string[]): Promise<void> {
  const before = await listFiles(f.root);
  const contents = await Promise.all(before.filter((n) => n.endsWith(".csv") || n.endsWith(".xlsx")).map((n) => readFile(join(f.root, n)).catch(() => Buffer.alloc(0))));
  const outcome = await update(f, ...more);
  assert.equal(outcome.status, 1, outcome.stderr);
  assert.match(outcome.stderr, message);
  assert.deepEqual(await listFiles(f.root), before, "nothing was created");
  const after = await Promise.all(before.filter((n) => n.endsWith(".csv") || n.endsWith(".xlsx")).map((n) => readFile(join(f.root, n)).catch(() => Buffer.alloc(0))));
  assert.deepEqual(after.map(String), contents.map(String), "nothing was changed");
}

test("[B10] a secret-looking value in a review file stops the run naming the file and line, without echoing the value", async () => {
  const f = await setup([version, { tab: "Identity & Access", record: "AX-001", useCase: DAILY, fields: { service: ["Reports", "api_key=abcdefgh12345678", "update"] } }]);
  await stops(f, /review-identity-access\.csv: line 2: secret-looking value in "service \(proposed\)"; remove it from the file/);
  assert.doesNotMatch((await update(f)).stderr, /abcdefgh/);
});

test("[B10] a secret-looking value in the downloaded workbook or the export stops the run", async () => {
  const rows = { "Use Cases": [{ use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", vendor_contact: "token: abcdef123456" }], Questions: [], "Identity & Access": [] };
  await stops(await setup([version], rows), /downloaded\.xlsx: line 3: sheet "Use Cases": secret-looking value in "vendor_contact"/);
  const data = baseExport();
  data["Use Cases"]![0]!.notes_internal = "password: hunter2hunter2";
  await stops(await setup([version], undefined, data), /use-cases\.csv: line 2: secret-looking value in "notes_internal"/);
});

test("[B10] an invalid export, vendor, holidays file, headings file or review folder stops the run naming the file", async () => {
  const f = await setup([version]);
  await stops(f, /manifest\.csv: line 1: vendor "Zed" has no use case in the export/, "--vendor", "Zed");
  const holidays = join(f.root, "holidays.txt");
  await writeFile(holidays, "2026-11-19\nChristmas\n");
  await stops(f, /holidays\.txt: line 2: "Christmas" is not YYYY-MM-DD/, "--holidays", holidays);
  const headings = join(f.root, "headings.csv");
  await writeFile(headings, "tab,column,heading\nReview,order,order\n");
  await stops(f, /headings\.csv: line 1: missing column "band"|headings\.csv: line 1: missing required review key/, "--headings", headings);
  await stops(f, /review-use-cases\.csv: line 1: cannot read review file/, "--reviews", join(f.root, "nowhere"));
  await rm(join(f.exportDir, "manifest.csv"));
  await stops(f, /manifest\.csv: cannot read file/);
});

test("[B10] every finding is listed in one run, with the file and line of each", async () => {
  const f = await setup([version, { ...version, record: "UC-002", status: "maybe" }]);
  const outcome = await update(f, "--vendor", "Zed");
  assert.equal(outcome.status, 1);
  const lines = outcome.stderr.trim().split("\n");
  assert.ok(lines.length >= 3, outcome.stderr);
  assert.ok(lines.every((l) => /^\S.*: (line \d+: )?.+/.test(l)), outcome.stderr);
  assert.ok(lines.some((l) => /review-use-cases\.csv: line 3: review_status "maybe"/.test(l)));
});

test("[B10] the report lists what was applied, what was skipped and why, and the values left for the internal tracker, without paths", async () => {
  const f = await setup([
    version,
    { tab: "Questions", record: "QN-0001", useCase: DAILY, status: "rejected", fields: { question_text: ["Which time zone does the daily report use?", "Zone?", "update"] } },
    { tab: "Identity & Access", record: "AX-001", useCase: DAILY, fields: { next_action: ["", "Raise ticket", "add"], service: ["Reports", "Reports v2", "update"] }, other: "affected_workflow: -> payroll [add]" },
  ]);
  assert.equal((await update(f)).status, 0);
  const report = await textOf(f.report);
  assert.match(report, /^# Vendor workbook update\n\nInternal report/);
  assert.match(report, /## Applied\n\n- Use Cases, UC-001: updated[^]*current_version: "1" -> "2"[^]*- Identity & Access, AX-001: updated/);
  assert.match(report, /## Skipped\n\n- 1 x not accepted\n- Questions, QN-0001 \(review-questions\.csv line 2\): not accepted \(rejected\)/);
  assert.match(report, /## Left for the internal tracker\n\n- Identity & Access, AX-001[^]*other_changes: affected_workflow: -> payroll \[add\]/);
  assert.doesNotMatch(report, new RegExp(f.root.replaceAll("/", "\\/")));
});

test("[B9] a write that fails leaves no workbook, report or temporary file behind and exits 1", async () => {
  const f = await setup([version]);
  await writeFile(join(f.root, "blocker"), "a file, not a folder");
  const outcome = await update(f, "--report", join(f.root, "blocker", "report.md"));
  assert.equal(outcome.status, 1);
  assert.match(outcome.stderr, /ENOTDIR|not a directory/);
  const names = await listFiles(f.root);
  assert.equal(names.includes("out/updated.xlsx"), false);
  assert.equal(names.some((n) => n.endsWith(".tmp")), false);
  assert.equal(await readFile(`${f.reviews}/review-use-cases.csv`, "utf8").then((t) => t.includes("2026-11-20")), false);
});

test("[B10] a vendor columns file that does not fit the schema stops the run naming that file", async () => {
  const f = await setup([version]);
  const columns = join(f.root, "columns.csv");
  await writeFile(columns, "tab,column,heading,band,visibility\nUse Cases,stage,Stage,Progress,V\n");
  await stops(f, /columns\.csv: line 2: "stage" is not a vendor column of tab "Use Cases" in the schema/, "--columns", columns);
});
