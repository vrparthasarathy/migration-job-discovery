import assert from "node:assert/strict";
import { copyFile, readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { test } from "node:test";
import { ok, RELEASE, setup, sheetRows, textOf, update, type RV } from "./support.ts";

const rvs: RV[] = [
  { tab: "Use Cases", record: "UC-001", useCase: "Daily Report", fields: { current_version: ["1", "2", "update"] } },
  { tab: "Questions", key: "Daily Report/Q9@v2", ref: "QN-0005", useCase: "Daily Report", fields: { question_text: ["", "Which retention applies?", "add"] } },
  { tab: "Identity & Access", key: "Daily Report/prod", ref: "AX-002", useCase: "Daily Report", fields: { service: ["", "Reports", "add"] } },
];

test("[B3] the same inputs and run date give a byte-identical workbook and report, even when the clock has moved on", async () => {
  const f = await setup(rvs);
  await ok(f, ...RELEASE);
  const first = { book: await readFile(f.out), report: await textOf(f.report) };
  const again = await setup(rvs);
  await copyFile(f.workbook, again.workbook);
  await sleep(2100);
  await ok(again, ...RELEASE);
  assert.ok(first.book.equals(await readFile(again.out)), "workbook bytes");
  assert.equal(await textOf(again.report), first.report);
});

test("[B3] a row with applied_on and an unchanged digest is skipped and the rebuilt workbook has the same rows", async () => {
  const f = await setup(rvs);
  await ok(f, ...RELEASE);
  const first = await readFile(f.out);
  // The lead uploads the output; the next download is that file, and the review files now carry applied_on.
  const next = { ...f, workbook: f.out, out: `${f.root}/next/updated.xlsx`, report: `${f.root}/next/report.md` };
  await ok(next, ...RELEASE);
  assert.ok(first.equals(await readFile(next.out)), "nothing new, so the same workbook");
  assert.match(await textOf(next.report), /3 x already applied/);
  assert.equal((await sheetRows(next.out, "Questions")).length, 2);
  assert.equal((await sheetRows(next.out, "Identity & Access")).length, 2);
});

test("[B3] unmarked review rows run again on the uploaded file stop on the reference collision instead of adding duplicates", async () => {
  const f = await setup(rvs);
  await ok(f, ...RELEASE);
  const again = await setup(rvs);
  const outcome = await update({ ...again, workbook: f.out }, ...RELEASE);
  assert.equal(outcome.status, 1);
  assert.match(outcome.stderr, /reference QN-0005 already exists/);
});
