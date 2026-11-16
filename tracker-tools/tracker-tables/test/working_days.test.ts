import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addWorkingDays, dueOn, isIsoDate, isOverdue, readHolidays } from "../src/working_days.ts";

const dirs: string[] = [];
after(async () => {
  for (const dir of dirs) await rm(dir, { recursive: true, force: true });
});

// 2026-11-16 is a Monday.
test("[B07] two working days are added to a weekday release", () => {
  assert.equal(addWorkingDays("2026-11-16", 2), "2026-11-18");
  assert.equal(dueOn("2026-11-16"), "2026-11-18");
});

test("[B07] weekends are skipped", () => {
  assert.equal(addWorkingDays("2026-11-13", 2), "2026-11-17");
  assert.equal(addWorkingDays("2026-11-12", 2), "2026-11-16");
});

test("[B07] a release on a weekend is day 0 and the next weekdays count", () => {
  assert.equal(addWorkingDays("2026-11-14", 2), "2026-11-17");
});

test("[B07] zero working days returns the release day", () => {
  assert.equal(addWorkingDays("2026-11-16", 0), "2026-11-16");
});

test("[B07] listed holidays are skipped", () => {
  assert.equal(addWorkingDays("2026-11-13", 2, ["2026-11-16"]), "2026-11-18");
  assert.equal(dueOn("2026-11-13", ["2026-11-16", "2026-11-17"]), "2026-11-19");
  assert.equal(addWorkingDays("2026-11-16", 2, ["2026-11-14"]), "2026-11-18");
});

test("[B09] an invalid date, holiday or day count is an error", () => {
  assert.throws(() => addWorkingDays("16/11/2026", 2), /date.*YYYY-MM-DD/);
  assert.throws(() => addWorkingDays("2026-11-16", 2, ["tomorrow"]), /holiday.*YYYY-MM-DD/);
  assert.throws(() => addWorkingDays("2026-11-16", -1), /whole number/);
  assert.throws(() => addWorkingDays("2026-11-16", 1.5), /whole number/);
  assert.throws(() => isOverdue("today", "2026-11-18", "not-answered", "released"), /today.*YYYY-MM-DD/);
  assert.throws(() => isOverdue("2026-11-19", "soon", "not-answered", "released"), /due_on.*YYYY-MM-DD/);
});

test("[B09] isIsoDate accepts only real YYYY-MM-DD dates", () => {
  assert.equal(isIsoDate("2026-11-16"), true);
  assert.equal(isIsoDate("2028-02-29"), true);
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isIsoDate("2026-13-01"), false);
  assert.equal(isIsoDate("2026-1-1"), false);
  assert.equal(isIsoDate(""), false);
});

test("[B07] a question is not overdue on or before due_on and overdue from day three", () => {
  assert.equal(isOverdue("2026-11-17", "2026-11-18", "not-answered", "released"), false);
  assert.equal(isOverdue("2026-11-18", "2026-11-18", "not-answered", "released"), false);
  assert.equal(isOverdue("2026-11-19", "2026-11-18", "not-answered", "released"), true);
});

test("[B07] open rows with not-answered, partially-answered, cannot-answer or no answer status stay overdue", () => {
  for (const answer of ["not-answered", "partially-answered", "cannot-answer", ""]) {
    assert.equal(isOverdue("2026-12-31", "2026-11-18", answer, "released"), true, answer);
    assert.equal(isOverdue("2026-12-31", "2026-11-18", answer, "clarification-requested"), true, answer);
  }
});

test("[B07] a complete answer awaiting lead review is not vendor-overdue", () => {
  assert.equal(isOverdue("2026-12-31", "2026-11-18", "answered", "released"), false);
});

test("[B07] a clarification request keeps an answered row overdue from its original due date", () => {
  assert.equal(isOverdue("2026-11-19", "2026-11-18", "answered", "clarification-requested"), true);
  assert.equal(isOverdue("2026-11-18", "2026-11-18", "answered", "clarification-requested"), false);
});

test("[B07] a resolved or not yet released row is not overdue", () => {
  for (const status of ["captured", "accepted", "incorporated", "closed", "withdrawn", "superseded"]) {
    assert.equal(isOverdue("2026-12-31", "2026-11-18", "not-answered", status), false, status);
  }
  assert.equal(isOverdue("2026-12-31", "", "not-answered", "released"), false);
});

test("[B07] the due date depends only on the release day, so a response never moves it", () => {
  const due = dueOn("2026-11-16");
  const answers = ["not-answered", "partially-answered", "cannot-answer", "answered"];
  assert.deepEqual(answers.map(() => dueOn("2026-11-16")), [due, due, due, due]);
  assert.equal(isOverdue("2026-11-19", due, "partially-answered", "released"), true);
});

test("[B07] a holidays file lists one date per line and ignores blank lines", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tracker-tables-days-"));
  dirs.push(dir);
  const path = join(dir, "holidays.txt");
  await writeFile(path, "2026-11-16\r\n\r\n 2026-12-25 \n", "utf8");
  const holidays = await readHolidays(path);
  assert.deepEqual(holidays, ["2026-11-16", "2026-12-25"]);
  assert.equal(addWorkingDays("2026-11-13", 2, holidays), "2026-11-18");
});

test("[B09] a bad line in a holidays file is an error naming the file and line", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tracker-tables-days-"));
  dirs.push(dir);
  const path = join(dir, "holidays.txt");
  await writeFile(path, "2026-11-16\nChristmas\n", "utf8");
  await assert.rejects(() => readHolidays(path), /holidays\.txt.*line 2.*YYYY-MM-DD/);
});
