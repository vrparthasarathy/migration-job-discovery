import assert from "node:assert/strict";
import { test } from "node:test";
import { acmeRows, ok, rowsOf, setup, sheetRows, textOf, type RV } from "./support.ts";

const version = (extra: Partial<RV> = {}): RV => ({ tab: "Use Cases", record: "UC-001", useCase: "Daily Report", fields: { current_version: ["1", "2", "update"] }, ...extra });
const contact = (): RV => ({ tab: "Identity & Access", record: "AX-001", useCase: "Daily Report", fields: { service: ["Reports", "Reports v2", "update"] } });

async function expectConflict(rv: RV, reason: RegExp): Promise<void> {
  const f = await setup([rv, contact()]);
  await ok(f);
  assert.equal((await sheetRows(f.out, "Use Cases"))[0]!["Current version"], "1");
  assert.equal((await sheetRows(f.out, "Identity & Access"))[0]!.Service, "Reports v2", "the other row still applies");
  assert.equal((await rowsOf(`${f.reviews}/review-use-cases.csv`))[0]!.applied_on, rv.appliedOn ?? "");
  assert.match(await textOf(f.report), new RegExp(`## Conflicts\\n\\n- Use Cases, UC-001 .*${reason.source}`));
}

test("[B7] a current value that differs from the workbook's is a conflict and the whole row is left alone", async () => {
  const rows = acmeRows();
  rows["Use Cases"]![0]!.current_version = "1.5";
  const f = await setup([version({ fields: { current_version: ["1", "2", "update"], spec_link: ["", "https://specs.example/v2", "add"] } })], rows);
  await ok(f);
  const [uc] = await sheetRows(f.out, "Use Cases");
  assert.deepEqual({ version: uc!["Current version"], link: uc!.Specification }, { version: "1.5", link: "https://specs.example/daily" });
  assert.match(await textOf(f.report), /current_version: the workbook holds "1.5", the review row expects "1"/);
});

test("[B7] a current value that differs only in line endings and spaces is not a conflict", async () => {
  const rows = acmeRows();
  rows["Use Cases"]![0]!.spec_link = "Ann\nLee";
  const f = await setup([version({ fields: { spec_link: ["Ann\r\nLee ", "https://specs.example/v2", "update"] } })], rows);
  await ok(f);
  assert.equal((await sheetRows(f.out, "Use Cases"))[0]!.Specification, "https://specs.example/v2");
});

test("[B7] a row changed since review is a conflict", () => expectConflict(version({ changed: "yes" }), /changed since review/));
test("[B7] a held field is a conflict", () => expectConflict(version({ fields: { current_version: ["1", "2", "held"] } }), /current_version is held/));
test("[B7] a conflicting field is a conflict", () => expectConflict(version({ fields: { current_version: ["1", "2", "conflict"] } }), /current_version is conflict/));
test("[B7] a row with a conflict cell is a conflict", () => expectConflict(version({ conflict: "base-mismatch: spec moved" }), /conflict: base-mismatch: spec moved/));
test("[B7] a row whose digest does not match its content is a conflict", () => expectConflict(version({ digest: "0".repeat(64) }), /the content digest does not match/));
test("[B7] an applied row that changed since is a conflict, not a skip", () => expectConflict(version({ appliedOn: "2026-11-01", changed: "yes" }), /changed since it was applied on 2026-11-01/));
