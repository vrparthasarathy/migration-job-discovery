import assert from "node:assert/strict";
import { test } from "node:test";
import { getTab } from "../../tracker-tables/src/schema.ts";
import { valueProblem } from "../src/apply.ts";
import { acmeRows, listFiles, ok, rowsOf, setup, sheetRows, update, world, type RV, DAILY, NIGHTLY, WEEKLY } from "./support.ts";

const access = (ref: string, key = `${DAILY}/reports/prod`, extra: Partial<RV> = {}): RV => ({ tab: "Identity & Access", key, ref, useCase: DAILY, fields: { service: ["", "Reports", "add"], environment: ["", "test", "add"] }, ...extra });

test("[B8] a new record takes the exporter's suggested reference", async () => {
  const f = await setup([access("AX-002"), { tab: "Use Cases", key: WEEKLY, ref: "UC-004", useCase: WEEKLY, fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "Weekly Digest", "add"] } }]);
  await ok(f);
  assert.equal((await sheetRows(f.out, "Identity & Access"))[1]!["Access ref"], "AX-002");
  assert.equal((await sheetRows(f.out, "Use Cases"))[1]!["Use case ref"], "UC-004");
});

async function stops(rvs: RV[], message: RegExp, rows = acmeRows()): Promise<void> {
  const f = await setup(rvs, rows);
  const before = await listFiles(f.root);
  const outcome = await update(f);
  assert.equal(outcome.status, 1);
  assert.match(outcome.stderr, message);
  assert.deepEqual(await listFiles(f.root), before, "nothing was written");
  assert.equal((await rowsOf(`${f.reviews}/review-identity-access.csv`)).every((r) => r.applied_on === ""), true);
}

test("[B8] a reference that exists in the export stops the run naming the file and line", () => stops([access("AX-001")], /review-identity-access\.csv: line 2: reference AX-001 already exists/));
test("[B8] a reference that exists in the workbook only stops the run", () => {
  const rows = acmeRows();
  rows["Identity & Access"]!.push({ access_ref: "AX-777", vendor: "Acme", use_case_ref: "UC-001" });
  return stops([access("AX-777")], /reference AX-777 already exists/, rows);
});
test("[B8] a reference used twice in one run stops the run", () => stops([access("AX-002"), access("AX-002", `${DAILY}/reports/test`)], /line 3: reference AX-002 already exists/));
test("[B8] a blank or malformed suggested reference stops the run", () => stops([access(""), access("ax2", `${DAILY}/reports/other`)], /line 2: suggested_ref "" is not a reference[^]*line 3: suggested_ref "ax2"/));

test("[B8] a value outside the schema's list stops the run", async () => {
  await stops([access("AX-002", "k", { fields: { auth_type: ["", "magic", "add"] } })], /line 2: auth_type "magic" is not one of website-sign-in, api-credential, other, unknown/);
});

test("[B8] value checks cover lists, dates and references and let an allowed value through", async () => {
  const { schema } = await world();
  const column = (tab: string, name: string) => getTab(schema, tab).columns.find((c) => c.column === name)!;
  assert.equal(valueProblem(column("Identity & Access", "auth_type"), "other"), undefined);
  assert.equal(valueProblem(column("Identity & Access", "auth_type"), ""), undefined);
  assert.match(valueProblem(column("Identity & Access", "raised_on"), "May")!, /not a date/);
  assert.equal(valueProblem(column("Identity & Access", "raised_on"), "2026-11-02"), undefined);
  assert.equal(valueProblem(column("Identity & Access", "expected_availability"), "unknown"), undefined);
  assert.match(valueProblem(column("Questions", "use_case_ref"), "uc1")!, /not a reference/);
  assert.equal(valueProblem(column("Questions", "question_text"), "anything"), undefined);
});
