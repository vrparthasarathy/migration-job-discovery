import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { baseExport, cli, ok, RELEASE, rowsOf, setup, sheetRows, textOf, update, type RV, DAILY, NIGHTLY, WEEKLY } from "./support.ts";

const question = (extra: Partial<RV> = {}): RV => ({ tab: "Questions", key: `${DAILY}/Q9@v2`, ref: "QN-0005", useCase: DAILY, fields: { question_text: ["", "Which retention applies?", "add"], spec_refs: ["", `${DAILY}/Q9@v2`, "add"] }, ...extra });

test("[B5] a new question on a named release is added with its release, batch and due date", async () => {
  const f = await setup([question()]);
  await ok(f, ...RELEASE);
  const rows = await sheetRows(f.out, "Questions");
  assert.equal(rows.length, 2);
  assert.deepEqual(
    { ref: rows[1]!["Question ref"], uc: rows[1]!["Use case ref"], name: rows[1]!["Use case"], vendor: rows[1]!.Vendor, text: rows[1]!.Question, batch: rows[1]!.Batch, released: rows[1]!["Released on"], due: rows[1]!["Due on"], status: rows[1]!["Answer status"], answer: rows[1]!.Answer },
    { ref: "QN-0005", uc: "UC-001", name: "Daily Report", vendor: "Acme", text: "Which retention applies?", batch: "BT-009", released: "2026-11-18", due: "2026-11-20", status: "not-answered", answer: "" },
  );
  assert.equal((await rowsOf(`${f.reviews}/review-questions.csv`))[0]!.applied_on, "2026-11-20");
});

test("[B5] the due date skips the holidays of the holidays file", async () => {
  const f = await setup([question()]);
  const holidays = join(f.root, "holidays.txt");
  await writeFile(holidays, "2026-11-19\n\n");
  await ok(f, ...RELEASE, "--holidays", holidays);
  assert.equal((await sheetRows(f.out, "Questions"))[1]!["Due on"], "2026-11-23");
});

test("[B5] without a release a new question stays pending and is listed, while a new access row is still added", async () => {
  const f = await setup([question(), { tab: "Identity & Access", key: `${DAILY}/reports/prod`, ref: "AX-002", useCase: DAILY, fields: { service: ["", "Reports", "add"], environment: ["", "test", "add"], auth_type: ["", "api-credential", "add"] } }]);
  await ok(f);
  assert.equal((await sheetRows(f.out, "Questions")).length, 1);
  const access = await sheetRows(f.out, "Identity & Access");
  assert.deepEqual({ ref: access[1]!["Access ref"], uc: access[1]!["Use case ref"], vendor: access[1]!.Vendor, auth: access[1]!["Auth type"] }, { ref: "AX-002", uc: "UC-001", vendor: "Acme", auth: "api-credential" });
  assert.match(await textOf(f.report), /## Pending question releases\n\n- Questions, uc-acme-daily-report\/Q9@v2 .*no release named/);
  assert.equal((await rowsOf(`${f.reviews}/review-questions.csv`))[0]!.applied_on, "");
});

test("[B5] a new question for a use case added in the same run is added with that use case's reference", async () => {
  const f = await setup([
    { tab: "Use Cases", key: WEEKLY, ref: "UC-004", useCase: WEEKLY, fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "Weekly Digest", "add"], current_version: ["", "1", "add"] } },
    question({ ref: "QN-0006", useCase: WEEKLY, key: `${WEEKLY}/Q1@v1` }),
  ]);
  await ok(f, ...RELEASE);
  const [uc] = (await sheetRows(f.out, "Use Cases")).slice(1);
  assert.deepEqual({ ref: uc!["Use case ref"], name: uc!["Use case"], vendor: uc!.Vendor }, { ref: "UC-004", name: "Weekly Digest", vendor: "Acme" });
  const added = (await sheetRows(f.out, "Questions"))[1]!;
  assert.deepEqual({ ref: added["Question ref"], uc: added["Use case ref"] }, { ref: "QN-0006", uc: "UC-004" });
});

test("[B5] a release batch of another vendor, with another date, or half given is refused", async () => {
  const f = await setup([question()]);
  const other = await update(f, "--release-batch", "BT-002", "--release-date", "2026-11-12");
  assert.equal(other.status, 1);
  assert.match(other.stderr, /batches\.csv: batch BT-002 belongs to "Beta", not "Acme"/);
  const date = await update(f, "--release-batch", "BT-001", "--release-date", "2026-11-18");
  assert.equal(date.status, 1);
  assert.match(date.stderr, /batch BT-001 was released on 2026-11-12, not 2026-11-18/);
  assert.equal((await update(f, "--release-batch", "BT-001")).status, 2);
  assert.equal((await update(f, "--release-batch", "bt1", "--release-date", "2026-11-18")).status, 2);
  assert.equal((await update(f, "--release-batch", "BT-001", "--release-date", "soon")).status, 2);
  const data = baseExport();
  data.Batches = data.Batches!.map((b) => (b.batch_ref === "BT-001" ? { ...b, released_on: "" } : b));
  const open = await setup([question()], undefined, data);
  await ok(open, ...RELEASE);
  assert.equal((await sheetRows(open.out, "Questions")).length, 2);
  assert.equal((await cli()).status, 2);
});
