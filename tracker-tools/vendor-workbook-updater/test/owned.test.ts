import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { columnsPath, headingsPath, ok, RELEASE, setup, sheetRows, textOf, world, DAILY, NIGHTLY, WEEKLY } from "./support.ts";

/** A headings file that also shows the vendor-owned, forbidden and computed columns, so review rows can try to set them. */
async function widened(extra: string[], columns?: string): Promise<{ headings: string; world: Awaited<ReturnType<typeof world>>; columns: string }> {
  const dir = await mkdtemp(join(tmpdir(), "vendor-updater-headings-"));
  const headings = join(dir, "review-headings.csv");
  await writeFile(headings, (await readFile(headingsPath, "utf8")) + extra.map((c) => `${c},${c.split(",")[1]},,\n`).join(""));
  const cols = join(dir, "headings.csv");
  await writeFile(cols, columns ?? (await readFile(columnsPath, "utf8")));
  return { headings, world: await world(headings, cols), columns: cols };
}

const EXTRA = ["Questions,answer", "Questions,answer_status", "Questions,released_on", "Questions,due_on", "Questions,batch_ref", "Use Cases,acknowledged_version", "Identity & Access,vendor_action_owner", "Identity & Access,additional_requirements"];

test("[B6] vendor answers, acknowledgements, vendor-side access fields and the release and due dates of an existing row never change", async () => {
  const w = await widened(EXTRA);
  const f = await setup(
    [
      { tab: "Questions", record: "QN-0001", useCase: DAILY, fields: { question_text: ["Which time zone does the daily report use?", "Which zone?", "update"], answer: ["UTC plus two per the SLA", "overwritten", "update"], answer_status: ["answered", "not-answered", "update"], released_on: ["2026-11-12", "2026-12-01", "update"], due_on: ["2026-11-16", "2026-12-03", "update"], batch_ref: ["BT-001", "BT-009", "update"] } },
      { tab: "Use Cases", record: "UC-001", useCase: DAILY, fields: { current_version: ["1", "3", "update"], acknowledged_version: ["1", "3", "update"] } },
      { tab: "Identity & Access", record: "AX-001", useCase: DAILY, fields: { vendor_action_owner: ["", "Mia", "add"], additional_requirements: ["", "VPN", "add"], service: ["Reports", "Reports v2", "update"] } },
    ],
    undefined,
    undefined,
    w.world,
  );
  await ok(f, "--headings", w.headings);
  const [q] = await sheetRows(f.out, "Questions");
  assert.deepEqual({ text: q!.Question, answer: q!.Answer, status: q!["Answer status"], released: q!["Released on"], due: q!["Due on"], batch: q!.Batch }, { text: "Which zone?", answer: "UTC plus two per the SLA", status: "answered", released: "2026-11-12", due: "2026-11-16", batch: "BT-001" });
  const [uc] = await sheetRows(f.out, "Use Cases");
  assert.deepEqual({ version: uc!["Current version"], ack: uc!["Acknowledged version"], on: uc!["Acknowledged on"], ref: uc!["Acknowledgement reference"] }, { version: "3", ack: "1", on: "2026-11-05", ref: "ACK-77" });
  const [ax] = await sheetRows(f.out, "Identity & Access");
  assert.deepEqual({ owner: ax!["Vendor action owner"], more: ax!["Additional requirements"], service: ax!.Service }, { owner: "", more: "", service: "Reports v2" });
  const report = await textOf(f.report);
  for (const field of ["answer (vendor-owned)", "answer_status (vendor-owned)", "released_on (set by a release only)", "due_on (set by a release only)", "batch_ref (forbidden column)", "acknowledged_version (vendor-owned)", "vendor_action_owner (vendor-owned)", "additional_requirements (vendor-owned)"]) {
    assert.ok(report.includes(field), field);
  }
});

test("[B6] a new question takes its dates from the release alone and starts unanswered whatever the review row proposes", async () => {
  const w = await widened(EXTRA);
  const f = await setup(
    [{ tab: "Questions", key: `${DAILY}/Q9@v2`, ref: "QN-0005", useCase: DAILY, fields: { question_text: ["", "New?", "add"], answer: ["", "preset", "add"], answer_status: ["", "answered", "add"], released_on: ["", "2020-01-01", "add"], due_on: ["", "2020-01-03", "add"] } }],
    undefined,
    undefined,
    w.world,
  );
  await ok(f, "--headings", w.headings, ...RELEASE);
  const added = (await sheetRows(f.out, "Questions"))[1]!;
  assert.deepEqual({ answer: added.Answer, status: added["Answer status"], released: added["Released on"], due: added["Due on"] }, { answer: "", status: "not-answered", released: "2026-11-18", due: "2026-11-20" });
});

test("[B6] a field that is not a column of the vendor workbook is listed and not applied", async () => {
  const lines = (await readFile(columnsPath, "utf8")).split("\n").filter((l) => !l.startsWith("Use Cases,spec_link,"));
  const w = await widened([], lines.join("\n"));
  const f = await setup([{ tab: "Use Cases", record: "UC-001", useCase: DAILY, fields: { spec_link: ["https://specs.example/daily", "https://specs.example/v2", "update"], current_version: ["1", "2", "update"] } }], undefined, undefined, w.world);
  await ok(f, "--columns", w.columns);
  assert.match(await textOf(f.report), /spec_link \(not a column of the vendor workbook\)/);
  assert.equal((await sheetRows(f.out, "Use Cases"))[0]!["Current version"], "2");
});

test("[B6] a new use case from headings that do not show the vendor is skipped, since its vendor cannot be known", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vendor-updater-headings-"));
  const headings = join(dir, "review-headings.csv");
  await writeFile(headings, (await readFile(headingsPath, "utf8")).split("\n").filter((l) => !l.startsWith("Use Cases,vendor,")).join("\n"));
  const f = await setup([{ tab: "Use Cases", key: `${WEEKLY}`, ref: "UC-004", useCase: WEEKLY, fields: { current_version: ["", "1", "add"] } }], undefined, undefined, await world(headings));
  await ok(f, "--headings", headings);
  assert.match(await textOf(f.report), /the new use case names no vendor/);
  assert.equal((await sheetRows(f.out, "Use Cases")).length, 1);
});
